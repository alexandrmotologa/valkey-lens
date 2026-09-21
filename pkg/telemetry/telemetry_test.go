package telemetry

import (
	"context"
	"testing"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
)

func TestTelemetryMonitor(t *testing.T) {
	ctx := context.Background()
	mock := client.NewMockClient(false)
	monitor := NewMonitor(mock)

	monitor.poll(ctx)

	snap := monitor.GetSnapshot()
	if snap.Server.Version == "" {
		t.Errorf("Expected server version, got empty")
	}
	if snap.Current.UsedMemoryBytes <= 0 {
		t.Errorf("Expected positive memory usage, got %d", snap.Current.UsedMemoryBytes)
	}
	if snap.Current.OpsPerSec <= 0 {
		t.Errorf("Expected positive ops/sec, got %d", snap.Current.OpsPerSec)
	}
	if len(snap.History) != 1 {
		t.Errorf("Expected 1 history point, got %d", len(snap.History))
	}
}

func TestSlowlogTracker(t *testing.T) {
	ctx := context.Background()
	mock := client.NewMockClient(false)
	tracker := NewSlowlogTracker(mock)

	records, err := tracker.GetRecentSlowlogs(ctx, 10)
	if err != nil {
		t.Fatalf("GetRecentSlowlogs failed: %v", err)
	}
	if len(records) == 0 {
		t.Fatalf("Expected slowlog records, got 0")
	}
	t.Logf("Retrieved %d slowlog records: first duration %v", len(records), records[0].Duration)

	// Check new entries
	newEntries, err := tracker.CheckNewEntries(ctx)
	if err != nil {
		t.Fatalf("CheckNewEntries failed: %v", err)
	}
	if len(newEntries) != len(records) {
		t.Errorf("Expected %d initial new entries, got %d", len(records), len(newEntries))
	}

	// Subsequent check should return 0 new entries
	secondCheck, _ := tracker.CheckNewEntries(ctx)
	if len(secondCheck) != 0 {
		t.Errorf("Expected 0 new entries on second check, got %d", len(secondCheck))
	}
}
