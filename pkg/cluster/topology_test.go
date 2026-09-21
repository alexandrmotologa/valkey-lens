package cluster

import (
	"testing"
)

func TestCalculateSlot(t *testing.T) {
	// Standard Redis CRC16 test vectors:
	// "123456789" -> 0x31C3 -> 12739 % 16384 = 12739
	slot, tag := CalculateSlot("123456789")
	if slot != 12739 {
		t.Errorf("CalculateSlot('123456789') = %d, expected 12739", slot)
	}
	if tag != "" {
		t.Errorf("expected empty tag, got %q", tag)
	}

	// Test hashtag
	slot1, tag1 := CalculateSlot("user:{1001}:profile")
	slot2, tag2 := CalculateSlot("user:{1001}:settings")
	if slot1 != slot2 {
		t.Errorf("expected identical slot for same hashtag: %d != %d", slot1, slot2)
	}
	if tag1 != "1001" || tag2 != "1001" {
		t.Errorf("expected hashtag '1001', got %q, %q", tag1, tag2)
	}
}

func TestParseClusterNodes(t *testing.T) {
	raw := `07c37dfeb235213a8602b4d7330894c4922b7e5c 127.0.0.1:7000@17000 myself,master - 0 0 1 connected 0-5460
6750d1c0580d0e1e5d7cbf71302688d4869ac755 127.0.0.1:7001@17001 master - 0 0 2 connected 5461-10922
9f46521c000acab326f3e194e82912c930193914 127.0.0.1:7002@17002 master - 0 0 3 connected 10923-16383`

	report := ParseClusterNodes(raw)
	if !report.IsCluster {
		t.Fatalf("expected cluster mode true")
	}
	if report.TotalNodes != 3 {
		t.Fatalf("expected 3 nodes, got %d", report.TotalNodes)
	}
	if report.MasterCount != 3 {
		t.Errorf("expected 3 masters, got %d", report.MasterCount)
	}
	if report.AssignedSlots != 16384 {
		t.Errorf("expected 16384 total assigned slots, got %d", report.AssignedSlots)
	}
}
