package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/alexandrmotologa/valkey-lens/pkg/explorer"
	"github.com/alexandrmotologa/valkey-lens/server/middleware"
)

type KeysHandler struct {
	scanner *explorer.Scanner
	crud    *explorer.CRUDManager
}

func NewKeysHandler(scanner *explorer.Scanner, crud *explorer.CRUDManager) *KeysHandler {
	return &KeysHandler{
		scanner: scanner,
		crud:    crud,
	}
}

// List handles GET /api/keys
func (h *KeysHandler) List(w http.ResponseWriter, r *http.Request) {
	cursorStr := r.URL.Query().Get("cursor")
	pattern := r.URL.Query().Get("pattern")
	countStr := r.URL.Query().Get("count")

	var cursor uint64 = 0
	if cursorStr != "" {
		c, _ := strconv.ParseUint(cursorStr, 10, 64)
		cursor = c
	}

	var count int64 = 250
	if countStr != "" {
		cnt, _ := strconv.ParseInt(countStr, 10, 64)
		if cnt > 0 {
			count = cnt
		}
	}

	resp, err := h.scanner.ScanKeys(r.Context(), cursor, pattern, count)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusOK, resp)
}

// Detail handles GET /api/keys/detail?key=...
func (h *KeysHandler) Detail(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if key == "" {
		middleware.WriteError(w, http.StatusBadRequest, "Missing 'key' query parameter")
		return
	}

	detail, err := h.crud.GetKeyDetail(r.Context(), key)
	if err != nil {
		middleware.WriteError(w, http.StatusNotFound, err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusOK, detail)
}

// SetString handles POST /api/keys/set
func (h *KeysHandler) SetString(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Key    string `json:"key"`
		Value  string `json:"value"`
		TTLSec int64  `json:"ttl_sec"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.Key == "" {
		middleware.WriteError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.crud.SetString(r.Context(), payload.Key, payload.Value, payload.TTLSec); err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// UpdateTTL handles POST /api/keys/ttl
func (h *KeysHandler) UpdateTTL(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Key    string `json:"key"`
		TTLSec int64  `json:"ttl_sec"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.Key == "" {
		middleware.WriteError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.crud.UpdateTTL(r.Context(), payload.Key, payload.TTLSec); err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// DeleteKey handles DELETE /api/keys?key=...
func (h *KeysHandler) DeleteKey(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if key == "" {
		middleware.WriteError(w, http.StatusBadRequest, "Missing 'key' query parameter")
		return
	}

	if err := h.crud.DeleteKey(r.Context(), key); err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// DeletePattern handles POST /api/keys/delete-pattern
func (h *KeysHandler) DeletePattern(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Pattern string `json:"pattern"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.Pattern == "" {
		middleware.WriteError(w, http.StatusBadRequest, "Invalid pattern")
		return
	}

	deleted, err := h.scanner.DeleteByPattern(r.Context(), payload.Pattern, 100)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"deleted": deleted,
	})
}

// Hash operations
func (h *KeysHandler) HSet(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Key   string `json:"key"`
		Field string `json:"field"`
		Value string `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.Key == "" || payload.Field == "" {
		middleware.WriteError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.crud.HSet(r.Context(), payload.Key, payload.Field, payload.Value); err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusOK, map[string]bool{"success": true})
}

func (h *KeysHandler) HDel(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	field := r.URL.Query().Get("field")
	if key == "" || field == "" {
		middleware.WriteError(w, http.StatusBadRequest, "Missing key or field")
		return
	}

	if err := h.crud.HDel(r.Context(), key, field); err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusOK, map[string]bool{"success": true})
}
