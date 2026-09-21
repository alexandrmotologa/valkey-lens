package server

import (
	"io/fs"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
	"github.com/alexandrmotologa/valkey-lens/pkg/explorer"
	"github.com/alexandrmotologa/valkey-lens/pkg/profiler"
	"github.com/alexandrmotologa/valkey-lens/pkg/repl"
	"github.com/alexandrmotologa/valkey-lens/pkg/streams"
	"github.com/alexandrmotologa/valkey-lens/pkg/telemetry"
	"github.com/alexandrmotologa/valkey-lens/server/handlers"
	"github.com/alexandrmotologa/valkey-lens/server/middleware"
)

// RouterConfig contains services required by the HTTP server.
type RouterConfig struct {
	Client     client.Client
	Scanner    *explorer.Scanner
	CRUD       *explorer.CRUDManager
	Profiler   *profiler.Profiler
	Inspector  *streams.Inspector
	Monitor    *telemetry.Monitor
	Slowlog    *telemetry.SlowlogTracker
	Evaluator  *repl.Evaluator
	AssetFS    fs.FS
	Version    string
	Options    client.Options
}

// NewRouter constructs and configures the Chi HTTP router.
func NewRouter(cfg RouterConfig) http.Handler {
	r := chi.NewRouter()

	// Base middleware
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(middleware.SecurityHeaders)

	// Permissive CORS for development
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Read-only mutation protection
	r.Use(middleware.ReadOnlyGuard(cfg.Client.IsReadOnly()))

	// Instantiate handlers
	keysH := handlers.NewKeysHandler(cfg.Scanner, cfg.CRUD)
	memoryH := handlers.NewMemoryHandler(cfg.Profiler)
	streamsH := handlers.NewStreamsHandler(cfg.Inspector)
	telemetryH := handlers.NewTelemetryHandler(cfg.Monitor, cfg.Slowlog)
	replH := handlers.NewREPLHandler(cfg.Evaluator)
	systemH := handlers.NewSystemHandler(cfg.Client, cfg.Version, cfg.Options)

	// API Routes
	r.Route("/api", func(api chi.Router) {
		// System
		api.Get("/system/info", systemH.Info)
		api.Get("/system/profiles", systemH.Profiles)
		api.Post("/system/profiles", systemH.SaveProfiles)

		// Keys
		api.Get("/keys", keysH.List)
		api.Get("/keys/detail", keysH.Detail)
		api.Post("/keys/set", keysH.SetString)
		api.Post("/keys/ttl", keysH.UpdateTTL)
		api.Delete("/keys", keysH.DeleteKey)
		api.Post("/keys/delete-pattern", keysH.DeletePattern)
		api.Post("/keys/hash/set", keysH.HSet)
		api.Delete("/keys/hash/field", keysH.HDel)

		// Memory Profiler
		api.Get("/memory/profile", memoryH.Profile)
		api.Get("/memory/export/json", memoryH.ExportJSON)
		api.Get("/memory/export/html", memoryH.ExportHTML)

		// Streams
		api.Get("/streams/detail", streamsH.Detail)
		api.Get("/streams/pending", streamsH.Pending)

		// Telemetry
		api.Get("/telemetry/snapshot", telemetryH.Snapshot)
		api.Get("/telemetry/stream", telemetryH.Stream)
		api.Get("/telemetry/slowlog", telemetryH.Slowlog)

		// REPL
		api.Post("/repl/exec", replH.Exec)
		api.Get("/repl/autocomplete", replH.Autocomplete)
	})

	// Static SPA file serving
	r.Handle("/*", NewStaticHandler(cfg.AssetFS))

	return r
}
