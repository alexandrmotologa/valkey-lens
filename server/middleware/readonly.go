package middleware

import (
	"net/http"
	"strings"
)

// ReadOnlyGuard blocks mutating requests when readOnly is enabled.
func ReadOnlyGuard(readOnly bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if readOnly {
				method := strings.ToUpper(r.Method)
				// Block modifying methods for data mutation endpoints
				if (method == "POST" || method == "DELETE" || method == "PUT" || method == "PATCH") &&
					!strings.HasPrefix(r.URL.Path, "/api/repl/exec") && // REPL has its own command-level guard
					!strings.HasPrefix(r.URL.Path, "/api/system/profiles") {
					WriteError(w, http.StatusForbidden, "Operation forbidden: ValkeyLens is running in read-only mode (--read-only).")
					return
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}
