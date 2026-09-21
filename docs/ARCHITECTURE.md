# ValkeyLens Architecture

This document describes the technical design, component hierarchy, and communication flows of ValkeyLens.

## Overview

ValkeyLens is packaged as a single static binary. The Go backend handles database connectivity, cursor scanning, memory aggregation, telemetry polling, and safe REPL execution. The React 19 frontend is compiled to static HTML, JavaScript, and CSS, and embedded into the binary at compile time via Go's `embed.FS`.

```
                  +--------------------------------+
                  | Browser Client (localhost)     |
                  +---------------+----------------+
                                  |
               HTTP REST / SSE    |
                                  v
+-----------------------------------------------------------------+
| ValkeyLens Binary (Go)                                          |
|                                                                 |
|   +-----------------------+     +-----------------------------+ |
|   | Static Asset Server   |     | API Gateway & Guard         | |
|   | (embed.FS React 19)   |     | (Read-Only & Command Filter)| |
|   +-----------------------+     +--------------+--------------+ |
|                                                |                |
|       +----------------------------------------+                |
|       |                 |                  |                    |
|       v                 v                  v                    |
|  +---------+      +-----------+      +------------+             |
|  | Scanner |      | Profiler  |      | Telemetry  |             |
|  +----+----+      +-----+-----+      +-----+------+             |
|       |                 |                  |                    |
|       +-----------------+------------------+                    |
|                         |                                       |
|                         v                                       |
|             +-----------------------+                           |
|             | RESP3 Driver Pool     |                           |
|             | (valkey-go / mock)    |                           |
|             +-----------+-----------+                           |
+-------------------------|---------------------------------------+
                          | TCP / TLS
                          v
         +---------------------------------+
         | Valkey 8 / Redis 7 Database     |
         +---------------------------------+
```

## Backend Components

### 1. Client Abstraction (`pkg/client`)
The client layer isolates database network operations behind a common interface:
- **Client Interface**: Defines methods for executing commands, pipeline batches, cursor scans, and connection health pings.
- **Valkey Adapter**: Connects using the RESP3 protocol, handling connection retries, authentication, TLS handshakes, and cluster slot redirection.
- **In-Memory Mock Engine**: An embedded mock database used when running `--demo`. It stores keys in memory and responds to standard commands like `SCAN`, `TYPE`, `MEMORY USAGE`, `XREAD`, `INFO`, and `SLOWLOG`.
- **Command Guard**: Intercepts commands before transmission. Commands matching dangerous patterns (`KEYS *`, `FLUSHALL`, `FLUSHDB`, `SHUTDOWN`, `CONFIG SET`) are rejected or transformed into safe equivalents.

### 2. Keyspace Explorer (`pkg/explorer`)
Responsible for reading and writing keys safely:
- **Scanner**: Issues `SCAN` commands in batches of 250 keys, fetching types (`TYPE`) and expiration times (`PTTL`) asynchronously.
- **Type Handlers**: Reads and modifies data for String, Hash, List, Set, Sorted Set, Stream, and JSON types.
- **Safety**: Modifying requests check the read-only flag before executing.

### 3. Memory Profiler (`pkg/profiler`)
Analyzes keyspace memory distribution without freezing the server:
- **Prefix Radix Tree**: Organizes key names by separators (`:`, `/`, `.`). Each tree node tracks child count, estimated memory usage, and percentage of overall memory.
- **Memory Sampler**: Queries `MEMORY USAGE <key> SAMPLES 5` where supported, falling back to data structure lengths (`STRLEN`, `HLEN`, `LLEN`, `ZCARD`) on older engines.
- **Big Keys Heap**: Maintains a bounded min-heap of the top 100 largest keys discovered during scans.

### 4. Telemetry Monitor (`pkg/telemetry`)
Gathers real-time operational statistics:
- **Poller**: Executes `INFO` at 1Hz, extracting instantaneous operations per second, memory RSS, memory allocation, client counts, and cache hit ratios.
- **Ring Buffer**: Stores the last 300 data points (5 minutes of telemetry) for sparkline charts.
- **Slowlog Streamer**: Monitors `SLOWLOG GET 50`, tracks unseen entries, and broadcasts them over Server-Sent Events.

### 5. REPL Engine (`pkg/repl`)
Provides an interactive command interface:
- **Evaluator**: Parses arguments, validates against safety guards, passes safe commands to the connection pool, and formats the RESP3 response.
- **Syntax Dictionary**: Contains argument definitions and short descriptions for Valkey 8 and Redis 7 commands, enabling autocomplete in the frontend.

## Frontend Components

The user interface is built with React 19, TypeScript, and Tailwind CSS:
- **Navigation Bar**: Displays connection status, active database number, read-only status, and memory summary.
- **Key Browser Sidebar**: Displays a hierarchical folder tree based on key namespaces, with search filtering and type badges.
- **Key Detail Panel**: Provides editors and viewers tailored to the selected key type, including a JSON tree formatter for strings containing JSON payloads.
- **Profiler View**: Interactive SVG TreeMap displaying namespace size distribution, accompanied by the top big keys table.
- **Streams Inspector**: Chronological stream entry viewer, consumer group metrics, and pending entries list (PEL).
- **Telemetry View**: Live charts for ops/sec, memory usage, hit ratio, and connected clients, alongside the live slowlog table.
- **REPL Console**: Browser-based terminal with command history and argument hints.

## Threading and Resource Usage

- **Memory**: The Go process runs with a baseline heap allocation of under 20MB.
- **I/O Overhead**: Cursor scans use configurable batch counts (default 250) and can be paused or throttled to avoid competing with production workloads.
- **Single Process**: HTTP serving and background polling run in lightweight goroutines managed within a single OS process.
