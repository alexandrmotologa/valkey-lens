package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"sync"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
	"github.com/alexandrmotologa/valkey-lens/server/middleware"
)

// ConnectionProfile represents a saved database connection.
type ConnectionProfile struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	URL      string `json:"url"`
	ReadOnly bool   `json:"read_only"`
	Color    string `json:"color"` // e.g. "emerald", "amber", "rose", "cyan"
}

type SystemHandler struct {
	client     client.Client
	version    string
	opts       client.Options
	mu         sync.RWMutex
	configDir  string
}

func NewSystemHandler(cli client.Client, version string, opts client.Options) *SystemHandler {
	home, _ := os.UserHomeDir()
	configDir := filepath.Join(home, ".valkeylens")
	_ = os.MkdirAll(configDir, 0755)

	return &SystemHandler{
		client:    cli,
		version:   version,
		opts:      opts,
		configDir: configDir,
	}
}

// Info handles GET /api/system/info
func (h *SystemHandler) Info(w http.ResponseWriter, r *http.Request) {
	middleware.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"version":    h.version,
		"read_only":  h.client.IsReadOnly(),
		"is_demo":    h.client.IsMock(),
		"cluster":    h.opts.Cluster,
		"url":        h.opts.URL,
	})
}

// Profiles handles GET /api/system/profiles
func (h *SystemHandler) Profiles(w http.ResponseWriter, r *http.Request) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	filePath := filepath.Join(h.configDir, "connections.json")
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		// Provide default profiles
		defaults := []ConnectionProfile{
			{ID: "local", Name: "Local Instance", URL: "valkey://127.0.0.1:6379", ReadOnly: false, Color: "emerald"},
			{ID: "demo", Name: "Embedded Demo Cluster", URL: "demo://in-memory", ReadOnly: false, Color: "cyan"},
			{ID: "prod-audit", Name: "Production Cache (Audit)", URL: "valkeys://prod.internal:6380", ReadOnly: true, Color: "rose"},
		}
		middleware.WriteJSON(w, http.StatusOK, defaults)
		return
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var profiles []ConnectionProfile
	if err := json.Unmarshal(data, &profiles); err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusOK, profiles)
}

// SaveProfiles handles POST /api/system/profiles
func (h *SystemHandler) SaveProfiles(w http.ResponseWriter, r *http.Request) {
	var profiles []ConnectionProfile
	if err := json.NewDecoder(r.Body).Decode(&profiles); err != nil {
		middleware.WriteError(w, http.StatusBadRequest, "Invalid profiles payload")
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	data, err := json.MarshalIndent(profiles, "", "  ")
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	filePath := filepath.Join(h.configDir, "connections.json")
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusOK, map[string]bool{"success": true})
}
