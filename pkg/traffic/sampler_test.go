package traffic

import (
	"testing"
)

func TestClassifyCommand(t *testing.T) {
	tests := []struct {
		cmd      string
		expected string
	}{
		{"GET", "READ"},
		{"hgetall", "READ"},
		{"SET", "WRITE"},
		{"lpush", "WRITE"},
		{"SCAN", "SCAN"},
		{"INFO", "ADMIN"},
		{"CUSTOM", "OTHER"},
	}

	for _, tt := range tests {
		got := ClassifyCommand(tt.cmd)
		if got != tt.expected {
			t.Errorf("ClassifyCommand(%q) = %q, expected %q", tt.cmd, got, tt.expected)
		}
	}
}

func TestTopHotKeys(t *testing.T) {
	counts := map[string]int{
		"user:1":  50,
		"order:2": 120,
		"cache:3": 10,
		"hot:key": 300,
	}

	top := TopHotKeys(counts, 2)
	if len(top) != 2 {
		t.Fatalf("expected 2 hot keys, got %d", len(top))
	}
	if top[0].Key != "hot:key" || top[0].Count != 300 {
		t.Errorf("expected hot:key as #1, got %+v", top[0])
	}
	if top[1].Key != "order:2" || top[1].Count != 120 {
		t.Errorf("expected order:2 as #2, got %+v", top[1])
	}
}
