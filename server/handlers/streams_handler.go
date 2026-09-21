package handlers

import (
	"net/http"
	"strconv"

	"github.com/alexandrmotologa/valkey-lens/pkg/streams"
	"github.com/alexandrmotologa/valkey-lens/server/middleware"
)

type StreamsHandler struct {
	inspector *streams.Inspector
}

func NewStreamsHandler(inspector *streams.Inspector) *StreamsHandler {
	return &StreamsHandler{inspector: inspector}
}

// Detail handles GET /api/streams/detail?key=...&limit=...
func (h *StreamsHandler) Detail(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if key == "" {
		middleware.WriteError(w, http.StatusBadRequest, "Missing 'key' query parameter")
		return
	}

	limit := int64(50)
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.ParseInt(limitStr, 10, 64); err == nil && l > 0 {
			limit = l
		}
	}

	detail, err := h.inspector.GetStreamDetail(r.Context(), key, limit)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusOK, detail)
}

// Pending handles GET /api/streams/pending?key=...&group=...&limit=...
func (h *StreamsHandler) Pending(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	group := r.URL.Query().Get("group")
	if key == "" || group == "" {
		middleware.WriteError(w, http.StatusBadRequest, "Missing 'key' or 'group' query parameter")
		return
	}

	limit := int64(50)
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.ParseInt(limitStr, 10, 64); err == nil && l > 0 {
			limit = l
		}
	}

	entries, err := h.inspector.GetPendingEntries(r.Context(), key, group, limit)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusOK, entries)
}
