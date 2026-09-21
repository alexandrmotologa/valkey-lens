# Production Safety & Guard Rules

Running database management tools against production clusters introduces operational risks, such as accidental server stalls from blocking commands or unintentional data deletion. This document outlines the safeguards built into ValkeyLens to prevent these failures.

## 1. Non-Blocking Scans by Default

Valkey and Redis are primarily single-threaded or thread-coordinated in-memory engines. Executing `KEYS *` against an instance with millions of keys blocks all other read and write traffic for seconds or minutes.

- **Strict Ban on `KEYS *`**: The backend command router rejects direct calls to `KEYS`.
- **Automatic Translation**: If a user submits `KEYS <pattern>` via the web REPL or API, ValkeyLens intercepts the command and executes an asynchronous cursor-based `SCAN 0 MATCH <pattern> COUNT 250` stream instead.
- **Pipelined Iteration**: Keyspace exploration advances through cursor tokens. Each iteration releases the event loop, ensuring other client connections are served without latency spikes.

## 2. Command Blacklist & Interception

ValkeyLens includes a command interceptor located at `pkg/client/guard.go`. The interceptor categorizes commands into three tiers:

| Tier | Commands | Default Behavior |
| :--- | :--- | :--- |
| **Blocked** | `FLUSHALL`, `FLUSHDB`, `SHUTDOWN`, `DEBUG` | Rejected in standard web UI and API mode |
| **Guarded** | `KEYS`, `CONFIG`, `MIGRATE`, `RESTORE` | Replaced with non-blocking scans or restricted to explicit admin override |
| **Mutating** | `SET`, `DEL`, `HSET`, `HDEL`, `LPUSH`, `LPOP`, `SADD`, `ZADD`, `XADD` | Blocked when `--read-only` flag is enabled |

Attempting to execute a blocked command returns a structured error:
```json
{
  "error": "command_blocked",
  "command": "FLUSHALL",
  "reason": "Destructive command blocked by ValkeyLens production safety guard."
}
```

## 3. Read-Only Mode (`--read-only`)

For staging and production auditing, ValkeyLens can be started with the `--read-only` flag:

```bash
valkeylens -u "valkeys://prod-cache.internal:6380" --read-only
```

When active:
- The HTTP router blocks all `POST`, `PUT`, `PATCH`, and `DELETE` requests targeting keyspace modifications, returning `403 Forbidden`.
- The embedded web REPL rejects any command with mutating semantics (`SET`, `DEL`, `EXPIRE`, `PERSIST`, `HSET`, `ZREM`, `XDEL`, `CONFIG SET`).
- The user interface displays a prominent read-only badge in the header and disables editing controls, delete buttons, and TTL modification inputs.

## 4. Destructive Action Confirmation

In standard mode (when `--read-only` is false), any destructive action in the user interface requires confirmation:
- Deleting an individual key triggers a modal confirmation dialog displaying the key name, type, and memory footprint.
- Flushing a database requires the user to type the exact confirmation phrase: `"CONFIRM FLUSH"`.
- Batch operations require previewing the matched key count before execution begins.
