package client

import (
	"fmt"
	"strings"
)

// BlockedCommands are completely forbidden in normal operations.
var BlockedCommands = map[string]bool{
	"FLUSHALL": true,
	"FLUSHDB":  true,
	"SHUTDOWN": true,
	"DEBUG":    true,
}

// MutatingCommands modify the keyspace or server configuration.
var MutatingCommands = map[string]bool{
	"SET":         true,
	"SETNX":       true,
	"SETEX":       true,
	"PSETEX":      true,
	"MSET":        true,
	"MSETNX":      true,
	"APPEND":      true,
	"INCR":        true,
	"DECR":        true,
	"INCRBY":      true,
	"DECRBY":      true,
	"INCRBYFLOAT": true,
	"DEL":         true,
	"UNLINK":      true,
	"EXPIRE":      true,
	"EXPIREAT":    true,
	"PEXPIRE":     true,
	"PEXPIREAT":   true,
	"PERSIST":     true,
	"RENAME":      true,
	"RENAMENX":    true,
	"HSET":        true,
	"HMSET":       true,
	"HSETNX":      true,
	"HDEL":        true,
	"HINCRBY":     true,
	"HINCRBYFLOAT":true,
	"LPUSH":       true,
	"RPUSH":       true,
	"LPUSHX":      true,
	"RPUSHX":      true,
	"LPOP":        true,
	"RPOP":        true,
	"LREM":        true,
	"LSET":        true,
	"LTRIM":       true,
	"SADD":        true,
	"SREM":        true,
	"SPOP":        true,
	"SMOVE":       true,
	"ZADD":        true,
	"ZINCRBY":     true,
	"ZREM":        true,
	"ZREMRANGEBYRANK":  true,
	"ZREMRANGEBYSCORE": true,
	"ZREMRANGEBYLEX":   true,
	"XADD":        true,
	"XDEL":        true,
	"XTRIM":       true,
	"XGROUP":      true,
	"JSON.SET":    true,
	"JSON.DEL":    true,
	"JSON.ARRAPPEND": true,
	"CONFIG":      true, // Intercept CONFIG modifications
}

// CheckCommand inspects a command against the safety guard rules.
func CheckCommand(readOnly bool, args ...string) error {
	if len(args) == 0 {
		return nil
	}

	cmdName := strings.ToUpper(args[0])

	if cmdName == "KEYS" {
		pattern := "*"
		if len(args) > 1 {
			pattern = args[1]
		}
		return fmt.Errorf("%w: 'KEYS %s' is blocked because it blocks the server; use SCAN cursor pagination instead", ErrBlockedCommand, pattern)
	}

	if BlockedCommands[cmdName] {
		return fmt.Errorf("%w: command '%s' is blocked by ValkeyLens production safety guard", ErrBlockedCommand, cmdName)
	}

	if readOnly {
		if cmdName == "CONFIG" && len(args) > 1 && strings.ToUpper(args[1]) == "SET" {
			return fmt.Errorf("%w: CONFIG SET is disabled in read-only mode", ErrReadOnly)
		}
		if MutatingCommands[cmdName] {
			return fmt.Errorf("%w: mutating command '%s' is forbidden in read-only mode", ErrReadOnly, cmdName)
		}
	}

	return nil
}

// IsBlockedCommand checks if a command name is in the blocked list.
func IsBlockedCommand(name string) bool {
	return BlockedCommands[strings.ToUpper(name)]
}

// IsMutatingCommand checks if a command alters data.
func IsMutatingCommand(name string) bool {
	return MutatingCommands[strings.ToUpper(name)]
}
