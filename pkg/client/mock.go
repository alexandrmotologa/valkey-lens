package client

import (
	"context"
	"fmt"
	"math/rand"
	"sort"
	"strings"
	"sync"
	"time"
)

type MockKey struct {
	Type        string
	Value       interface{}
	TTL         time.Duration // 0 for no ttl
	CreatedAt   time.Time
	MemoryBytes int64
}

type MockZMember struct {
	Member string  `json:"member"`
	Score  float64 `json:"score"`
}

type MockStreamMessage struct {
	ID        string            `json:"id"`
	Fields    map[string]string `json:"fields"`
	Timestamp time.Time         `json:"timestamp"`
}

type MockConsumerGroup struct {
	Name          string
	Consumers     map[string]time.Time // consumer name -> last seen
	Pending       []MockPendingEntry
	LastDelivered string
}

type MockPendingEntry struct {
	ID            string
	Consumer      string
	IdleTimeMs    int64
	DeliveryCount int64
}

// MockClient implements Client with an in-memory dataset for demo & testing.
type MockClient struct {
	mu           sync.RWMutex
	keys         map[string]*MockKey
	streamGroups map[string]map[string]*MockConsumerGroup // streamKey -> groupName -> group
	slowlogs     []SlowlogRecord
	readOnly     bool
	startTime    time.Time
	opsCount     int64
}

// NewMockClient creates a new mock database seeded with realistic data.
func NewMockClient(readOnly bool) *MockClient {
	m := &MockClient{
		keys:         make(map[string]*MockKey),
		streamGroups: make(map[string]map[string]*MockConsumerGroup),
		slowlogs:     make([]SlowlogRecord, 0),
		readOnly:     readOnly,
		startTime:    time.Now().Add(-2 * time.Hour),
	}
	m.seedData()
	return m
}

func (m *MockClient) IsReadOnly() bool {
	return m.readOnly
}

func (m *MockClient) IsMock() bool {
	return true
}

func (m *MockClient) Close() {
	// No-op for in-memory mock
}

func (m *MockClient) Ping(ctx context.Context) error {
	return nil
}

