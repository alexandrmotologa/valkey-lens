package explorer

import (
	"context"
	"testing"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
)

func TestExplorerScanningAndCRUD(t *testing.T) {
	ctx := context.Background()
	mock := client.NewMockClient(false)
	scanner := NewScanner(mock)
	crud := NewCRUDManager(mock)

	// 1. Test ScanKeys
	resp, err := scanner.ScanKeys(ctx, 0, "user:*", 50)
	if err != nil {
		t.Fatalf("ScanKeys failed: %v", err)
	}
	if len(resp.Keys) == 0 {
		t.Fatalf("Expected scanned keys, got none")
	}
	t.Logf("Found %d user keys", len(resp.Keys))
	for _, k := range resp.Keys {
		if k.Namespace != "user:profile" && k.Namespace != "user:session" {
			t.Errorf("Unexpected namespace %s for key %s", k.Namespace, k.Name)
		}
	}

	// 2. Test GetKeyDetail for String & JSON
	detail, err := crud.GetKeyDetail(ctx, "user:profile:1001")
	if err != nil {
		t.Fatalf("GetKeyDetail failed: %v", err)
	}
	if detail.Type != "string" || !detail.IsJSON {
		t.Errorf("Expected JSON string detail, got type=%s, is_json=%v", detail.Type, detail.IsJSON)
	}

	// 3. Test GetKeyDetail for Hash
	hashDetail, err := crud.GetKeyDetail(ctx, "settings:user:1001")
	if err != nil {
		t.Fatalf("GetKeyDetail hash failed: %v", err)
	}
	if hashDetail.Type != "hash" || hashDetail.Length == 0 {
		t.Errorf("Expected populated hash detail, got %v", hashDetail)
	}

	// 4. Test GetKeyDetail for List
	listDetail, err := crud.GetKeyDetail(ctx, "queue:background_workers")
	if err != nil {
		t.Fatalf("GetKeyDetail list failed: %v", err)
	}
	if listDetail.Type != "list" || listDetail.Length != 4 {
		t.Errorf("Expected 4 list items, got %d", listDetail.Length)
	}

	// 5. Test CRUD: SetString, UpdateTTL, DeleteKey
	newKey := "test:temporary:item"
	if err := crud.SetString(ctx, newKey, "temp_data", 300); err != nil {
		t.Fatalf("SetString failed: %v", err)
	}
	newDetail, err := crud.GetKeyDetail(ctx, newKey)
	if err != nil || newDetail.Value != "temp_data" {
		t.Fatalf("Failed to retrieve newly set key: %v", err)
	}

	if err := crud.UpdateTTL(ctx, newKey, 600); err != nil {
		t.Fatalf("UpdateTTL failed: %v", err)
	}

	if err := crud.DeleteKey(ctx, newKey); err != nil {
		t.Fatalf("DeleteKey failed: %v", err)
	}

	_, err = crud.GetKeyDetail(ctx, newKey)
	if err != client.ErrKeyNotFound {
		t.Errorf("Expected ErrKeyNotFound after deletion, got %v", err)
	}
}

func TestDeleteByPattern(t *testing.T) {
	ctx := context.Background()
	mock := client.NewMockClient(false)
	crud := NewCRUDManager(mock)
	scanner := NewScanner(mock)

	// Create test keys
	crud.SetString(ctx, "temp:purge:1", "val1", 0)
	crud.SetString(ctx, "temp:purge:2", "val2", 0)
	crud.SetString(ctx, "temp:purge:3", "val3", 0)
	crud.SetString(ctx, "keep:me:1", "val4", 0)

	deleted, err := scanner.DeleteByPattern(ctx, "temp:purge:*", 10)
	if err != nil {
		t.Fatalf("DeleteByPattern failed: %v", err)
	}
	if deleted != 3 {
		t.Errorf("Expected 3 deleted keys, got %d", deleted)
	}

	// Ensure keep key is intact
	_, err = crud.GetKeyDetail(ctx, "keep:me:1")
	if err != nil {
		t.Errorf("Expected keep:me:1 to remain, but got err: %v", err)
	}
}
