package cmd

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
	"github.com/alexandrmotologa/valkey-lens/pkg/explorer"
	"github.com/alexandrmotologa/valkey-lens/pkg/profiler"
	"github.com/alexandrmotologa/valkey-lens/pkg/repl"
	"github.com/alexandrmotologa/valkey-lens/pkg/streams"
	"github.com/alexandrmotologa/valkey-lens/pkg/telemetry"
	"github.com/alexandrmotologa/valkey-lens/server"
)

func runServer() error {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	opts := client.Options{
		URL:      serverURL,
		ReadOnly: readOnly,
		Cluster:  clusterMode,
		Nodes:    nodes,
		TLSCA:    tlsCA,
		IsDemo:   isDemo,
		Timeout:  3 * time.Second,
	}

	var dbClient client.Client
	var err error

	if isDemo {
		fmt.Println("🚀 Launching ValkeyLens in DEMO mode with embedded in-memory database...")
		dbClient = client.NewMockClient(readOnly)
	} else {
		fmt.Printf("Connecting to database at %s (read-only: %v)...\n", serverURL, readOnly)
		dbClient, err = client.NewValkeyClient(opts)
		if err != nil {
			fmt.Fprintf(os.Stderr, "⚠️ Connection failed: %v\n", err)
			fmt.Println("💡 Tip: Use --demo to test drive ValkeyLens without an external server.")
			return err
		}
	}
	defer dbClient.Close()

	// Initialize subsystems
	scanner := explorer.NewScanner(dbClient)
	crud := explorer.NewCRUDManager(dbClient)
	prof := profiler.NewProfiler(dbClient)
	inspector := streams.NewInspector(dbClient)
	monitor := telemetry.NewMonitor(dbClient)
	slowlog := telemetry.NewSlowlogTracker(dbClient)
	evaluator := repl.NewEvaluator(dbClient)

	// Start live telemetry polling
	monitor.Start(ctx)
	defer monitor.Stop()

	// Configure HTTP router
	router := server.NewRouter(server.RouterConfig{
		Client:    dbClient,
		Scanner:   scanner,
		CRUD:      crud,
		Profiler:  prof,
		Inspector: inspector,
		Monitor:   monitor,
		Slowlog:   slowlog,
		Evaluator: evaluator,
		AssetFS:   AssetFS,
		Version:   Version,
		Options:   opts,
	})

	addr := fmt.Sprintf("%s:%d", serverHost, serverPort)
	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	appURL := fmt.Sprintf("http://%s:%d", serverHost, serverPort)

	fmt.Println()
	fmt.Println("┌────────────────────────────────────────────────────────┐")
	fmt.Println("│           ValkeyLens Management Studio                 │")
	fmt.Println("└────────────────────────────────────────────────────────┘")
	fmt.Printf("  • Local Studio:   %s\n", appURL)
	fmt.Printf("  • Database:       %s\n", opts.URL)
	if readOnly {
		fmt.Println("  • Access Mode:    READ-ONLY (mutations blocked)")
	} else {
		fmt.Println("  • Access Mode:    READ-WRITE (safe non-blocking guards active)")
	}
	fmt.Println()

	// Open browser if enabled
	if !noBrowser {
		go func() {
			time.Sleep(300 * time.Millisecond)
			openBrowser(appURL)
		}()
	}

	// Server lifecycle with graceful shutdown
	serverErr := make(chan error, 1)
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			serverErr <- err
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-serverErr:
		return fmt.Errorf("HTTP server error: %w", err)
	case <-quit:
		fmt.Println("\nGracefully shutting down ValkeyLens...")
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer shutdownCancel()
		return srv.Shutdown(shutdownCtx)
	}
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	_ = cmd.Start()
}