func (m *MockClient) seedData() {
	// 1. Strings & JSON
	m.setKey("user:profile:1001", "string", `{"id":1001,"username":"alex_m","email":"alex@example.com","tier":"enterprise","created_at":"2025-01-15T08:00:00Z"}`, 86400*time.Second, 184)
	m.setKey("user:profile:1002", "string", `{"id":1002,"username":"elena_v","email":"elena@example.com","tier":"pro","created_at":"2025-02-10T11:30:00Z"}`, 86400*time.Second, 172)
	m.setKey("user:profile:1003", "string", `{"id":1003,"username":"marcus_k","email":"marcus@example.com","tier":"free","created_at":"2025-03-01T15:20:00Z"}`, 43200*time.Second, 168)
	m.setKey("user:session:tok_991823", "string", `{"user_id":1001,"ip":"192.168.1.45","user_agent":"Mozilla/5.0","issued":1726941000}`, 3600*time.Second, 142)
	m.setKey("user:session:tok_882194", "string", `{"user_id":1002,"ip":"10.0.0.12","user_agent":"ValkeyLens/1.0","issued":1726941500}`, 7200*time.Second, 138)
	m.setKey("system:version", "string", "Valkey 8.0.2-GA", 0, 48)
	m.setKey("system:status:health", "string", "healthy", 60*time.Second, 40)

	// 2. Hashes
	userHash := map[string]string{
		"name":        "Alexandr Motologa",
		"role":        "Software Architect",
		"location":    "Chisinau / Remote",
		"github":      "alexandrmotologa",
		"theme":       "dark",
		"notifications": "true",
	}
	m.setKey("settings:user:1001", "hash", userHash, 0, 520)

	prodHash1 := map[string]string{
		"sku":         "VLK-SRV-800",
		"title":       "Valkey Cluster Node Instance",
		"price":       "149.99",
		"stock":       "42",
		"category":    "cloud_infrastructure",
	}
	m.setKey("catalog:product:VLK-SRV-800", "hash", prodHash1, 0, 480)

	prodHash2 := map[string]string{
		"sku":         "RED-MIG-100",
		"title":       "Redis 7 to Valkey 8 Migration Bridge",
		"price":       "299.00",
		"stock":       "15",
		"category":    "tooling",
	}
	m.setKey("catalog:product:RED-MIG-100", "hash", prodHash2, 0, 495)

	// 3. Lists
	jobs := []string{
		"job:sync:inventory:batch_101",
		"job:email:digest:user_482",
		"job:backup:snapshot:valkey_db_0",
		"job:telemetry:aggregate:1m",
	}
	m.setKey("queue:background_workers", "list", jobs, 0, 680)

	recentVisits := []string{
		"192.168.1.100",
		"10.0.1.44",
		"172.16.0.8",
		"192.168.1.25",
	}
	m.setKey("security:recent_logins", "list", recentVisits, 1200*time.Second, 320)

	// 4. Sets
	activeUsers := map[string]struct{}{
		"1001": {},
		"1002": {},
		"1003": {},
		"1004": {},
		"1005": {},
	}
	m.setKey("analytics:daily_active_users", "set", activeUsers, 86400*time.Second, 410)

	featureFlags := map[string]struct{}{
		"vector_search_hnsw": {},
		"async_cluster_migration": {},
		"multi_threaded_io": {},
		"resp3_protocol_strict": {},
	}
	m.setKey("config:features:enabled", "set", featureFlags, 0, 390)

	// 5. Sorted Sets (ZSet)
	leaderboard := []MockZMember{
		{Member: "user:1001", Score: 98450.0},
		{Member: "user:1002", Score: 87300.5},
		{Member: "user:1003", Score: 64120.0},
		{Member: "user:1004", Score: 52900.0},
		{Member: "user:1005", Score: 41800.0},
	}
	m.setKey("leaderboard:global_rankings", "zset", leaderboard, 0, 890)

	latencies := []MockZMember{
		{Member: "node-east-1", Score: 1.24},
		{Member: "node-east-2", Score: 1.85},
		{Member: "node-west-1", Score: 4.12},
		{Member: "node-eu-central", Score: 14.80},
	}
	m.setKey("telemetry:cluster:node_latencies", "zset", latencies, 300*time.Second, 560)

	// 6. Streams
	streamKey := "stream:orders:events"
	now := time.Now()
	streamEvents := []MockStreamMessage{
		{
			ID: fmt.Sprintf("%d-0", now.Add(-10*time.Minute).UnixMilli()),
			Fields: map[string]string{
				"event":    "order_created",
				"order_id": "ord_8819",
				"amount":   "129.50",
				"currency": "USD",
			},
			Timestamp: now.Add(-10 * time.Minute),
		},
		{
			ID: fmt.Sprintf("%d-0", now.Add(-8*time.Minute).UnixMilli()),
			Fields: map[string]string{
				"event":    "payment_captured",
				"order_id": "ord_8819",
				"method":   "stripe_card",
			},
			Timestamp: now.Add(-8 * time.Minute),
		},
		{
			ID: fmt.Sprintf("%d-0", now.Add(-5*time.Minute).UnixMilli()),
			Fields: map[string]string{
				"event":    "inventory_reserved",
				"order_id": "ord_8819",
				"sku":      "VLK-SRV-800",
			},
			Timestamp: now.Add(-5 * time.Minute),
		},
		{
			ID: fmt.Sprintf("%d-0", now.Add(-2*time.Minute).UnixMilli()),
			Fields: map[string]string{
				"event":    "order_created",
				"order_id": "ord_8820",
				"amount":   "299.00",
				"currency": "USD",
			},
			Timestamp: now.Add(-2 * time.Minute),
		},
	}
	m.setKey(streamKey, "stream", streamEvents, 0, 1420)

	// Consumer groups for the stream
	m.streamGroups[streamKey] = map[string]*MockConsumerGroup{
		"inventory_workers": {
			Name: "inventory_workers",
			Consumers: map[string]time.Time{
				"worker-pod-1": now.Add(-30 * time.Second),
				"worker-pod-2": now.Add(-15 * time.Second),
			},
			LastDelivered: streamEvents[2].ID,
			Pending: []MockPendingEntry{
				{
					ID:            streamEvents[2].ID,
					Consumer:      "worker-pod-1",
					IdleTimeMs:    180000,
					DeliveryCount: 2,
				},
			},
		},
		"fraud_detection_group": {
			Name: "fraud_detection_group",
			Consumers: map[string]time.Time{
				"fraud-analyzer-1": now.Add(-10 * time.Second),
			},
			LastDelivered: streamEvents[3].ID,
			Pending:       []MockPendingEntry{},
		},
	}

	// 7. Large Big Key (for BigKey detector test)
	largeData := strings.Repeat("A8F901BC7E", 25000) // ~250KB
	m.setKey("system:big_blob:payload_dump", "string", largeData, 0, 256800)

	// 8. Vector Embeddings (mock JSON/vector format)
	vectorKey := "vector:product:embedding:101"
	vectorData := `{"dimensions":8,"metric":"COSINE","embedding":[0.124,-0.481,0.892,0.015,-0.221,0.741,-0.119,0.308],"indexed":true,"algorithm":"HNSW"}`
	m.setKey(vectorKey, "string", vectorData, 0, 310)

	// 9. Slowlog entries
	m.slowlogs = []SlowlogRecord{
		{
			ID:        1,
			Timestamp: now.Add(-45 * time.Minute),
			Duration:  42 * time.Millisecond,
			Command:   []string{"HGETALL", "catalog:product:VLK-SRV-800"},
			ClientIP:  "10.0.1.18:54210",
		},
		{
			ID:        2,
			Timestamp: now.Add(-12 * time.Minute),
			Duration:  118 * time.Millisecond,
			Command:   []string{"LRANGE", "queue:background_workers", "0", "-1"},
			ClientIP:  "10.0.2.44:38192",
		},
	}
}

