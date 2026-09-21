package cmd

import (
	"fmt"
	"io/fs"
	"os"

	"github.com/spf13/cobra"
)

var (
	Version   = "0.1.0"
	BuildDate = "2026-09-21"

	// CLI flags
	serverURL   string
	serverPort  int
	serverHost  string
	readOnly    bool
	isDemo      bool
	clusterMode bool
	nodes       []string
	tlsCA       string
	noBrowser   bool
	showVersion bool

	// Embedded asset filesystem
	AssetFS fs.FS
)

// RootCmd is the base command executed when called without subcommands.
var RootCmd = &cobra.Command{
	Use:   "valkeylens",
	Short: "ValkeyLens: Observability Studio & Non-Blocking Memory Profiler for Valkey 8 & Redis 7+",
	Long: `ValkeyLens is a single-binary management studio, non-blocking memory profiler,
and data workbench for Valkey 8 and Redis 7+.

It runs with <25MB RAM, requires zero external dependencies, strictly protects
production databases with non-blocking scans and command interceptors, and features
an embedded React 19 management console.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		if showVersion {
			fmt.Printf("ValkeyLens v%s (built %s)\n", Version, BuildDate)
			return nil
		}
		return runServer()
	},
}

func init() {
	RootCmd.PersistentFlags().StringVarP(&serverURL, "url", "u", "valkey://127.0.0.1:6379", "Database server connection URL")
	RootCmd.PersistentFlags().IntVarP(&serverPort, "port", "p", 63790, "HTTP server port")
	RootCmd.PersistentFlags().StringVarP(&serverHost, "host", "H", "127.0.0.1", "HTTP server bind address")
	RootCmd.PersistentFlags().BoolVarP(&readOnly, "read-only", "r", false, "Enable read-only mode to block mutating operations")
	RootCmd.PersistentFlags().BoolVar(&isDemo, "demo", false, "Start with embedded in-memory mock database and sample datasets")
	RootCmd.PersistentFlags().BoolVar(&clusterMode, "cluster", false, "Enable cluster mode discovery")
	RootCmd.PersistentFlags().StringSliceVar(&nodes, "nodes", nil, "Comma-separated list of cluster seed nodes")
	RootCmd.PersistentFlags().StringVar(&tlsCA, "tls-ca", "", "Path to custom TLS CA certificate file")
	RootCmd.PersistentFlags().BoolVar(&noBrowser, "no-browser", false, "Skip automatically opening default browser on launch")
	RootCmd.Flags().BoolVarP(&showVersion, "version", "v", false, "Print version information")

	// Add audit subcommand
	RootCmd.AddCommand(auditCmd)
}

// Execute adds all child commands to the root command and sets flags appropriately.
func Execute(embeddedFS fs.FS, ver string) {
	AssetFS = embeddedFS
	if ver != "" {
		Version = ver
	}
	if err := RootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}
