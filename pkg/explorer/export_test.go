package explorer

import (
	"context"
	"strings"
	"testing"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
)

func TestExportScriptAndDuplicate(t *testing.T) {
	mockClient := client.NewMockClient(false)
	scanner := NewScanner(mockClient)
	crud := NewCRUDManager(mockClient)
	exporter := NewScriptExporter(mockClient, scanner, crud)

	ctx := context.Background()

	// Test DuplicateKey
	err := crud.DuplicateKey(ctx, "catalog:product:VLK-SRV-800", "catalog:product:VLK-SRV-CLONE")
	if err != nil {
		t.Fatalf("DuplicateKey failed: %v", err)
	}

	cloneDetail, err := crud.GetKeyDetail(ctx, "catalog:product:VLK-SRV-CLONE")
	if err != nil {
		t.Fatalf("GetKeyDetail for clone failed: %v", err)
	}
	if cloneDetail.Type != "hash" {
		t.Errorf("expected hash clone, got %s", cloneDetail.Type)
	}

	// Test ExportScript
	script, err := exporter.ExportScript(ctx, "*", 50)
	if err != nil {
		t.Fatalf("ExportScript failed: %v", err)
	}

	if !strings.Contains(script, "HSET") {
		t.Errorf("expected script to contain HSET commands")
	}
	if !strings.Contains(script, "catalog:product:VLK-SRV-800") {
		t.Errorf("expected script to contain product key")
	}
}