func (m *MockClient) setKey(name, keyType string, val interface{}, ttl time.Duration, memBytes int64) {
	m.keys[name] = &MockKey{
		Type:        keyType,
		Value:       val,
		TTL:         ttl,
		CreatedAt:   time.Now(),
		MemoryBytes: memBytes,
	}
}

func (m *MockClient) Do(ctx context.Context, args ...string) (interface{}, error) {
	if len(args) == 0 {
		return nil, nil
	}

	if err := CheckCommand(m.readOnly, args...); err != nil {
		return nil, err
	}

	m.mu.Lock()
	defer m.mu.Unlock()
	m.opsCount++

	cmd := strings.ToUpper(args[0])
	switch cmd {
	case "PING":
		if len(args) > 1 {
			return args[1], nil
		}
		return "PONG", nil

	case "ECHO":
		if len(args) > 1 {
			return args[1], nil
		}
		return "", nil

	case "GET":
		if len(args) < 2 {
			return nil, fmt.Errorf("ERR wrong number of arguments for 'get' command")
		}
		key, ok := m.keys[args[1]]
		if !ok || m.isExpired(key) {
			return nil, nil
		}
		if key.Type != "string" {
			return nil, fmt.Errorf("WRONGTYPE Operation against a key holding the wrong kind of value")
		}
		return key.Value.(string), nil

	case "SET":
		if len(args) < 3 {
			return nil, fmt.Errorf("ERR wrong number of arguments for 'set' command")
		}
		val := args[2]
		var ttl time.Duration = 0
		for i := 3; i < len(args); i++ {
			if strings.ToUpper(args[i]) == "EX" && i+1 < len(args) {
				var sec int
				fmt.Sscanf(args[i+1], "%d", &sec)
				ttl = time.Duration(sec) * time.Second
				i++
			}
		}
		m.keys[args[1]] = &MockKey{
			Type:        "string",
			Value:       val,
			TTL:         ttl,
			CreatedAt:   time.Now(),
			MemoryBytes: int64(len(val) + 48),
		}
		return "OK", nil

	case "DEL":
		if len(args) < 2 {
			return int64(0), nil
		}
		var count int64
		for _, k := range args[1:] {
			if _, ok := m.keys[k]; ok {
				delete(m.keys, k)
				count++
			}
		}
		return count, nil

	case "EXPIRE":
		if len(args) < 3 {
			return int64(0), nil
		}
		key, ok := m.keys[args[1]]
		if !ok || m.isExpired(key) {
			return int64(0), nil
		}
		var sec int
		fmt.Sscanf(args[2], "%d", &sec)
		key.TTL = time.Duration(sec) * time.Second
		key.CreatedAt = time.Now()
		return int64(1), nil

	case "PERSIST":
		if len(args) < 2 {
			return int64(0), nil
		}
		key, ok := m.keys[args[1]]
		if !ok || m.isExpired(key) || key.TTL == 0 {
			return int64(0), nil
		}
		key.TTL = 0
		return int64(1), nil

	case "DBSIZE":
		var count int64
		for _, k := range m.keys {
			if !m.isExpired(k) {
				count++
			}
		}
		return count, nil

	case "HGETALL":
		if len(args) < 2 {
			return nil, fmt.Errorf("ERR wrong number of arguments for 'hgetall' command")
		}
		key, ok := m.keys[args[1]]
		if !ok || m.isExpired(key) {
			return []string{}, nil
		}
		if key.Type != "hash" {
			return nil, fmt.Errorf("WRONGTYPE Operation against a key holding the wrong kind of value")
		}
		h := key.Value.(map[string]string)
		res := make([]string, 0, len(h)*2)
		for k, v := range h {
			res = append(res, k, v)
		}
		return res, nil

	case "LRANGE":
		if len(args) < 4 {
			return nil, fmt.Errorf("ERR wrong number of arguments for 'lrange' command")
		}
		key, ok := m.keys[args[1]]
		if !ok || m.isExpired(key) {
			return []string{}, nil
		}
		if key.Type != "list" {
			return nil, fmt.Errorf("WRONGTYPE Operation against a key holding the wrong kind of value")
		}
		list := key.Value.([]string)
		return list, nil

	case "SMEMBERS":
		if len(args) < 2 {
			return nil, fmt.Errorf("ERR wrong number of arguments for 'smembers' command")
		}
		key, ok := m.keys[args[1]]
		if !ok || m.isExpired(key) {
			return []string{}, nil
		}
		if key.Type != "set" {
			return nil, fmt.Errorf("WRONGTYPE Operation against a key holding the wrong kind of value")
		}
		set := key.Value.(map[string]struct{})
		res := make([]string, 0, len(set))
		for k := range set {
			res = append(res, k)
		}
		return res, nil

	case "ZRANGE":
		if len(args) < 4 {
			return nil, fmt.Errorf("ERR wrong number of arguments for 'zrange' command")
		}
		key, ok := m.keys[args[1]]
		if !ok || m.isExpired(key) {
			return []string{}, nil
		}
		if key.Type != "zset" {
			return nil, fmt.Errorf("WRONGTYPE Operation against a key holding the wrong kind of value")
		}
		zset := key.Value.([]MockZMember)
		res := make([]string, 0, len(zset))
		for _, m := range zset {
			res = append(res, m.Member)
		}
		return res, nil
	}

	return fmt.Sprintf("(mock: %s executed)", cmd), nil
}

