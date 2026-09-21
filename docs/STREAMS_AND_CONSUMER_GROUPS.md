# Streams & Consumer Groups Inspector

Valkey and Redis Streams (`XADD`, `XREAD`, `XREADGROUP`) provide append-only log data structures for event-driven architectures. ValkeyLens provides a dedicated visual inspector for stream entries, consumer group lag, and pending message lists.

## Stream Entry Timeline

Stream entries consist of an ID (`<millisecondsTime>-<sequenceNumber>`) and a map of field-value pairs:
- **Forward & Reverse Pagination**: ValkeyLens reads stream entries using `XRANGE` and `XREVRANGE` with limit parameters (default 50 entries per page).
- **Auto-Refresh**: Live stream updates can be tailed in real time.
- **Payload Inspection**: Fields containing JSON strings are detected and displayed with syntax formatting.

## Consumer Groups Overview

Consumer groups allow multiple workers to coordinate consumption of a single stream. ValkeyLens parses the output of `XINFO GROUPS <stream>` to display:
- **Group Name**: Identifier of the consumer group.
- **Consumers Count**: Total active consumer instances registered with the group.
- **Pending Count**: Number of messages delivered to consumers that have not yet been acknowledged with `XACK`.
- **Last Delivered ID**: The entry ID of the most recent message dispatched to any consumer in this group.
- **Lag**: The number of unconsumed messages sitting between the last delivered ID and the latest stream entry.

## Pending Entries List (PEL) Inspector

When consumers fail, crash, or drop connections, messages remain in the Pending Entries List (PEL). ValkeyLens inspects unacknowledged messages using `XPENDING <stream> <group>`:
- **Entry ID**: Unique timestamp ID of the unacknowledged message.
- **Owner**: Consumer that currently owns the unacknowledged message.
- **Idle Time**: Elapsed time (in milliseconds) since the message was delivered to the consumer without an `XACK`.
- **Delivery Count**: Number of times this message has been delivered (helping detect poison-pill messages).
