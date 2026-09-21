package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/alexandrmotologa/valkey-lens/pkg/telemetry"
	"github.com/alexandrmotologa/valkey-lens/server/middleware"
)

type TelemetryHandler struct {
	monitor *telemetry.Monitor
	slowlog *telemetry.SlowlogTracker
}

func NewTelemetryHandler(monitor *telemetry.Monitor, slowlog *telemetry.SlowlogTracker) *TelemetryHandler {
	return &TelemetryHandler{
		monitor: monitor,
		slowlog: slowlog,
	}
}

// Snapshot handles GET /api/telemetry/snapshot
func (h *TelemetryHandler) Snapshot(w http.ResponseWriter, r *http.Request) {
	snap := h.monitor.GetSnapshot()
	middleware.WriteJSON(w, http.StatusOK, snap)
}

// Stream handles GET /api/telemetry/stream using Server-Sent Events (SSE)
func (h *TelemetryHandler) Stream(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	// Send initial snapshot immediately
	snap := h.monitor.GetSnapshot()
	data, _ := json.Marshal(snap)
	fmt.Fprintf(w, "event: snapshot\ndata: %s\n\n", data)
	flusher.Flush()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			currentSnap := h.monitor.GetSnapshot()
			d, err := json.Marshal(currentSnap.Current)
			if err == nil {
				fmt.Fprintf(w, "event: metric\ndata: %s\n\n", d)
			}

			// Check for new slowlog events to push as alerts
			if newSlow, err := h.slowlog.CheckNewEntries(r.Context()); err == nil && len(newSlow) > 0 {
				slowData, _ := json.Marshal(newSlow)
				fmt.Fprintf(w, "event: slowlog\ndata: %s\n\n", slowData)
			}

			flusher.Flush()
		}
	}
}

// Slowlog handles GET /api/telemetry/slowlog
func (h *TelemetryHandler) Slowlog(w http.ResponseWriter, r *http.Request) {
	limit := int64(50)
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.ParseInt(limitStr, 10, 64); err == nil && l > 0 {
			limit = l
		}
	}

	records, err := h.slowlog.GetRecentSlowlogs(r.Context(), limit)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusOK, records)
}