func (m *MockClient) isExpired(k *MockKey) bool {
	if k.TTL == 0 {
		return false
	}
	return time.Since(k.CreatedAt) > k.TTL
}

func (m *MockClient) Scan(ctx context.Context, cursor uint64, match string, count int64) (uint64, []string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var allKeys []string
	for k, v := range m.keys {
		if !m.isExpired(v) {
			if match == "" || match == "*" || matchPattern(k, match) {
				allKeys = append(allKeys, k)
			}
		}
	}
	sort.Strings(allKeys)

	if count <= 0 {
		count = 250
	}

	start := int(cursor)
	if start >= len(allKeys) {
		return 0, []string{}, nil
	}

	end := start + int(count)
	var nextCursor uint64 = 0
	if end < len(allKeys) {
		nextCursor = uint64(end)
	} else {
		end = len(allKeys)
	}

	return nextCursor, allKeys[start:end], nil
}

func (m *MockClient) Type(ctx context.Context, key string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	k, ok := m.keys[key]
	if !ok || m.isExpired(k) {
		return "none", nil
	}
	return k.Type, nil
}

func (m *MockClient) PTTL(ctx context.Context, key string) (int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	k, ok := m.keys[key]
	if !ok || m.isExpired(k) {
		return -2, nil
	}
	if k.TTL == 0 {
		return -1, nil
	}
	rem := k.TTL - time.Since(k.CreatedAt)
	if rem <= 0 {
		return -2, nil
	}
	return rem.Milliseconds(), nil
}

