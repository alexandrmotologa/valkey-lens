package profiler

import (
	"context"
	"fmt"
	"time"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
	"github.com/alexandrmotologa/valkey-lens/pkg/explorer"
)

// ProfileReport encapsulates the complete memory analysis of a keyspace.
type ProfileReport struct {
	Timestamp     time.Time        `json:"timestamp"`
	ScannedKeys   int64            `json:"scanned_keys"`
	TotalBytes    int64            `json:"total_bytes"`
	Root          *NamespaceNode   `json:"root"`
	Namespaces    []*NamespaceNode `json:"namespaces"`
	BigKeys       []BigKeyEntry    `json:"big_keys"`
	LeakAlerts    []string         `json:"leak_alerts,omitempty"`
}

// Profiler orchestrates memory profiling scans.
type Profiler struct {
	client client.Client
}

// NewProfiler creates a new memory profiler.
func NewProfiler(cli client.Client) *Profiler {
	return &Profiler{client: cli}
}

// RunProfile executes a non-blocking memory profiling scan.
func (p *Profiler) RunProfile(ctx context.Context, sampleLimit int, pattern, delimiter string, topN int) (*ProfileReport, error) {
	if delimiter == "" {
		delimiter = ":"
	}
	if pattern == "" {
		pattern = "*"
	}
	if sampleLimit <= 0 {
		sampleLimit = 10000 // default sample budget
	}
	if topN <= 0 {
		topN = 50
	}

	tree := NewPrefixTree(delimiter)
	bigKeys := NewBigKeyTracker(topN)

	var cursor uint64 = 0
	var scannedCount int64 = 0
	batchSize := int64(250)

	for {
		nextCursor, keys, err := p.client.Scan(ctx, cursor, pattern, batchSize)
		if err != nil {
			return nil, fmt.Errorf("profiler scan failed at cursor %d: %w", cursor, err)
		}

		for _, key := range keys {
			kType, _ := p.client.Type(ctx, key)
			pttl, _ := p.client.PTTL(ctx, key)
			hasTTL := pttl > 0

			mem, err := p.client.MemoryUsage(ctx, key, 5)
			if err != nil || mem <= 0 {
				mem = 64 // fallback estimate
			}

			tree.Insert(key, mem, hasTTL)

			bigKeys.Add(BigKeyEntry{
				Key:       key,
				Type:      kType,
				Bytes:     mem,
				TTL:       pttl,
				Namespace: explorer.ExtractNamespace(key, delimiter),
			})

			scannedCount++
			if scannedCount >= int64(sampleLimit) {
				break
			}
		}

		cursor = nextCursor
		if cursor == 0 || scannedCount >= int64(sampleLimit) {
			break
		}
	}

	tree.Finalize()

	// Detect potential memory leaks (namespaces with 100% persistent keys)
	var leakAlerts []string
	for _, ns := range tree.FlattenTopNamespaces() {
		if ns.KeyCount >= 5 && ns.VolatileCount == 0 {
			alert := fmt.Sprintf("Namespace '%s' has %d keys with 0%% TTL expiration (%d bytes). Verify if this is an unexpiring cache leak.", ns.FullPath, ns.KeyCount, ns.TotalBytes)
			leakAlerts = append(leakAlerts, alert)
		}
	}

	return &ProfileReport{
		Timestamp:   time.Now(),
		ScannedKeys: scannedCount,
		TotalBytes:  tree.Root.TotalBytes,
		Root:        tree.Root,
		Namespaces:  tree.FlattenTopNamespaces(),
		BigKeys:     bigKeys.Entries(),
		LeakAlerts:  leakAlerts,
	}, nil
}
