# REPL & Headless CLI Audit

This document describes the embedded web REPL terminal and the headless CLI audit workflow.

## Embedded Web REPL

ValkeyLens includes a browser-based terminal accessible directly within the management studio.

### Key Capabilities
- **Command Autocomplete**: Typing command prefixes displays a dropdown list of matching Valkey 8 and Redis 7 commands.
- **Parameter Syntax Hints**: As commands are typed, argument specifications appear (for example: `SET key value [NX|XX] [GET] [EX seconds]`).
- **RESP3 Data Type Formatting**:
  - Simple Strings: Rendered in standard text.
  - Numbers: Rendered in blue with integer or float formatting.
  - Maps / Dictionaries: Rendered as key-value pairs with field highlights.
  - Arrays / Sets: Rendered as indexed lists with element counts.
  - Nil / Null: Rendered in muted gray text.
  - Errors: Rendered in red with error classification (e.g. `(error) WRONGTYPE`).
- **Command History**: Navigate previous commands using Up and Down arrow keys. History is preserved across browser sessions in local storage.
- **Guard Interception**: Blocked commands (`KEYS *`, `FLUSHALL`) and mutating commands (in `--read-only` mode) are intercepted with informative error messages before execution.

## Headless CLI Audit Mode

ValkeyLens can be invoked from terminal scripts or CI/CD pipelines without launching the web server.

### Command Usage

```bash
valkeylens audit [flags]
```

### Flags

| Flag | Short | Default | Description |
| :--- | :--- | :--- | :--- |
| `--url` | `-u` | `valkey://127.0.0.1:6379` | Server connection URL |
| `--export` | `-e` | `""` | Path to export report file (`.json` or `.html`) |
| `--top` | `-t` | `50` | Number of top big keys to identify and record |
| `--delimiter` | `-d` | `:` | Delimiter used for namespace prefix aggregation |
| `--pattern` | | `*` | Pattern filter for scanned keys |
| `--demo` | | `false` | Run audit against the embedded mock database |

### JSON Report Structure

When exporting to JSON, the report produces the following schema:

```json
{
  "timestamp": "2026-09-21T18:30:00Z",
  "server": {
    "version": "8.0.1",
    "used_memory_human": "512.4M",
    "total_keys": 142800
  },
  "summary": {
    "scanned_keys": 142800,
    "calculated_bytes": 482910400
  },
  "namespaces": [
    {
      "prefix": "cache:user",
      "count": 64200,
      "bytes": 214829100,
      "percentage": 44.48
    },
    {
      "prefix": "session:auth",
      "count": 42000,
      "bytes": 148291000,
      "percentage": 30.70
    }
  ],
  "big_keys": [
    {
      "key": "cache:user:analytics_aggregate",
      "type": "hash",
      "bytes": 1492800,
      "ttl": 86400
    }
  ]
}
```
