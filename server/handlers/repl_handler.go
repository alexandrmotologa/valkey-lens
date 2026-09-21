package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/alexandrmotologa/valkey-lens/pkg/repl"
	"github.com/alexandrmotologa/valkey-lens/server/middleware"
)

type REPLHandler struct {
	evaluator *repl.Evaluator
}

func NewREPLHandler(eval *repl.Evaluator) *REPLHandler {
	return &REPLHandler{evaluator: eval}
}

// Exec handles POST /api/repl/exec
func (h *REPLHandler) Exec(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Command string `json:"command"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		middleware.WriteError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	result := h.evaluator.Execute(r.Context(), payload.Command)
	middleware.WriteJSON(w, http.StatusOK, result)
}

// Autocomplete handles GET /api/repl/autocomplete?q=...
func (h *REPLHandler) Autocomplete(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	matches := repl.FindCompletions(q)
	middleware.WriteJSON(w, http.StatusOK, matches)
}
