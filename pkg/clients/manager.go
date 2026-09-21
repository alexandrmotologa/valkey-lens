package clients

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
)

// ClientInfo represents a connected client parsed from CLIENT LIST.
type ClientInfo struct {
	ID        int64     `json:"id"`
	Addr      string    `json:"addr"`
	Name      string    `json:"name"`
	Age       int64     `json:"age_sec"`
	Idle      int64     `json:"idle_sec"`
	Flags     string    `json:"flags"`
	DB        int       `json:"db"`
	Cmd       string    `json:"cmd"`
	OMem      int64     `json:"omem_bytes"` // Output buffer memory
	TotMem    int64     `json:"tot_mem_bytes"`
	User      string    `json:"user"`
	Connected time.Time `json:"connected_at"`
}

// Manager handles client list queries and safe client termination.
type Manager struct {
	client client.Client
}

// NewManager creates a new client connection manager.
func NewManager(c client.Client) *Manager {
	return &Manager{client: c}
}

// ListClients fetches and parses all connected clients.
func (m *Manager) ListClients(ctx context.Context) ([]ClientInfo, error) {
	resp, err := m.client.Do(ctx, "CLIENT", "LIST")
	if err != nil {
		return nil, fmt.Errorf("failed to fetch client list: %w", err)
	}

	raw, ok := resp.(string)
	if !ok {
		return nil, fmt.Errorf("unexpected client list response type: %T", resp)
	}

	return ParseClientList(raw), nil
}

// KillClient terminates a client connection by ID or address.
func (m *Manager) KillClient(ctx context.Context, target string, byID bool) error {
	if byID {
		_, err := m.client.Do(ctx, "CLIENT", "KILL", "ID", target)
		return err
	}
	_, err := m.client.Do(ctx, "CLIENT", "KILL", "ADDR", target)
	return err
}

// ParseClientList parses standard Redis/Valkey CLIENT LIST text output.
func ParseClientList(raw string) []ClientInfo {
	lines := strings.Split(strings.TrimSpace(raw), "\n")
	var result []ClientInfo
	now := time.Now()

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		info := ClientInfo{Connected: now}
		fields := strings.Fields(line)

		for _, f := range fields {
			parts := strings.SplitN(f, "=", 2)
			if len(parts) != 2 {
				continue
			}
			k, v := parts[0], parts[1]

			switch k {
			case "id":
				info.ID, _ = strconv.ParseInt(v, 10, 64)
			case "addr":
				info.Addr = v
			case "name":
				info.Name = v
			case "age":
				info.Age, _ = strconv.ParseInt(v, 10, 64)
				info.Connected = now.Add(-time.Duration(info.Age) * time.Second)
			case "idle":
				info.Idle, _ = strconv.ParseInt(v, 10, 64)
			case "flags":
				info.Flags = v
			case "db":
				info.DB, _ = strconv.Atoi(v)
			case "cmd":
				info.Cmd = v
			case "omem":
				info.OMem, _ = strconv.ParseInt(v, 10, 64)
			case "tot-mem":
				info.TotMem, _ = strconv.ParseInt(v, 10, 64)
			case "user":
				info.User = v
			}
		}

		result = append(result, info)
	}

	return result
}
