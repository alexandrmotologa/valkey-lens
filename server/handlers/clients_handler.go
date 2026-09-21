package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/alexandrmotologa/valkey-lens/pkg/clients"
)

type ClientsHandler struct {
	manager *clients.Manager
}

func NewClientsHandler(m *clients.Manager) *ClientsHandler {
	return &ClientsHandler{manager: m}
}

func (h *ClientsHandler) List(w http.ResponseWriter, r *http.Request) {
	list, err := h.manager.ListClients(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(list)
}

func (h *ClientsHandler) Kill(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Target string `json:"target"`
		ByID   bool   `json:"by_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Target == "" {
		http.Error(w, "invalid request body: target is required", http.StatusBadRequest)
		return
	}

	if err := h.manager.KillClient(r.Context(), body.Target, body.ByID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]bool{"success": true})
}
