package streams

import (
	"context"
	"testing"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
)

func TestStreamInspector(t *testing.T) {
	ctx := context.Background()
	mock := client.NewMockClient(false)
	inspector := NewInspector(mock)

	streamKey := "stream:orders:events"

	detail, err := inspector.GetStreamDetail(ctx, streamKey, 10)
	if err != nil {
		t.Fatalf("GetStreamDetail failed: %v", err)
	}

	if detail.Length != 4 {
		t.Errorf("Expected 4 stream messages, got %d", detail.Length)
	}
	if len(detail.Entries) != 4 {
		t.Errorf("Expected 4 entries returned, got %d", len(detail.Entries))
	}
	if len(detail.Groups) != 2 {
		t.Errorf("Expected 2 consumer groups, got %d", len(detail.Groups))
	}

	// Test pending entries for inventory_workers
	pending, err := inspector.GetPendingEntries(ctx, streamKey, "inventory_workers", 10)
	if err != nil {
		t.Fatalf("GetPendingEntries failed: %v", err)
	}
	if len(pending) != 1 {
		t.Errorf("Expected 1 pending message, got %d", len(pending))
	}
	if pending[0].Consumer != "worker-pod-1" {
		t.Errorf("Expected consumer 'worker-pod-1', got %s", pending[0].Consumer)
	}
}
