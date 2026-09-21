package cmd

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
	"github.com/alexandrmotologa/valkey-lens/pkg/profiler"
)

var (
	exportPath string
	topN       int
	sampleMax  int
	delimiter  string
	pattern    string
)

var auditCmd = &cobra.Command{
	Use:   "audit",
	Short: "Run headless keyspace memory profiling and export analysis report",
	Long: `Executes non-blocking cursor scans against the database, builds a prefix radix tree,
ranks the top memory-consuming big keys, flags unexpiring cache namespaces,
and exports the findings to formatted JSON or standalone interactive HTML.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()

		var dbClient client.Client
		var err error

		if isDemo {
			fmt.Println("Running audit against embedded demo database...")
			dbClient = client.NewMockClient(true)
		} else {
			fmt.Printf("Connecting to %s for memory audit...\n", serverURL)
			dbClient, err = client.NewValkeyClient(client.Options{
				URL:      serverURL,
				ReadOnly: true,
				Cluster:  clusterMode,
				Nodes:    nodes,
				TLSCA:    tlsCA,
				Timeout:  5 * time.Second,
			})
			if err != nil {
				return fmt.Errorf("audit connection failed: %w", err)
			}
		}
		defer dbClient.Close()

		fmt.Printf("Starting non-blocking memory scan (max samples: %d, pattern: %s, delimiter: %s)...\n", sampleMax, pattern, delimiter)
		prof := profiler.NewProfiler(dbClient)

		start := time.Now()
		report, err := prof.RunProfile(ctx, sampleMax, pattern, delimiter, topN)
		if err != nil {
			return fmt.Errorf("audit failed: %w", err)
		}
		duration := time.Since(start)

		fmt.Println()
		fmt.Printf("✓ Memory audit complete in %v\n", duration)
		fmt.Printf("  • Keys Scanned:     %d\n", report.ScannedKeys)
		fmt.Printf("  • Total Memory:     %s\n", profiler.FormatBytes(report.TotalBytes))
		fmt.Printf("  • Top Namespaces:   %d\n", len(report.Namespaces))
		fmt.Printf("  • Big Keys Ranked:  %d\n", len(report.BigKeys))

		if len(report.LeakAlerts) > 0 {
			fmt.Println()
			fmt.Printf("⚠️ %d Potential Memory Leaks Detected:\n", len(report.LeakAlerts))
			for _, alert := range report.LeakAlerts {
				fmt.Printf("   - %s\n", alert)
			}
		}

		// Print top 5 big keys to terminal
		fmt.Println()
		fmt.Println("Top Big Keys:")
		limit := 5
		if len(report.BigKeys) < limit {
			limit = len(report.BigKeys)
		}
		for i := 0; i < limit; i++ {
			bk := report.BigKeys[i]
			fmt.Printf("  %d. %s (%s) — %s\n", i+1, bk.Key, bk.Type, profiler.FormatBytes(bk.Bytes))
		}

		// Export if requested
		if exportPath != "" {
			var outData []byte
			ext := strings.ToLower(filepath.Ext(exportPath))
			if ext == ".html" || ext == ".htm" {
				outData, err = profiler.ExportHTML(report)
			} else {
				outData, err = profiler.ExportJSON(report)
			}
			if err != nil {
				return fmt.Errorf("failed to format export: %w", err)
			}

			if err := os.WriteFile(exportPath, outData, 0644); err != nil {
				return fmt.Errorf("failed to write export file: %w", err)
			}
			fmt.Printf("\n✓ Audit report saved to %s\n", exportPath)
		}

		return nil
	},
}

func init() {
	auditCmd.Flags().StringVarP(&exportPath, "export", "e", "", "Path to export report file (.json or .html)")
	auditCmd.Flags().IntVarP(&topN, "top", "t", 50, "Number of top big keys to track")
	auditCmd.Flags().IntVarP(&sampleMax, "samples", "s", 25000, "Maximum number of keys to sample during audit")
	auditCmd.Flags().StringVarP(&delimiter, "delimiter", "d", ":", "Delimiter character for namespace tree grouping")
	auditCmd.Flags().StringVar(&pattern, "pattern", "*", "Pattern filter for scanned keys")
}
