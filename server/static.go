package server

import (
	"io/fs"
	"net/http"
	"strings"
)

// StaticHandler serves the embedded SPA assets with client-side routing fallback.
type StaticHandler struct {
	fs        http.FileSystem
	indexHTML []byte
}

// NewStaticHandler creates a handler that serves static files with SPA fallback to index.html.
func NewStaticHandler(assetFS fs.FS) http.Handler {
	if assetFS == nil {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			_, _ = w.Write([]byte(`<!DOCTYPE html><html><body><h1>ValkeyLens Dev Server</h1><p>UI assets not bundled yet. Run <code>make build-ui</code> or access the API at <code>/api/...</code>.</p></body></html>`))
		})
	}

	subFS, err := fs.Sub(assetFS, "ui/dist")
	if err != nil {
		// Fallback to direct root if already subbed
		subFS = assetFS
	}

	indexData, _ := fs.ReadFile(subFS, "index.html")

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}

		// Check if file exists in static FS
		file, err := subFS.Open(path)
		if err == nil {
			_ = file.Close()
			http.FileServer(http.FS(subFS)).ServeHTTP(w, r)
			return
		}

		// Fallback to index.html for SPA routes (e.g. /profiler, /telemetry, /keys)
		if len(indexData) > 0 {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write(indexData)
			return
		}

		http.NotFound(w, r)
	})
}
