package client

import (
	"context"
	"testing"
)

func TestMockClientOperations(t *testing.T) {
	ctx := context.Background()
	mock := NewMockClient(false)

	// 1. Ping
	if err := mock.Ping(ctx); err != nil {
		t.Fatalf("Ping failed: %v", err)
	}

	// 2. Scan
	cursor, keys, err := mock.Scan(ctx, 0, "user:*", 100)
	if err != nil {
		t.Fatalf("Scan failed: %v", err)
	}
	if len(keys) == 0 {
		t.Fatalf("Expected scanned keys matching 'user:*', got none")
	}
	t.Logf("Scanned %d keys (next cursor: %d): %v", len(keys), cursor, keys)

	// 3. Type
	kType, err := mock.Type(ctx, "user:profile:1001")
	if err != nil || kType != "string" {
		t.Fatalf("Expected type 'string', got %s, err: %v", kType, err)
	}

	hashType, err := mock.Type(ctx, "settings:user:1001")
	if err != nil || hashType != "hash" {
		t.Fatalf("Expected type 'hash', got %s, err: %v", hashType, err)
	}

	// 4. MemoryUsage
	mem, err := mock.MemoryUsage(ctx, "system:big_blob:payload_dump", 0)
	if err != nil {
		t.Fatalf("MemoryUsage error: %v", err)
	}
	if mem < 100000 {
		t.Fatalf("Expected large memory usage for big blob, got %d", mem)
	}

	// 5. PTTL
	pttl, err := mock.PTTL(ctx, "user:profile:1001")
	if err != nil || pttl <= 0 {
		t.Fatalf("Expected positive TTL for user:profile:1001, got %d", pttl)
	}

	// 6. Do: GET & SET
	res, err := mock.Do(ctx, "GET", "system:version")
	if err != nil || res != "Valkey 8.0.2-GA" {
		t.Fatalf("Unexpected GET response: %v, err: %v", res, err)
	}

	_, err = mock.Do(ctx, "SET", "test:item", "hello_world")
	if err != nil {
		t.Fatalf("SET failed: %v", err)
	}
	getRes, err := mock.Do(ctx, "GET", "test:item")
	if err != nil || getRes != "hello_world" {
		t.Fatalf("Expected 'hello_world', got %v", getRes)
	}

	// 7. Info
	info, err := mock.Info(ctx, "Server")
	if err != nil || len(info) == 0 {
		t.Fatalf("Info failed: %v", err)
	}

	// 8. SlowlogGet
	slowlogs, err := mock.SlowlogGet(ctx, 10)
	if err != nil || len(slowlogs) == 0 {
		t.Fatalf("Expected slowlog records, got %v", slowlogs)
	}
}

func TestMockClientReadOnly(t *testing.T) {
	ctx := context.Background()
	mock := NewMockClient(true)

	// In read-only, mutating commands must fail
	_, err := mock.Do(ctx, "SET", "foo", "bar")
	if err == nil {
		t.Fatalf("Expected error executing SET in read-only mode, got nil")
	}

	_, err = mock.Do(ctx, "DEL", "system:version")
	if err == nil {
		t.Fatalf("Expected error executing DEL in read-only mode, got nil")
	}

	// Non-mutating command must succeed
	val, err := mock.Do(ctx, "GET", "system:version")
	if err != nil || val != "Valkey 8.0.2-GA" {
		t.Fatalf("Read command failed in read-only mode: %v", err)
	}
}
