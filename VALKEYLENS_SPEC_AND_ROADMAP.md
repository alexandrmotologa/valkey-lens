# Engineering Specification & Implementation Blueprint: ValkeyLens
> The Next-Gen Valkey 8 & Redis 7+ Observability Studio, Non-Blocking Memory Profiler & Modern Data Workbench

---

## 1. Executive Summary & Market Positioning

### 1.1 The Market Disruption
In 2024, Redis transitioned to a proprietary, non-open-source licensing model (SSPLv1 / RSALv2). In response, the **Linux Foundation**, backed by AWS, Google Cloud, Cloudflare, Oracle, Ericsson, and the core open-source community, established **Valkey** as the official open-source successor. With the release of **Valkey 8.0**, featuring asynchronous cluster architectures, multi-threaded I/O, and advanced memory efficiency, millions of production deployments are actively migrating away from legacy Redis.

### 1.2 The Tooling Crisis
The developer tooling landscape for in-memory databases is severely outdated or paywalled:
* **`redis-commander` (5k+ stars):** Stagnant 2016-era Node.js / Bootstrap 3 application. Fails on large datasets, lacks TLS/Cluster support, executes dangerous blocking commands (`KEYS *`) that cause latency spikes in production, and has zero support for Valkey 8, RESP3, Streams, or Vector search.
* **`Redis Desktop Manager (RDM)`:** Abandoned open source; transformed into a commercial closed-source subscription application (`Resp.app`).
* **`AnotherRedisDesktopManager (ARDM)`:** Heavyweight 250MB Electron application with high idle memory, sluggish rendering on millions of keys, and no native memory profiling.
* **`Medis`:** Proprietary macOS-only paid utility.

### 1.3 The Solution: ValkeyLens
**ValkeyLens** is a high-performance, single-binary, local-first management studio and memory observability engine built specifically for **Valkey 8 & Redis 7+**.

* **Zero-Install Single Binary:** Written in **Go** (with an embedded, ultra-fast modern frontend compiled via `embed.FS`). Consumes <25MB RAM, starts in milliseconds, and requires zero external runtimes (no Node.js, Python, or Electron).
* **Production-Safe Non-Blocking Scanning:** Employs asynchronous, cursor-based `SCAN` pipelining with built-in execution guards that intercept and prevent destructive or blocking commands (`FLUSHALL`, `KEYS *`).
* **Visual Memory Profiler & Big Keys Analyzer:** Deconstructs memory usage across key namespaces (`user:*`, `cache:*`, `session:*`) into interactive tree maps and flame graphs without stopping the server.
* **First-Class Stream & Consumer Group Inspector:** Live real-time inspection of Redis/Valkey Streams (`XADD`, `XREADGROUP`, PEL - Pending Entries List, ACK latency).
* **Vector & JSON Workbench:** Native querying and visualization for vector embeddings (`FT.SEARCH`, similarity distances) and structured JSON documents (`JSON.GET`, `JSON.SET`).
* **Interactive Live REPL:** Full syntax-highlighted console with command autocompletion, parameter hints, and RESP3 multi-type rendering.

---

## 2. Core Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ValkeyLens Architecture                        │
└─────────────────────────────────────────────────────────────────────────┘

