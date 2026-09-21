<p align="center">
  <img src="docs/images/logo.png?raw=true" alt="ValkeyLens Logo" width="130" style="border-radius: 24px;" />
</p>

<h1 align="center">ValkeyLens</h1>

<p align="center">
  <a href="https://github.com/alexandrmotologa/valkey-lens/releases"><img src="https://img.shields.io/github/v/release/alexandrmotologa/valkey-lens?color=0284c7&label=Release" alt="Release" /></a>
  <a href="https://golang.org"><img src="https://img.shields.io/badge/Go-1.23+-00ADD8?logo=go&logoColor=white" alt="Go Version" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" /></a>
  <a href="https://valkey.io"><img src="https://img.shields.io/badge/Engine-Valkey%208%20%7C%20Redis%207+-00f5ff" alt="Engine" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-slate" alt="License" /></a>
</p>

ValkeyLens is a single-binary management studio, non-blocking memory profiler, and data workbench built for Valkey 8 and Redis 7+. It compiles an embedded React 19 interface directly into a self-contained Go executable, using under 25MB of RAM at idle and requiring no external runtimes.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ValkeyLens Architecture                        │
└─────────────────────────────────────────────────────────────────────────┘

[ Web Browser / Local Desktop Client ] (http://localhost:63790)
              │
              ▼  (HTTP REST / Server-Sent Events / WebSockets)
[ ValkeyLens Single Binary ] (Go 1.23+ Engine)
  ├── Static Asset Server: go:embed (Vite + React 19 + Monaco / CodeMirror)
  ├── API Gateway & Safety Interceptor
  │     ├── Read-Only Mode Guard (--read-only)
  │     ├── Command Interceptor (Blocks dangerous KEYS *, FLUSHALL, FLUSHDB)
  │     └── Rate-Limited Asynchronous Worker Pool
  ├── Storage & Driver Abstraction
  │     ├── Valkey 8 / Redis 7 Connection Pool (valkey-go / rueidis)
  │     ├── Embedded In-Memory Mock Engine (--demo)
  │     ├── RESP3 Protocol Engine & Pipeline Batcher
  │     └── Cluster & Sentinel Topology Resolver
  └── Core Modules
        ├── Key Space Explorer (Cursor SCAN, Pattern Filter, TTL Manager)
        ├── Non-Blocking Memory Profiler (Sampling, Radix Tree, Big Keys Heap)
        ├── Stream & Consumer Group Engine (PEL, Lag Calculation, Event Stream)
        ├── Telemetry & Slowlog Monitor (INFO parsing, CPU/RAM, Ops/sec, Slowlog)
        └── Embedded REPL Engine (Interactive CLI, Autocomplete, History)
              │
              ▼ (TCP / TLS / Unix Socket)
[ Valkey 8.x / Redis 7.x / Dragonfly / KeyDB Instance or Cluster ]
```

## Studio Tour

<p align="center">
  <img src="docs/images/valkeylens_demo.gif?raw=true" alt="ValkeyLens Management Studio Demo" width="880" style="border-radius: 12px; border: 1px solid #1e293b;" />
</p>

### Keyspace Explorer & Global Command Palette (Ctrl+K)

<p align="center">
  <img src="docs/images/screenshot_dashboard.png?raw=true" alt="ValkeyLens Keyspace Explorer" width="435" />
  &nbsp;
  <img src="docs/images/screenshot_command_palette.png?raw=true" alt="ValkeyLens Command Palette" width="435" />
</p>

### Memory Profiler & Automated Advisor & Traffic Sampler

<p align="center">
  <img src="docs/images/screenshot_memory_profiler.png?raw=true" alt="ValkeyLens Memory Profiler & Advisor" width="435" />
  &nbsp;
  <img src="docs/images/screenshot_traffic.png?raw=true" alt="ValkeyLens Safe Traffic Sampler" width="435" />
</p>

### Client Manager & Live Pub/Sub Sniffer

<p align="center">
  <img src="docs/images/screenshot_clients.png?raw=true" alt="ValkeyLens Client Manager" width="435" />
  &nbsp;
  <img src="docs/images/screenshot_pubsub.png?raw=true" alt="ValkeyLens Pub/Sub Sniffer" width="435" />
</p>

### Cluster Topology & 16,384 Hash Slot Visualizer

<p align="center">
  <img src="docs/images/screenshot_cluster.png?raw=true" alt="ValkeyLens Cluster Topology Map" width="880" style="border-radius: 12px; border: 1px solid #1e293b;" />
</p>

### Stream PEL Inspector & Live 1Hz Telemetry

<p align="center">
  <img src="docs/images/screenshot_streams.png?raw=true" alt="ValkeyLens Stream Inspector" width="435" />
  &nbsp;
  <img src="docs/images/screenshot_telemetry.png?raw=true" alt="ValkeyLens Live Telemetry Monitor" width="435" />
</p>

### Interactive Web REPL Terminal

<p align="center">
  <img src="docs/images/screenshot_repl.png?raw=true" alt="ValkeyLens Web REPL Terminal" width="880" style="border-radius: 12px; border: 1px solid #1e293b;" />
</p>

## Features

- **Safe non-blocking scans**: Uses cursor-based `SCAN` pipelining to browse keys. Commands like `KEYS *`, `FLUSHALL`, and `FLUSHDB` are intercepted and blocked or replaced with streaming scans.
- **Global Command Palette (`Ctrl+K` / `Cmd+K`)**: Instant keyboard-driven navigation across all 9 studio views, quick actions for key creation, memory audits, traffic sampling, and REPL commands.
- **Visual memory profiler & Big Keys**: Aggregates keys into namespace trees using configurable delimiters (`:`, `/`, `.`). Identifies which prefixes occupy the most RAM without stalling the server, plus ranks the Top 100 biggest keys.
- **Automated Memory Optimization Advisor**: Analyzes keyspace heuristics to surface memory leaks, large uncompressed strings, missing TTLs, and idle caches with copyable one-click CLI remediation fixes.
- **Safe Throttled Traffic Sampler**: Bounded `MONITOR` session with guaranteed auto-kill timeouts and count limits. Automatically classifies commands into `READ`, `WRITE`, `SCAN`, and `ADMIN` categories and identifies real-time Hot Keys.
- **Client Connection Manager**: Real-time client inspection parsing `CLIENT LIST`, monitoring input/output buffer memory bloat, idle times, and enabling targeted `CLIENT KILL` with safety confirmations.
- **Pub/Sub Live Sniffer & Dispatcher**: Live streaming of published messages over Server-Sent Events across channels and patterns, coupled with an interactive message dispatcher.
- **Cluster Topology & 16,384 Hash Slot Visualizer**: Visualizes shard distribution, master-replica hierarchies, and includes a real-time CRC16 `{hash_tag}` slot calculator.
- **Interactive JSON Tree Viewer**: Expandable and collapsible tree visualization for structured JSON documents with JSONPath searching, data type badges, and sub-tree copying.
- **Key Duplication & `.redis` CLI Exporter**: One-click key cloning with preserved TTLs, plus bulk export of matched keyspaces into pipeline-ready `.redis` CLI scripts.
- **Stream inspector**: Inspects Valkey/Redis Streams, consumer groups, pending entries (PEL), and consumer lag in real time.
- **Live telemetry & Slowlog Analyzer**: Streams instantaneous ops/sec, memory fragmentation, client counts, and real-time slow log entries over Server-Sent Events at 1Hz.
- **Web REPL**: An in-browser terminal with RESP3 syntax coloring, command autocomplete, and parameter hints.
- **Demo mode**: Run `valkeylens --demo` to test drive the entire studio with pre-seeded datasets without connecting to an external server.
- **Headless memory audit**: Audit remote keyspaces in CI/CD pipelines and export structured JSON or self-contained HTML reports.

## Installation

### Pre-built binaries

Download the latest release for your platform from the [GitHub Releases](https://github.com/alexandrmotologa/valkey-lens/releases) page:

- Linux (`x86_64`, `arm64`)
- macOS (`Apple Silicon`, `Intel`)
- Windows (`x86_64`)

### Go install

```bash
go install github.com/alexandrmotologa/valkey-lens@latest
```

### Build from source

Prerequisites: Go 1.23+ and Node.js 20+.

```bash
git clone https://github.com/alexandrmotologa/valkey-lens.git
cd valkey-lens
make build
./bin/valkeylens
```

## Quick Start

Start ValkeyLens connected to a local Valkey or Redis instance:

```bash
valkeylens
```

Start in demo mode with sample data:

```bash
valkeylens --demo
```

Connect to a remote server with password authentication:

```bash
valkeylens -u "valkey://:secret@cache.internal:6379/0"
```

Connect to a cluster:

```bash
valkeylens --cluster --nodes "node1:6379,node2:6379,node3:6379"
```

Start in read-only mode on a custom port:

```bash
valkeylens -u "redis://prod-db:6379" --read-only --port 8080
```

Run a headless memory audit and export the results:

```bash
valkeylens audit -u "valkey://127.0.0.1:6379" --export report.json --top 50
```

## Command Line Options

| Flag | Short | Default | Description |
| :--- | :--- | :--- | :--- |
| `--url` | `-u` | `valkey://127.0.0.1:6379` | Server connection URL (`valkey://`, `redis://`, `valkeys://`) |
| `--port` | `-p` | `63790` | Web server port |
| `--host` | `-h` | `127.0.0.1` | Web server bind address |
| `--read-only` | `-r` | `false` | Block mutating commands (`SET`, `DEL`, `FLUSHDB`) |
| `--demo` | | `false` | Launch with embedded mock database and sample datasets |
| `--cluster` | | `false` | Enable cluster mode discovery |
| `--nodes` | | `""` | Comma-separated list of cluster seed nodes |
| `--tls-ca` | | `""` | Path to custom TLS CA certificate file |
| `--no-browser` | | `false` | Skip opening default browser on startup |
| `--version` | `-v` | | Print version and build information |

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Memory Profiling Algorithm](docs/MEMORY_PROFILING.md)
- [Production Safety & Guard Rules](docs/PRODUCTION_SAFETY.md)
- [Streams & Consumer Groups](docs/STREAMS_AND_CONSUMER_GROUPS.md)
- [REPL & Headless CLI Audit](docs/REPL_AND_CLI.md)

## License

MIT License. See [LICENSE](LICENSE) for details.
