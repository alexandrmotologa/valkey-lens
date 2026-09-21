package client

import (
	"context"
	"errors"
	"time"
)

var (
	ErrBlockedCommand = errors.New("command blocked by safety guard")
	ErrReadOnly       = errors.New("server is in read-only mode")
	ErrKeyNotFound    = errors.New("key not found")
)

// SlowlogRecord represents an entry in the database slow query log.
type SlowlogRecord struct {
	ID        int64         `json:"id"`
	Timestamp time.Time     `json:"timestamp"`
	Duration  time.Duration `json:"duration"`
	Command   []string      `json:"command"`
	ClientIP  string        `json:"client_ip,omitempty"`
	ClientName string       `json:"client_name,omitempty"`
}

// Client defines the common database operations required by ValkeyLens.
type Client interface {
	// Ping tests server connectivity.
	Ping(ctx context.Context) error

	// Do executes an arbitrary command through the client.
	Do(ctx context.Context, args ...string) (interface{}, error)

	// Scan performs a cursor-based scan of keys matching a pattern.
	Scan(ctx context.Context, cursor uint64, match string, count int64) (uint64, []string, error)

	// Type returns the data type of the specified key.
	Type(ctx context.Context, key string) (string, error)

	// PTTL returns the remaining time to live of a key in milliseconds (-1: no ttl, -2: key not exists).
	PTTL(ctx context.Context, key string) (int64, error)

	// MemoryUsage returns the memory usage of a key in bytes.
	MemoryUsage(ctx context.Context, key string, samples int) (int64, error)

	// Info returns database server information sections.
	Info(ctx context.Context, section string) (string, error)

	// SlowlogGet retrieves the recent slowlog entries.
	SlowlogGet(ctx context.Context, count int64) ([]SlowlogRecord, error)

	// Close terminates the client connection pool.
	Close()

	// IsReadOnly indicates if the client rejects mutating commands.
	IsReadOnly() bool

	// IsMock indicates if this is the embedded demo client.
	IsMock() bool
}

// Options configures a client connection.
type Options struct {
	URL        string
	ReadOnly   bool
	Cluster    bool
	Nodes      []string
	TLSCA      string
	IsDemo     bool
	Timeout    time.Duration
}
