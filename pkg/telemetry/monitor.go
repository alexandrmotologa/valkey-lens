package telemetry

import (
	"bufio"
	"context"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
)

// Monitor collects real-time statistics from the database.
type Monitor struct {
	client     client.Client
	mu         sync.RWMutex
	history    []MetricPoint
	maxHistory int
	lastServer ServerInfo
	lastPoint  MetricPoint
	running    bool
	stopChan   chan struct{}
}

// NewMonitor initializes a telemetry monitor.
func NewMonitor(cli client.Client) *Monitor {
	return &Monitor{
		client:     cli,
		history:    make([]MetricPoint, 0, 300),
		maxHistory: 300,
		stopChan:   make(chan struct{}),
	}
}

// Start initiates the 1Hz telemetry polling loop.
func (m *Monitor) Start(ctx context.Context) {
	m.mu.Lock()
	if m.running {
		m.mu.Unlock()
		return
	}
	m.running = true
	m.mu.Unlock()

	// Immediate poll
	m.poll(ctx)

	go func() {
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-m.stopChan:
				return
			case <-ticker.C:
				m.poll(ctx)
			}
		}
	}()
}

// Stop terminates the polling loop.
func (m *Monitor) Stop() {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.running {
		close(m.stopChan)
		m.running = false
	}
}

// GetSnapshot returns the current metrics and history.
func (m *Monitor) GetSnapshot() TelemetrySnapshot {
	m.mu.RLock()
	defer m.mu.RUnlock()

	histCopy := make([]MetricPoint, len(m.history))
	copy(histCopy, m.history)

	return TelemetrySnapshot{
		Server:  m.lastServer,
		Current: m.lastPoint,
		History: histCopy,
	}
}

func (m *Monitor) poll(ctx context.Context) {
	infoStr, err := m.client.Info(ctx, "")
	if err != nil {
		return
	}

	server, point := parseInfo(infoStr)

	m.mu.Lock()
	defer m.mu.Unlock()

	m.lastServer = server
	m.lastPoint = point

	if len(m.history) >= m.maxHistory {
		m.history = m.history[1:]
	}
	m.history = append(m.history, point)
}

func parseInfo(raw string) (ServerInfo, MetricPoint) {
	server := ServerInfo{}
	point := MetricPoint{
		Timestamp: time.Now().Unix(),
	}

	var hits, misses int64
	var totalKeys int64

	scanner := bufio.NewScanner(strings.NewReader(raw))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])

		switch key {
		case "valkey_version":
			server.Version = val
			server.IsValkey = true
		case "redis_version":
			if server.Version == "" {
				server.Version = val
			}
		case "valkey_mode", "redis_mode":
			server.Mode = val
		case "os":
			server.OS = val
		case "uptime_in_seconds":
			u, _ := strconv.ParseInt(val, 10, 64)
			server.UptimeSec = u
		case "used_memory":
			mem, _ := strconv.ParseInt(val, 10, 64)
			point.UsedMemoryBytes = mem
		case "used_memory_human":
			server.UsedMemoryHuman = val
		case "used_memory_rss":
			rss, _ := strconv.ParseInt(val, 10, 64)
			point.UsedMemoryRSS = rss
		case "used_memory_rss_human":
			server.UsedMemoryRSSHuman = val
		case "mem_fragmentation_ratio":
			frag, _ := strconv.ParseFloat(val, 64)
			server.MemFragRatio = frag
		case "instantaneous_ops_per_sec":
			ops, _ := strconv.ParseInt(val, 10, 64)
			point.OpsPerSec = ops
		case "connected_clients":
			clients, _ := strconv.ParseInt(val, 10, 64)
			point.ConnectedClients = clients
		case "io_threads_active":
			ioTh, _ := strconv.Atoi(val)
			point.IOThreadsActive = ioTh
		case "keyspace_hits":
			hits, _ = strconv.ParseInt(val, 10, 64)
		case "keyspace_misses":
			misses, _ = strconv.ParseInt(val, 10, 64)
		case "used_cpu_user":
			cpu, _ := strconv.ParseFloat(val, 64)
			point.CPUUsage = cpu
		default:
			if strings.HasPrefix(key, "db") {
				// Parse db0:keys=142,expires=...
				subparts := strings.Split(val, ",")
				for _, sp := range subparts {
					kv := strings.Split(sp, "=")
					if len(kv) == 2 && kv[0] == "keys" {
						kCnt, _ := strconv.ParseInt(kv[1], 10, 64)
						totalKeys += kCnt
					}
				}
			}
		}
	}

	server.TotalKeys = totalKeys
	if hits+misses > 0 {
		point.HitRatio = (float64(hits) / float64(hits+misses)) * 100.0
	} else {
		point.HitRatio = 100.0
	}

	return server, point
}
