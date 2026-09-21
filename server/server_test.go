package server

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
	"github.com/alexandrmotologa/valkey-lens/pkg/clients"
	"github.com/alexandrmotologa/valkey-lens/pkg/cluster"
	"github.com/alexandrmotologa/valkey-lens/pkg/explorer"
	"github.com/alexandrmotologa/valkey-lens/pkg/profiler"
	"github.com/alexandrmotologa/valkey-lens/pkg/pubsub"
	"github.com/alexandrmotologa/valkey-lens/pkg/repl"
	"github.com/alexandrmotologa/valkey-lens/pkg/streams"
	"github.com/alexandrmotologa/valkey-lens/pkg/telemetry"
	"github.com/alexandrmotologa/valkey-lens/pkg/traffic"
)

func setupTestServer(readOnly bool) http.Handler {
	cli := client.NewMockClient(readOnly)
	scanner := explorer.NewScanner(cli)
	crud := explorer.NewCRUDManager(cli)
	exporter := explorer.NewScriptExporter(cli, scanner, crud)
	prof := profiler.NewProfiler(cli)
	inspector := streams.NewInspector(cli)
	monitor := telemetry.NewMonitor(cli)
	slowlog := telemetry.NewSlowlogTracker(cli)
	eval := repl.NewEvaluator(cli)
	clientsMgr := clients.NewManager(cli)
	sampler := traffic.NewSampler(cli)
	broker := pubsub.NewBroker(cli)
	clusterRes := cluster.NewResolver(cli)

	monitor.Start(context.Background())

	return NewRouter(RouterConfig{
		Client:    cli,
		Scanner:   scanner,
		CRUD:      crud,
		Exporter:  exporter,
		Profiler:  prof,
		Inspector: inspector,
		Monitor:   monitor,
		Slowlog:   slowlog,
		Evaluator: eval,
		Clients:   clientsMgr,
		Sampler:   sampler,
		Broker:    broker,
		Cluster:   clusterRes,
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

	// 6. Test GET /api/clients
	req = httptest.NewRequest("GET", "/api/clients", nil)
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("GET /api/clients failed with code %d", w.Code)
	}
	var clientList []clients.ClientInfo
	_ = json.NewDecoder(w.Body).Decode(&clientList)
	if len(clientList) == 0 {
		t.Errorf("Expected clients in mock mode, got 0")
	}

	// 7. Test GET /api/cluster/topology
	req = httptest.NewRequest("GET", "/api/cluster/topology", nil)
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("GET /api/cluster/topology failed with code %d", w.Code)
	}
	var topo cluster.TopologyReport
	_ = json.NewDecoder(w.Body).Decode(&topo)
	if len(topo.Nodes) == 0 {
		t.Errorf("Expected cluster nodes in mock topology")
	}

	// 8. Test GET /api/cluster/slot?key=user:{1001}:meta
	req = httptest.NewRequest("GET", "/api/cluster/slot?key=user:{1001}:meta", nil)
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("GET /api/cluster/slot failed with code %d", w.Code)
	}
	var slotRes cluster.SlotLookupResult
	_ = json.NewDecoder(w.Body).Decode(&slotRes)
	if slotRes.HashTag != "1001" {
		t.Errorf("Expected hash_tag 1001, got %s", slotRes.HashTag)
	}

	// 9. Test POST /api/keys/duplicate
	dupPayload := []byte(`{"source":"user:profile:1001","target":"user:profile:clone"}`)
	req = httptest.NewRequest("POST", "/api/keys/duplicate", bytes.NewBuffer(dupPayload))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("POST /api/keys/duplicate failed with code %d", w.Code)
	}

	// 10. Test GET /api/keys/export/script
	req = httptest.NewRequest("GET", "/api/keys/export/script?pattern=user:*", nil)
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("GET /api/keys/export/script failed with code %d", w.Code)
	}
	bodyStr := w.Body.String()
	if !strings.Contains(bodyStr, "# ValkeyLens Dataset Dump") {
		t.Errorf("Exported script missing header comment")
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
