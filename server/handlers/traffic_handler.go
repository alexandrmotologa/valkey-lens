package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/alexandrmotologa/valkey-lens/pkg/traffic"
	"github.com/alexandrmotologa/valkey-lens/server/middleware"
)

type TrafficHandler struct {
	sampler *traffic.Sampler
}

func NewTrafficHandler(s *traffic.Sampler) *TrafficHandler {
	return &TrafficHandler{sampler: s}
}

// Sample handles GET /api/traffic/sample?duration_sec=5&max_commands=500
func (h *TrafficHandler) Sample(w http.ResponseWriter, r *http.Request) {
	durationSecStr := r.URL.Query().Get("duration_sec")
	maxCmdsStr := r.URL.Query().Get("max_commands")

	duration := 5 * time.Second
	if durationSecStr != "" {
		if sec, err := strconv.Atoi(durationSecStr); err == nil && sec > 0 && sec <= 10 {
			duration = time.Duration(sec) * time.Second
		}
	}

	maxCmds := 500
	if maxCmdsStr != "" {
		if m, err := strconv.Atoi(maxCmdsStr); err == nil && m > 0 && m <= 1000 {
			maxCmds = m
		}
	}

	summary, err := h.sampler.SampleTraffic(r.Context(), duration, maxCmds)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(summary)
}
