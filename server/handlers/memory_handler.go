package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/alexandrmotologa/valkey-lens/pkg/profiler"
	"github.com/alexandrmotologa/valkey-lens/server/middleware"
)

type MemoryHandler struct {
	profiler *profiler.Profiler
}

func NewMemoryHandler(p *profiler.Profiler) *MemoryHandler {
	return &MemoryHandler{profiler: p}
}

// Profile handles GET /api/memory/profile
func (h *MemoryHandler) Profile(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	pattern := r.URL.Query().Get("pattern")
	delim := r.URL.Query().Get("delimiter")
	topNStr := r.URL.Query().Get("top")

	limit := 10000
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	topN := 50
	if topNStr != "" {
		if t, err := strconv.Atoi(topNStr); err == nil && t > 0 {
			topN = t
		}
	}

	report, err := h.profiler.RunProfile(r.Context(), limit, pattern, delim, topN)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusOK, report)
}

// ExportJSON handles GET /api/memory/export/json
func (h *MemoryHandler) ExportJSON(w http.ResponseWriter, r *http.Request) {
	report, err := h.profiler.RunProfile(r.Context(), 10000, "*", ":", 50)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	data, err := profiler.ExportJSON(report)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	filename := fmt.Sprintf("valkeylens_memory_audit_%s.json", time.Now().Format("20060102_150405"))
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

// ExportHTML handles GET /api/memory/export/html
func (h *MemoryHandler) ExportHTML(w http.ResponseWriter, r *http.Request) {
	report, err := h.profiler.RunProfile(r.Context(), 10000, "*", ":", 50)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	htmlData, err := profiler.ExportHTML(report)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	filename := fmt.Sprintf("valkeylens_memory_audit_%s.html", time.Now().Format("20060102_150405"))
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(htmlData)
}
