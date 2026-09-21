# Memory Profiling Algorithm & Big Keys Engine

This document explains how ValkeyLens analyzes memory consumption across keyspaces without blocking database operations.

## The Problem with Traditional Analysis

Standard approaches to memory analysis in Redis and Valkey often cause latency spikes:
- `KEYS *` traverses the entire keyspace in a single thread, stopping all other client queries until finished.
- Running `DEBUG OBJECT <key>` on every key creates high computational overhead.
- Offline RDB analysis requires downloading and parsing multi-gigabyte snapshot files, which does not reflect real-time live memory states.

ValkeyLens avoids these issues by combining cursor-based `SCAN` pipelining, non-blocking `MEMORY USAGE` sampling, and radix prefix aggregation.

## Prefix Radix Tree Aggregation

Keys in key-value stores typically follow hierarchical naming conventions:
- `user:profile:1001`
- `user:profile:1002`
- `cache:catalog:items`
- `orders/2026/09/tx_482`

ValkeyLens splits keys by common delimiters (`:`, `/`, `.`, `-`) and constructs a prefix radix tree.

```
(root)
  ├── user: [count: 14,200, bytes: 48.2 MB, 41%]
  │     ├── profile: [count: 10,000, bytes: 32.1 MB]
  │     └── session: [count: 4,200, bytes: 16.1 MB]
  └── cache: [count: 85,000, bytes: 68.5 MB, 59%]
        ├── catalog: [count: 60,000, bytes: 45.0 MB]
        └── search: [count: 25,000, bytes: 23.5 MB]
```

### Tree Construction Rules
1. Each key path is tokenized by the chosen delimiter.
2. Tokens are inserted as parent and child nodes.
3. Each node tracks:
   - `KeyCount`: Number of individual keys belonging to this namespace and its children.
   - `TotalBytes`: Sum of estimated memory usage for all contained keys.
   - `Percentage`: Share of total analyzed dataset memory.

## Memory Estimation Strategy

When profiling a batch of keys retrieved via `SCAN`:
1. **Primary Method (`MEMORY USAGE`)**:
   - For engines supporting `MEMORY USAGE`, ValkeyLens executes `MEMORY USAGE <key> SAMPLES 5`.
   - Limiting sample count to 5 prevents deep traversal on large nested hashes or sorted sets, keeping lookup times under a few microseconds per key.
2. **Fallback Method (Type Lengths)**:
   - If `MEMORY USAGE` is disabled or unsupported, memory is estimated based on data structure lengths:
     - String: `STRLEN key` + overhead (approx 48 bytes).
     - Hash: `HLEN key` * average field size estimate.
     - List: `LLEN key` * average entry size estimate.
     - Set: `SCARD key` * average member size estimate.
     - ZSet: `ZCARD key` * average score-member pair size estimate.

## Big Keys Min-Heap

During memory profiling, ValkeyLens maintains a bounded min-heap of the largest keys:
- Default size: 100 items.
- As keys are sampled, their memory footprint is compared against the root of the min-heap.
- If the key is larger than the smallest item in the heap, the root is replaced and the heap is rebalanced.
- This produces a sorted list of the top memory consumers with O(N log K) time complexity and O(K) space complexity, where K is 100.

## Headless Audit Mode

The memory profiler can run in headless mode from the CLI without starting the web UI:

```bash
valkeylens audit -u "valkey://127.0.0.1:6379" --export report.json --top 50
```

The output JSON structure contains:
- Total keys scanned and total memory calculated.
- Top level namespace tree summary with byte counts and percentages.
- Array of the top N largest keys with key name, type, byte size, and TTL.
