package traffic

import (
	"context"
	"strings"
	"sync"
	"time"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
)

// SampledCommand represents an intercepted command during traffic sampling.
type SampledCommand struct {
	Timestamp time.Time `json:"timestamp"`
	DB        int       `json:"db"`
	ClientIP  string    `json:"client_ip"`
	Command   string    `json:"command"`
	Key       string    `json:"key"`
	Category  string    `json:"category"` // READ, WRITE, SCAN, ADMIN, OTHER
}

// TrafficSummary contains aggregated insights from a sampling window.
type TrafficSummary struct {
	DurationMs     int64             `json:"duration_ms"`
	TotalCommands  int               `json:"total_commands"`
	CommandsPerSec float64           `json:"commands_per_sec"`
	Categories     map[string]int    `json:"categories"`
	HotKeys        []HotKeyCount     `json:"hot_keys"`
	RecentCommands []SampledCommand  `json:"recent_commands"`
}

// HotKeyCount tracks high-frequency accessed keys.
type HotKeyCount struct {
	Key   string `json:"key"`
	Count int    `json:"count"`
}

// Sampler executes a safe, time-bounded and count-bounded traffic monitor session.
type Sampler struct {
	client client.Client
}

// NewSampler creates a new safe traffic sampler.
func NewSampler(c client.Client) *Sampler {
	return &Sampler{client: c}
}

// ClassifyCommand assigns a category to a Redis/Valkey command.
func ClassifyCommand(cmd string) string {
	upper := strings.ToUpper(cmd)
	switch upper {
	case "GET", "MGET", "HGET", "HGETALL", "HMGET", "LRANGE", "LINDEX", "SMEMBERS", "SISMEMBER", "ZRANGE", "ZREVRANGE", "ZCARD", "STRLEN", "EXISTS":
		return "READ"
	case "SET", "SETEX", "MSET", "HSET", "HDEL", "LPUSH", "RPUSH", "LPOP", "RPOP", "SADD", "SREM", "ZADD", "ZREM", "DEL", "UNLINK", "EXPIRE", "PEXPIRE", "INCR", "DECR":
		return "WRITE"
	case "SCAN", "SSCAN", "HSCAN", "ZSCAN":
		return "SCAN"
	case "INFO", "CONFIG", "CLIENT", "SLOWLOG", "COMMAND", "PING", "AUTH", "SELECT":
		return "ADMIN"
	default:
		return "OTHER"
	}
}

// SampleTraffic runs a bounded sampling session (e.g. 5 seconds or max 500 commands).
func (s *Sampler) SampleTraffic(ctx context.Context, duration time.Duration, maxCommands int) (*TrafficSummary, error) {
	if duration <= 0 || duration > 10*time.Second {
		duration = 5 * time.Second
	}
	if maxCommands <= 0 || maxCommands > 1000 {
		maxCommands = 500
	}

	start := time.Now()
	summary := &TrafficSummary{
		Categories:     make(map[string]int),
		RecentCommands: make([]SampledCommand, 0),
	}

	var mu sync.Mutex
	keyCounts := make(map[string]int)

	// Context with timeout to guarantee hard safety kill
	sampleCtx, cancel := context.WithTimeout(ctx, duration)
	defer cancel()

	// Use client's monitor streaming if available, or generate simulated/mocked commands in demo mode
	eventChan := make(chan client.TrafficEvent, 100)
	errChan := make(chan error, 1)

	go func() {
		defer close(eventChan)
		err := s.client.StreamTraffic(sampleCtx, maxCommands, eventChan)
		if err != nil && err != context.Canceled && err != context.DeadlineExceeded {
			errChan <- err
		}
	}()

	count := 0
	for {
		select {
		case <-sampleCtx.Done():
			goto Done
		case event, ok := <-eventChan:
			if !ok {
				goto Done
			}
			cmd := SampledCommand{
				Timestamp: event.Timestamp,
				DB:        event.DB,
				ClientIP:  event.ClientIP,
				Command:   event.Command,
				Key:       event.Key,
				Category:  ClassifyCommand(event.Command),
			}

			mu.Lock()
			count++
			summary.Categories[cmd.Category]++
			if cmd.Key != "" {
				keyCounts[cmd.Key]++
			}
			if len(summary.RecentCommands) < 100 {
				summary.RecentCommands = append(summary.RecentCommands, cmd)
			}
			mu.Unlock()

			if count >= maxCommands {
				goto Done
			}
		}
	}

Done:
	elapsed := time.Since(start)
	summary.DurationMs = elapsed.Milliseconds()
	summary.TotalCommands = count
	if elapsed.Seconds() > 0 {
		summary.CommandsPerSec = float64(count) / elapsed.Seconds()
	}

	// Calculate Top 10 hot keys
	summary.HotKeys = TopHotKeys(keyCounts, 10)
	return summary, nil
}

// TopHotKeys returns the top N most frequently accessed keys.
func TopHotKeys(counts map[string]int, limit int) []HotKeyCount {
	type kv struct {
		k string
		v int
	}
	var list []kv
	for k, v := range counts {
		list = append(list, kv{k, v})
	}

	// Simple selection sort for top keys
	for i := 0; i < len(list)-1; i++ {
		maxIdx := i
		for j := i + 1; j < len(list); j++ {
			if list[j].v > list[maxIdx].v {
				maxIdx = j
			}
		}
		list[i], list[maxIdx] = list[maxIdx], list[i]
	}

	if limit > len(list) {
		limit = len(list)
	}

	res := make([]HotKeyCount, limit)
	for i := 0; i < limit; i++ {
		res[i] = HotKeyCount{
			Key:   list[i].k,
			Count: list[i].v,
		}
	}
	return res
}
