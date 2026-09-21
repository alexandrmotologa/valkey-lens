package server

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
	"github.com/alexandrmotologa/valkey-lens/pkg/explorer"
	"github.com/alexandrmotologa/valkey-lens/pkg/profiler"
	"github.com/alexandrmotologa/valkey-lens/pkg/repl"
	"github.com/alexandrmotologa/valkey-lens/pkg/streams"
	"github.com/alexandrmotologa/valkey-lens/pkg/telemetry"
)

func setupTestServer(readOnly bool) http.Handler {
	cli := client.NewMockClient(readOnly)
	scanner := explorer.NewScanner(cli)
	crud := explorer.NewCRUDManager(cli)
	prof := profiler.NewProfiler(cli)
	inspector := streams.NewInspector(cli)
	monitor := telemetry.NewMonitor(cli)
	slowlog := telemetry.NewSlowlogTracker(cli)
	eval := repl.NewEvaluator(cli)

	monitor.Start(context.Background())

	return NewRouter(RouterConfig{
		Client:    cli,
		Scanner:   scanner,
		CRUD:      crud,
		Profiler:  prof,
		Inspector: inspector,
		Monitor:   monitor,
		Slowlog:   slowlog,
		Evaluator: eval,
		AssetFS:   nil,
		Version:   "0.1.0-test",
		Options: client.Options{
			URL:      "demo://in-memory",
			ReadOnly: readOnly,
		},
	})
}

func TestServerEndpoints(t *testing.T) {
	handler := setupTestServer(false)

	// 1. Test GET /api/system/info
	req := httptest.NewRequest("GET", "/api/system/info", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("GET /api/system/info failed with code %d", w.Code)
	}

	var info map[string]interface{}
	_ = json.NewDecoder(w.Body).Decode(&info)
	if info["version"] != "0.1.0-test" || info["is_demo"] != true {
		t.Errorf("Unexpected system info: %v", info)
	}

	// 2. Test GET /api/keys
	req = httptest.NewRequest("GET", "/api/keys?pattern=user:*", nil)
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("GET /api/keys failed with code %d", w.Code)
	}

	var scanResp explorer.ScanResponse
	_ = json.NewDecoder(w.Body).Decode(&scanResp)
	if len(scanResp.Keys) == 0 {
		t.Errorf("Expected keys matching user:*, got 0")
	}

	// 3. Test GET /api/keys/detail
	req = httptest.NewRequest("GET", "/api/keys/detail?key=user:profile:1001", nil)
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("GET /api/keys/detail failed with code %d", w.Code)
	}

	// 4. Test GET /api/memory/profile
	req = httptest.NewRequest("GET", "/api/memory/profile?limit=50", nil)
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("GET /api/memory/profile failed with code %d", w.Code)
	}

	// 5. Test POST /api/repl/exec
	payload := []byte(`{"command":"PING"}`)
	req = httptest.NewRequest("POST", "/api/repl/exec", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("POST /api/repl/exec failed with code %d", w.Code)
	}
	var replRes repl.ExecutionResult
	_ = json.NewDecoder(w.Body).Decode(&replRes)
	if replRes.Formatted != "\"PONG\"" {
		t.Errorf("Expected PONG from REPL, got %s", replRes.Formatted)
	}
}

func TestServerReadOnlyGuard(t *testing.T) {
	handler := setupTestServer(true) // ReadOnly enabled

	payload := []byte(`{"key":"test:mutation","value":"val"}`)
	req := httptest.NewRequest("POST", "/api/keys/set", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("Expected HTTP 403 Forbidden for mutating POST in read-only mode, got %d", w.Code)
	}
}
