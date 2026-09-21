package repl

import "strings"

// CommandDef defines schema and syntax hints for a Valkey/Redis command.
type CommandDef struct {
	Name    string `json:"name"`
	Syntax  string `json:"syntax"`
	Summary string `json:"summary"`
	Group   string `json:"group"`
}

// BuiltinCommands provides command definitions for autocomplete and parameter hints.
var BuiltinCommands = []CommandDef{
	// Generic
	{Name: "DEL", Syntax: "DEL key [key ...]", Summary: "Delete one or more keys", Group: "generic"},
	{Name: "EXPIRE", Syntax: "EXPIRE key seconds [NX|XX|GT|LT]", Summary: "Set a key's time to live in seconds", Group: "generic"},
	{Name: "PERSIST", Syntax: "PERSIST key", Summary: "Remove the expiration from a key", Group: "generic"},
	{Name: "PTTL", Syntax: "PTTL key", Summary: "Get the remaining time to live in milliseconds", Group: "generic"},
	{Name: "TTL", Syntax: "TTL key", Summary: "Get the remaining time to live in seconds", Group: "generic"},
	{Name: "TYPE", Syntax: "TYPE key", Summary: "Determine the type stored at key", Group: "generic"},
	{Name: "SCAN", Syntax: "SCAN cursor [MATCH pattern] [COUNT count] [TYPE type]", Summary: "Incrementally iterate the keyspace", Group: "generic"},
	{Name: "EXISTS", Syntax: "EXISTS key [key ...]", Summary: "Determine if one or more keys exist", Group: "generic"},
	{Name: "RENAME", Syntax: "RENAME key newkey", Summary: "Rename a key", Group: "generic"},

	// Strings
	{Name: "GET", Syntax: "GET key", Summary: "Get the value of a key", Group: "string"},
	{Name: "SET", Syntax: "SET key value [NX|XX] [GET] [EX seconds|PX ms]", Summary: "Set the string value of a key", Group: "string"},
	{Name: "MGET", Syntax: "MGET key [key ...]", Summary: "Get the values of multiple keys", Group: "string"},
	{Name: "MSET", Syntax: "MSET key value [key value ...]", Summary: "Set multiple keys to multiple values", Group: "string"},
	{Name: "INCR", Syntax: "INCR key", Summary: "Increment the integer value of a key by one", Group: "string"},
	{Name: "DECR", Syntax: "DECR key", Summary: "Decrement the integer value of a key by one", Group: "string"},
	{Name: "STRLEN", Syntax: "STRLEN key", Summary: "Get the length of the value stored in a key", Group: "string"},

	// Hashes
	{Name: "HGET", Syntax: "HGET key field", Summary: "Get the value of a hash field", Group: "hash"},
	{Name: "HSET", Syntax: "HSET key field value [field value ...]", Summary: "Set the value of one or more hash fields", Group: "hash"},
	{Name: "HGETALL", Syntax: "HGETALL key", Summary: "Get all fields and values in a hash", Group: "hash"},
	{Name: "HDEL", Syntax: "HDEL key field [field ...]", Summary: "Delete one or more hash fields", Group: "hash"},
	{Name: "HEXISTS", Syntax: "HEXISTS key field", Summary: "Determine if a hash field exists", Group: "hash"},
	{Name: "HKEYS", Syntax: "HKEYS key", Summary: "Get all the fields in a hash", Group: "hash"},
	{Name: "HVALS", Syntax: "HVALS key", Summary: "Get all the values in a hash", Group: "hash"},
	{Name: "HLEN", Syntax: "HLEN key", Summary: "Get the number of fields contained in a hash", Group: "hash"},

	// Lists
	{Name: "LPUSH", Syntax: "LPUSH key element [element ...]", Summary: "Prepend one or multiple elements to a list", Group: "list"},
	{Name: "RPUSH", Syntax: "RPUSH key element [element ...]", Summary: "Append one or multiple elements to a list", Group: "list"},
	{Name: "LPOP", Syntax: "LPOP key [count]", Summary: "Remove and get the first elements in a list", Group: "list"},
	{Name: "RPOP", Syntax: "RPOP key [count]", Summary: "Remove and get the last elements in a list", Group: "list"},
	{Name: "LRANGE", Syntax: "LRANGE key start stop", Summary: "Get a range of elements from a list", Group: "list"},
	{Name: "LLEN", Syntax: "LLEN key", Summary: "Get the length of a list", Group: "list"},

	// Sets
	{Name: "SADD", Syntax: "SADD key member [member ...]", Summary: "Add one or more members to a set", Group: "set"},
	{Name: "SMEMBERS", Syntax: "SMEMBERS key", Summary: "Get all the members in a set", Group: "set"},
	{Name: "SREM", Syntax: "SREM key member [member ...]", Summary: "Remove one or more members from a set", Group: "set"},
	{Name: "SISMEMBER", Syntax: "SISMEMBER key member", Summary: "Determine if a member belongs to a set", Group: "set"},
	{Name: "SCARD", Syntax: "SCARD key", Summary: "Get the number of members in a set", Group: "set"},

	// Sorted Sets
	{Name: "ZADD", Syntax: "ZADD key [NX|XX] [GT|LT] [CH] score member [score member ...]", Summary: "Add members with scores to a sorted set", Group: "zset"},
	{Name: "ZRANGE", Syntax: "ZRANGE key start stop [BYSCORE|BYLEX] [REV] [LIMIT offset count] [WITHSCORES]", Summary: "Return a range of members in a sorted set", Group: "zset"},
	{Name: "ZREM", Syntax: "ZREM key member [member ...]", Summary: "Remove one or more members from a sorted set", Group: "zset"},
	{Name: "ZCARD", Syntax: "ZCARD key", Summary: "Get the number of members in a sorted set", Group: "zset"},
	{Name: "ZSCORE", Syntax: "ZSCORE key member", Summary: "Get the score associated with the member", Group: "zset"},

	// Streams
	{Name: "XADD", Syntax: "XADD key [NOMKSTREAM] [MAXLEN|MINID [=|~] threshold] *|id field value [field value ...]", Summary: "Appends an entry to a stream", Group: "stream"},
	{Name: "XRANGE", Syntax: "XRANGE key start end [COUNT count]", Summary: "Return a range of elements in a stream", Group: "stream"},
	{Name: "XREVRANGE", Syntax: "XREVRANGE key end start [COUNT count]", Summary: "Return a range of elements in reverse order", Group: "stream"},
	{Name: "XLEN", Syntax: "XLEN key", Summary: "Get the number of entries in a stream", Group: "stream"},
	{Name: "XINFO", Syntax: "XINFO [CONSUMERS|GROUPS|STREAM] key [group]", Summary: "Get information about streams and consumer groups", Group: "stream"},
	{Name: "XPENDING", Syntax: "XPENDING key group [[IDLE min-idle-time] start end count [consumer]]", Summary: "Inspect unacknowledged pending messages", Group: "stream"},

	// Server & Observability
	{Name: "PING", Syntax: "PING [message]", Summary: "Ping the server", Group: "server"},
	{Name: "INFO", Syntax: "INFO [section]", Summary: "Get server information and statistics", Group: "server"},
	{Name: "DBSIZE", Syntax: "DBSIZE", Summary: "Return the number of keys in the selected database", Group: "server"},
	{Name: "SLOWLOG", Syntax: "SLOWLOG [GET|LEN|RESET] [count]", Summary: "Inspect database slow query log", Group: "server"},
	{Name: "MEMORY", Syntax: "MEMORY [USAGE|STATS|PURGE] [key] [SAMPLES count]", Summary: "Inspect memory usage of keys or engine", Group: "server"},
	{Name: "CLIENT", Syntax: "CLIENT [LIST|ID|KILL|PAUSE]", Summary: "Inspect and control client connections", Group: "server"},
}

// FindCompletions returns command suggestions matching the query prefix.
func FindCompletions(prefix string) []CommandDef {
	prefix = strings.ToUpper(strings.TrimSpace(prefix))
	if prefix == "" {
		return BuiltinCommands[:15] // return top commands
	}

	matches := make([]CommandDef, 0)
	for _, cmd := range BuiltinCommands {
		if strings.HasPrefix(cmd.Name, prefix) {
			matches = append(matches, cmd)
		}
	}
	return matches
}
