package repl

import (
	"context"
	"strings"
	"testing"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
)

func TestSplitCommand(t *testing.T) {
	tests := []struct {
		input    string
		expected []string
	}{
		{
			input:    "PING",
			expected: []string{"PING"},
		},
		{
			input:    "SET mykey \"hello world\"",
			expected: []string{"SET", "mykey", "hello world"},
		},
		{
			input:    "HSET user:1 'full name' \"Alexandr Motologa\"",
			expected: []string{"HSET", "user:1", "full name", "Alexandr Motologa"},
		},
		{
			input:    "SET json '{\"foo\": \"bar\"}'",
			expected: []string{"SET", "json", "{\"foo\": \"bar\"}"},
		},
	}

	for _, tt := range tests {
		got := SplitCommand(tt.input)
		if len(got) != len(tt.expected) {
			t.Fatalf("SplitCommand(%q) length mismatch: got %v, expected %v", tt.input, got, tt.expected)
		}
		for i := range got {
			if got[i] != tt.expected[i] {
				t.Errorf("SplitCommand(%q)[%d] = %q, expected %q", tt.input, i, got[i], tt.expected[i])
			}
		}
	}
}

func TestEvaluator(t *testing.T) {
	ctx := context.Background()
	mock := client.NewMockClient(false)
	eval := NewEvaluator(mock)

	// 1. Safe command
	res := eval.Execute(ctx, "PING")
	if res.IsError || res.Formatted != "\"PONG\"" {
		t.Fatalf("PING failed: %v", res)
	}

	// 2. Blocked command
	blockedRes := eval.Execute(ctx, "FLUSHALL")
	if !blockedRes.IsError || !strings.Contains(blockedRes.Formatted, "blocked") {
		t.Fatalf("Expected blocked error for FLUSHALL, got %v", blockedRes)
	}

	// 3. Autocomplete
	matches := FindCompletions("SE")
	if len(matches) == 0 {
		t.Fatalf("Expected completions for 'SE', got none")
	}
	hasSet := false
	for _, m := range matches {
		if m.Name == "SET" {
			hasSet = true
			break
		}
	}
	if !hasSet {
		t.Errorf("Expected 'SET' in completions for 'SE'")
	}
}