func (m *MockClient) MemoryUsage(ctx context.Context, key string, samples int) (int64, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	k, ok := m.keys[key]
	if !ok || m.isExpired(k) {
		return 0, nil
	}
	return k.MemoryBytes, nil
}

func (m *MockClient) Info(ctx context.Context, section string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	uptime := int64(time.Since(m.startTime).Seconds())
	keysCount := len(m.keys)
	var totalMem int64
	for _, k := range m.keys {
		totalMem += k.MemoryBytes
	}
	totalMem += 15 * 1024 * 1024 // Base engine footprint ~15MB

	instantaneousOps := 180 + rand.Int63n(120)

	info := fmt.Sprintf(`# Server
valkey_version:8.0.2
valkey_mode:standalone
os:Linux 6.6.0-generic x86_64
arch_bits:64
multiplexing_api:epoll
process_id:4812
uptime_in_seconds:%d
uptime_in_days:%d
io_threads_active:4

# Clients
connected_clients:18
cluster_connections:0
maxclients:10000
client_recent_max_input_buffer:2
client_recent_max_output_buffer:0
blocked_clients:0

# Memory
used_memory:%d
used_memory_human:%.2fM
used_memory_rss:%d
used_memory_rss_human:%.2fM
used_memory_peak:%d
used_memory_peak_human:%.2fM
mem_fragmentation_ratio:1.14
mem_allocator:jemalloc-5.3.0

# Stats
total_connections_received:4189
total_commands_processed:%d
instantaneous_ops_per_sec:%d
total_net_input_bytes:48129402
total_net_output_bytes:98214819
rejected_connections:0
sync_full:0
sync_partial_ok:0
sync_partial_err:0
expired_keys:412
evicted_keys:0
keyspace_hits:89201
keyspace_misses:4129

# CPU
used_cpu_sys:12.45
used_cpu_user:28.91
used_cpu_sys_children:0.00
used_cpu_user_children:0.00

# Keyspace
db0:keys=%d,expires=8,avg_ttl=3600000
`,
		uptime, uptime/86400,
		totalMem, float64(totalMem)/(1024*1024),
		totalMem+2*1024*1024, float64(totalMem+2*1024*1024)/(1024*1024),
		totalMem+5*1024*1024, float64(totalMem+5*1024*1024)/(1024*1024),
		m.opsCount+84192,
		instantaneousOps,
		keysCount,
	)

	return info, nil
}

func (m *MockClient) SlowlogGet(ctx context.Context, count int64) ([]SlowlogRecord, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if count <= 0 || int(count) > len(m.slowlogs) {
		count = int64(len(m.slowlogs))
	}
	return m.slowlogs[:count], nil
}

// GetKeyDetail retrieves raw key value and metadata for inspector views.
func (m *MockClient) GetKeyDetail(key string) (*MockKey, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	k, ok := m.keys[key]
	if !ok || m.isExpired(k) {
		return nil, ErrKeyNotFound
	}
	return k, nil
}

// GetStreamGroups returns consumer groups associated with a stream.
func (m *MockClient) GetStreamGroups(streamKey string) map[string]*MockConsumerGroup {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.streamGroups[streamKey]
}

func matchPattern(s, pattern string) bool {
	if pattern == "*" {
		return true
	}
	if strings.HasSuffix(pattern, "*") {
		prefix := strings.TrimSuffix(pattern, "*")
		return strings.HasPrefix(s, prefix)
	}
	if strings.HasPrefix(pattern, "*") {
		suffix := strings.TrimPrefix(pattern, "*")
		return strings.HasSuffix(s, suffix)
	}
	return s == pattern
}
