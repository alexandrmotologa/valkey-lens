package profiler

import (
	"context"
	"strings"
	"testing"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
)

func TestPrefixTreeAggregation(t *testing.T) {
	tree := NewPrefixTree(":")

	tree.Insert("user:profile:1001", 1000, true)
	tree.Insert("user:profile:1002", 2000, true)
	tree.Insert("user:session:tok_1", 500, false)
	tree.Insert("cache:catalog:prod_1", 5000, true)

	tree.Finalize()

	if tree.Root.TotalBytes != 8500 {
		t.Fatalf("Expected root total bytes 8500, got %d", tree.Root.TotalBytes)
	}
	if tree.Root.KeyCount != 4 {
		t.Fatalf("Expected root key count 4, got %d", tree.Root.KeyCount)
	}

	namespaces := tree.FlattenTopNamespaces()
	if len(namespaces) == 0 {
		t.Fatalf("Expected flattened namespaces, got 0")
	}

	// Verify top namespace is cache:catalog or user
	t.Logf("Flattened namespaces count: %d", len(namespaces))
	for _, ns := range namespaces {
		t.Logf("Namespace: %s, Keys: %d, Bytes: %d, Share: %.2f%%", ns.FullPath, ns.KeyCount, ns.TotalBytes, ns.Percentage)
	}
}

func TestBigKeyTracker(t *testing.T) {
	tracker := NewBigKeyTracker(3)

	tracker.Add(BigKeyEntry{Key: "key1", Bytes: 100})
	tracker.Add(BigKeyEntry{Key: "key2", Bytes: 500})
	tracker.Add(BigKeyEntry{Key: "key3", Bytes: 200})
	tracker.Add(BigKeyEntry{Key: "key4", Bytes: 1000}) // should displace key1
	tracker.Add(BigKeyEntry{Key: "key5", Bytes: 50})   // should not qualify

	entries := tracker.Entries()
	if len(entries) != 3 {
		t.Fatalf("Expected exactly 3 top keys, got %d", len(entries))
	}

	// Must be sorted descending
	if entries[0].Key != "key4" || entries[0].Bytes != 1000 {
		t.Errorf("Expected top 1 to be key4 (1000), got %v", entries[0])
	}
	if entries[1].Key != "key2" || entries[1].Bytes != 500 {
		t.Errorf("Expected top 2 to be key2 (500), got %v", entries[1])
	}
	if entries[2].Key != "key3" || entries[2].Bytes != 200 {
		t.Errorf("Expected top 3 to be key3 (200), got %v", entries[2])
	}
}

func TestProfilerAndExport(t *testing.T) {
	ctx := context.Background()
	mock := client.NewMockClient(false)
	prof := NewProfiler(mock)

	report, err := prof.RunProfile(ctx, 1000, "*", ":", 10)
	if err != nil {
		t.Fatalf("RunProfile failed: %v", err)
	}

	if report.ScannedKeys == 0 {
		t.Fatalf("Expected scanned keys > 0, got 0")
	}
	if len(report.BigKeys) == 0 {
		t.Fatalf("Expected big keys in report, got none")
	}

	// Verify big blob key is top 1
	topKey := report.BigKeys[0]
	if !strings.Contains(topKey.Key, "big_blob") {
		t.Errorf("Expected top big key to be big_blob, got %s (%d bytes)", topKey.Key, topKey.Bytes)
	}

	// Test ExportJSON
	jsonBytes, err := ExportJSON(report)
	if err != nil || len(jsonBytes) == 0 {
		t.Fatalf("ExportJSON failed: %v", err)
	}

	// Test ExportHTML
	htmlBytes, err := ExportHTML(report)
	if err != nil || len(htmlBytes) == 0 {
		t.Fatalf("ExportHTML failed: %v", err)
	}
	if !strings.Contains(string(htmlBytes), "ValkeyLens Memory Audit") {
		t.Errorf("HTML export missing expected title")
	}
}