[ Web Browser / Local Desktop Client ] (http://localhost:63790)
              │
              ▼  (HTTP REST / Server-Sent Events / WebSockets)
[ ValkeyLens Single Binary ] (Go 1.23+ Engine)
  ├── Static Asset Server: go:embed (Vite + React 19 + Monaco Editor)
  ├── API Gateway & Security Interceptor
  │     ├── Read-Only Mode Guard
  │     ├── Protected Command Interceptor (Blocks dangerous KEYS *, FLUSHALL)
  │     └── Rate-Limited Asynchronous Worker Pool
  ├── Storage & Driver Abstraction
  │     ├── Valkey 8 / Redis 7 Connection Pool (valkey-go / rueidis)
  │     ├── RESP3 Protocol Engine & Pipeline Batcher
  │     └── Cluster & Sentinel Topology Resolver
  └── Core Modules
        ├── Key Space Explorer (Cursor SCAN, Pattern Filter, TTL Manager)
        ├── Non-Blocking Memory Profiler (Sampling, Serialized Lengths, Prefix Tree)
        ├── Stream & Consumer Group Engine (PEL, Lag Calculation, Event Stream)
        ├── Telemetry & Slowlog Monitor (INFO parsing, CPU/RAM, Ops/sec, Slowlog)
        └── Embedded REPL Engine (Interactive CLI, Autocomplete, History)
              │
              ▼ (TCP / TLS / Unix Socket)
[ Valkey 8.x / Redis 7.x / Dragonfly / KeyDB Instance or Cluster ]
```

### 2.1 Backend Technology
* **Language:** Go 1.23+
* **Driver:** `github.com/valkey-io/valkey-go` (Official Linux Foundation driver) or `github.com/redis/rueidis` (ultra-high-performance auto-pipelining RESP3 client).
* **Web Framework:** Minimalist HTTP routing via `net/http` + `chi` (lightweight, zero reflection overhead).
* **Real-Time Transport:** WebSockets (`nhooyr.io/websocket` or Server-Sent Events) for live stream tailing, slowlog alerts, and telemetry graphs.
* **Packaging:** Single static binary with embedded static files via `//go:embed dist/*`.

### 2.2 Frontend Technology
* **Core:** Vite + React 19 + TypeScript.
* **Styling:** Tailwind CSS + custom glassmorphic dark/light tokens (no bulky component UI kits; custom ultra-responsive layouts).
* **Code/Query Editor:** Monaco Editor or `@codemirror/lang-json` for JSON/REPL editing.
* **Visualization:** Custom SVG canvas / Lightweight D3 hierarchy for Memory TreeMaps and prefix flame charts.

---

## 3. Key Feature Specifications

### 3.1 Production Safety Guard
* **The Problem:** In production, accidental execution of `KEYS *` or `FLUSHALL` blocks single-threaded Redis/Valkey engines, triggering cascade outages.
* **The Invariant:** ValkeyLens **strictly enforces non-blocking cursor-based scanning** (`SCAN`, `SSCAN`, `HSCAN`, `ZSCAN`).
* **Command Interceptor:** 
  * Replaces `KEYS <pattern>` transparently with streaming `SCAN` matching the pattern.
  * In **Read-Only Mode** (`--read-only`), all mutating commands (`SET`, `DEL`, `FLUSHDB`, `CONFIG SET`, etc.) are intercepted at the gateway level.
  * Dangerous actions in UI (e.g. key deletion or flush) require explicit two-factor phrase typing ("CONFIRM FLUSH").

### 3.2 Non-Blocking Memory Profiler & Big Key Analyzer
* **Namespace Aggregation:** Automatically groups keys by common delimiters (`:`, `/`, `.`, `-`).
  * Example: `session:user:123`, `session:user:456` ➔ group `session:user:*`.
* **Memory Estimation:**
  * Uses `MEMORY USAGE <key>` (with `SAMPLES 0` or controlled sample sizes) where supported.
  * Fallback to type-specific length calculations (`STRLEN`, `HLEN`, `LLEN`, `ZCARD`, `XLEN`).
* **Visual Hierarchy:**
  * Interactive **TreeMap** showing which namespaces consume the largest percentage of server RAM (e.g., *72% memory used by `cache:products:*`*).
  * **Big Keys Top 100:** Real-time list of top memory-consuming keys with byte count and expiration status.

### 3.3 Stream & Consumer Group Inspector
* Visual inspector for Valkey/Redis Streams:
  * **Timeline View:** Chronological sequence of stream entries (`entry_id`, fields, values).
  * **Consumer Groups Overview:** Lists all groups on the stream, showing total consumers, pending messages (PEL count), and last delivered ID.
  * **Dead Letter / Pending Inspector:** Inspect unacknowledged messages, consumer ownership, and idle time before retrying (`XCLAIM`).

### 3.4 Vector Search & JSON Workbench
* **JSON Documents:** Formats `ReJSON` / Valkey JSON with collapsible tree view, schema validation, in-place editing, and JSONPath querying.
* **Vector Embeddings:** First-class inspection for vector fields:
  * Displays vector dimensions, index algorithm (HNSW / Flat), and metric type (Cosine, L2, IP).
  * Interactive vector query tester: run nearest-neighbor similarity searches directly from the UI.

### 3.5 Live Telemetry, Latency & Slowlog Monitor
* Real-time metrics streaming at 1Hz (via SSE/WebSocket):
  * Ops/sec throughput, connected clients, memory RSS vs. allocated, hit/miss ratio, network I/O.
* **Slowlog Dashboard:** Captures slow execution events in real time, showing exact execution duration (μs), command string, client IP, and timestamp.

### 3.6 Embedded Web REPL
* Full-featured terminal interface in the browser:
  * Command auto-completion matching all Valkey 8 & Redis 7 commands.
  * Parameter syntax hints (e.g., `SET key value [NX|XX] [GET] [EX seconds]`).
  * RESP3-aware rendering: distinguishes between strings, integers, maps, sets, booleans, and nulls with syntax colors.
  * Persistent command history across sessions.

---

## 4. CLI Command-Line Specification

```bash
# Launch ValkeyLens connected to local instance (default: 127.0.0.1:6379)
valkeylens

# Launch connecting to a specific remote Valkey server with authentication
valkeylens -u "valkey://:my_password@prod-cache.internal:6379/0"

# Launch in strict Read-Only mode for production auditing
valkeylens -u "redis://prod-db:6379" --read-only --port 8080

# Launch with TLS and custom CA certificates
valkeylens -u "valkeys://cache.cloud:6380" --tls-ca /certs/ca.pem

# Connect to a Valkey / Redis Cluster
valkeylens --cluster --nodes "node1:6379,node2:6379,node3:6379"

# Headless CLI Memory Scan & Export (CI/CD audit mode)
valkeylens audit -u "valkey://127.0.0.1:6379" --export report.json --top 50
```

### CLI Arguments Matrix
| Flag | Short | Default | Description |
| :--- | :--- | :--- | :--- |
| `--url` | `-u` | `valkey://127.0.0.1:6379` | Server connection URL (`valkey://`, `redis://`, `valkeys://`) |
| `--port` | `-p` | `63790` | Local web server port |
| `--host` | `-h` | `127.0.0.1` | Local web server bind address |
| `--read-only` | `-r` | `false` | Disable all mutating operations |
| `--cluster` | | `false` | Enable Cluster mode discovery |
| `--tls-ca` | | `""` | Path to TLS Certificate Authority file |
| `--no-browser` | | `false` | Do not automatically open browser on startup |
| `--version` | `-v` | | Print version and build metadata |

---

## 5. Repository File Structure

```
valkey-lens/
├── go.mod
├── go.sum
├── main.go                       # Application entrypoint & CLI bootstrap
├── Makefile                      # Build scripts (frontend + backend embed)
├── README.md
├── LICENSE
├── cmd/
│   ├── root.go                   # Cobra CLI commands & flags
│   ├── server.go                 # HTTP server lifecycle & browser opener
│   └── audit.go                  # Headless memory audit command
├── pkg/
│   ├── client/                   # In-memory database client abstraction
│   │   ├── client.go             # Generic Client interface
│   │   ├── valkey.go             # valkey-go / rueidis adapter
│   │   ├── cluster.go            # Cluster topology & routing
│   │   └── guard.go              # Protected command interceptor & read-only rules
│   ├── explorer/                 # Keyspace inspection & operations
│   │   ├── scanner.go            # Cursor SCAN with pattern filter & batching
│   │   ├── types.go              # Type resolution (String, Hash, List, Set, ZSet, Stream, JSON)
│   │   └── crud.go               # Safe get/set/delete/ttl operations
│   ├── profiler/                 # Memory & namespace analysis
│   │   ├── prefix_tree.go        # Namespace separator radix tree
│   │   ├── memory.go             # MEMORY USAGE sampling & estimation
│   │   └── bigkeys.go            # Top keys memory ranking engine
│   ├── streams/                  # Redis/Valkey Streams
│   │   ├── inspector.go          # XRANGE/XREVRANGE reader
│   │   └── consumer_groups.go    # XINFO GROUPS, XINFO CONSUMERS, XPENDING
│   ├── telemetry/                # Real-time server telemetry
│   │   ├── monitor.go            # INFO parsing & time-series circular buffer
│   │   └── slowlog.go            # SLOWLOG polling & pub/sub streaming
│   └── repl/                     # Embedded interactive console
│       ├── evaluator.go          # Command parser & executor
│       └── syntax.go             # Command definitions & parameter schema
├── server/
│   ├── router.go                 # Chi router & HTTP handlers setup
│   ├── handlers/
│   │   ├── keys_handler.go       # Keys API (/api/keys)
│   │   ├── memory_handler.go     # Memory Profiler API (/api/memory)
│   │   ├── streams_handler.go    # Streams API (/api/streams)
│   │   ├── telemetry_handler.go  # Live metrics SSE/WS (/api/telemetry)
│   │   └── repl_handler.go       # REPL execution API (/api/repl)
│   ├── middleware/
│   │   ├── readonly.go           # Intercepts mutating requests
│   │   └── security.go           # Localhost binding & header sanitization
│   └── static.go                 # go:embed static file server
├── ui/                           # Modern Frontend Application (Vite + React 19)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx               # Main layout & navigation
│       ├── api/                  # Typed fetch client & WebSocket hooks
│       ├── components/
│       │   ├── Navbar.tsx        # Server status, quick search, connection badge
│       │   ├── KeyTree/          # Namespace tree & key list
│       │   ├── KeyDetail/        # Universal value viewers & editors
│       │   │   ├── StringView.tsx
│       │   │   ├── HashView.tsx
│       │   │   ├── ListView.tsx
│       │   │   ├── SetView.tsx
│       │   │   ├── ZSetView.tsx
│       │   │   ├── StreamView.tsx
│       │   │   └── JsonView.tsx
│       │   ├── Profiler/         # Memory TreeMap & Big Keys list
│       │   ├── Streams/          # Consumer groups & pending entries inspector
│       │   ├── Telemetry/        # Live charts (ops/sec, RAM, hit ratio)
│       │   └── REPL/             # Interactive web terminal console
│       └── styles/
│           └── globals.css       # Tailwind tokens & dark/light variables
└── tests/
    ├── scanner_test.go           # Safe non-blocking scan tests
    ├── profiler_test.go          # Prefix grouping & memory estimation tests
    ├── guard_test.go            # Read-only and destructive command blocker tests
    └── streams_test.go           # Stream parsing & PEL calculation tests
```

---

## 6. Step-by-Step Implementation Roadmap

### Phase 1: Core Engine & Client Abstraction
1. Initialize Go module: `go mod init github.com/alexandrmotologa/valkey-lens`.
2. Implement `pkg/client`:
   * Connect to Valkey 8 / Redis 7 using `valkey-go` or `rueidis`.
   * Implement connection health checks, automatic reconnects, and TLS configuration.
   * Build `pkg/client/guard.go`: Create command blacklist/interceptor that rejects `KEYS *`, `FLUSHALL`, `FLUSHDB`, `SHUTDOWN`, and `CONFIG` unless explicitly unlocked or in safe mode.
3. Unit test client connectivity and command interception with a local or containerized Valkey instance.

### Phase 2: Non-Blocking Keyspace Explorer & Universal Viewers
1. Build `pkg/explorer/scanner.go`:
   * Asynchronous `SCAN` cursor loop with configurable chunk size (default: 250 keys per batch).
   * Pattern filtering (`--pattern "user:*"`).
   * Type detection (`TYPE key`) and TTL retrieval (`PTTL key`).
2. Build `pkg/explorer/crud.go`:
   * Safe read/write handlers for all major data structures:
     * **String:** Text, binary hex, JSON auto-detection.
     * **Hash:** Paginated `HSCAN`, field search, add/edit/remove fields.
     * **List:** `LRANGE`, index edits, push/pop.
     * **Set & ZSet:** `SSCAN`, `ZSCAN` with score editing.
     * **JSON:** `JSON.GET` / `JSON.SET` support with formatted views.
3. Expose REST endpoints in `server/handlers/keys_handler.go`.

### Phase 3: Memory Profiler & Big Key Analyzer
1. Implement `pkg/profiler/prefix_tree.go`:
   * Radix tree to aggregate keys by delimiter (`:`, `/`, `.`).
   * Calculate aggregated key count, estimated memory usage, and percentage of total dataset per prefix.
2. Implement `pkg/profiler/bigkeys.go`:
   * Sample keyspace using non-blocking scans.
   * Query `MEMORY USAGE <key> SAMPLES 5` (where supported) or approximate length.
   * Maintain top 100 big keys priority queue.
3. Build the Memory TreeMap and prefix breakdown endpoints.

### Phase 4: Stream & Consumer Group Inspector
1. Implement `pkg/streams`:
   * Stream tailing using `XREVRANGE` and `XRANGE`.
   * Parse `XINFO GROUPS <stream>`: extract consumer count, pending count, last-delivered-id.
   * Parse `XINFO CONSUMERS <stream> <group>`: track individual consumer lag and idle time.
   * Query `XPENDING <stream> <group>`: inspect unacknowledged messages.
2. Build UI Stream timeline and Consumer Group lag monitor.

### Phase 5: Live Observability, Telemetry & Web REPL
1. Implement `pkg/telemetry`:
   * Poll `INFO` at 1Hz; extract:
     * `instantaneous_ops_per_sec`
     * `used_memory`, `used_memory_rss`, `mem_fragmentation_ratio`
     * `connected_clients`, `blocked_clients`
     * `keyspace_hits`, `keyspace_misses`
   * Poll `SLOWLOG GET 50`; detect new slow commands and push alerts over Server-Sent Events.
2. Implement `pkg/repl`:
   * Execute raw commands through the client pool with safety guards.
   * Format responses cleanly (RESP3 types, tables, nested lists).
   * Autocomplete engine with command definitions.

### Phase 6: Frontend Development, Single-Binary Packaging & CI/CD
1. Build Frontend in `ui/`:
   * Modern, responsive layout with dark/light themes.
   * Key Browser sidebar with search and folder tree.
   * Detail view with Monaco editor for strings/JSON and interactive tables for hashes/lists/sets.
   * Memory Profiler dashboard with interactive visual TreeMap.
   * Live Telemetry charts and Slowlog stream.
   * Embedded web REPL terminal panel.
2. Single-binary embedding:
   * Configure `Makefile`: `npm --prefix ui run build && go build -o bin/valkeylens`.
   * Embed `ui/dist` via `//go:embed dist/*` in `server/static.go`.
3. Produce multi-platform binaries:
   * Windows (`valkeylens.exe`), macOS (`arm64` / `amd64`), Linux (`amd64` / `arm64`).

---

## 7. Verification & Acceptance Criteria

### Automated Tests
* **Connection Tests:** Validate authentication, TLS, and automatic reconnection on connection drops.
* **Safety Guard Tests:** Assert that attempting to execute `KEYS *` returns a guarded error or rewrites to `SCAN`. Assert that in `--read-only` mode, any `SET` or `DEL` fails with HTTP 403.
* **Scan & Pagination Tests:** Populate 50,000 keys and verify cursor pagination traverses all keys without duplicates or omissions.
* **Memory Profiler Tests:** Populate structured keys (`user:1:profile`, `user:2:profile`, `order:100`) and verify prefix tree aggregates memory accurately.
* **Single Binary Test:** Ensure the compiled binary runs independently on a clean machine without requiring Node, npm, or external web assets.

### Manual Verification
1. Launch local Valkey instance:
   ```bash
   docker run -d -p 6379:6379 valkey/valkey:8.0
   ```
2. Run ValkeyLens:
   ```bash
   ./valkeylens
   ```
3. Open `http://localhost:63790`:
   * Verify instant connection status.
   * Create, edit, and delete keys across all data types (String, Hash, List, Set, ZSet, Stream).
   * Run Memory Profiler: observe interactive namespace TreeMap.
   * Open Web REPL: execute `PING`, `INFO`, `SCAN 0`, test tab autocompletion.
   * Check Telemetry: confirm live ops/sec and memory graphs update every second.
