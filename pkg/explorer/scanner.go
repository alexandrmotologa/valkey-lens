package explorer

import (
	"context"
	"strings"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
)

// Scanner coordinates cursor-based scanning with metadata resolution.
type Scanner struct {
	client client.Client
}

// NewScanner creates a new keyspace scanner.
func NewScanner(cli client.Client) *Scanner {
	return &Scanner{client: cli}
}

// ExtractNamespace gets the prefix of a key up to the last delimiter.
func ExtractNamespace(key string, delimiter string) string {
	if delimiter == "" {
		delimiter = ":"
	}
	idx := strings.LastIndex(key, delimiter)
	if idx <= 0 {
		return "default"
	}
	return key[:idx]
}

// ScanKeys iterates through a cursor batch and enriches each key with type and TTL.
func (s *Scanner) ScanKeys(ctx context.Context, cursor uint64, pattern string, count int64) (*ScanResponse, error) {
	if count <= 0 {
		count = 250
	}
	if pattern == "" {
		pattern = "*"
	}

	nextCursor, rawKeys, err := s.client.Scan(ctx, cursor, pattern, count)
	if err != nil {
		return nil, err
	}

	summaries := make([]KeySummary, 0, len(rawKeys))
	for _, key := range rawKeys {
		kType, err := s.client.Type(ctx, key)
		if err != nil {
			kType = "unknown"
		}

		pttl, err := s.client.PTTL(ctx, key)
		if err != nil {
			pttl = -1
		}

		mem, _ := s.client.MemoryUsage(ctx, key, 0)

		summaries = append(summaries, KeySummary{
			Name:        key,
			Type:        kType,
			TTLMs:       pttl,
			MemoryBytes: mem,
			Namespace:   ExtractNamespace(key, ":"),
		})
	}

	return &ScanResponse{
		Cursor:    nextCursor,
		Keys:      summaries,
		TotalKeys: int64(len(summaries)),
	}, nil
}

// DeleteByPattern safely scans and deletes keys matching pattern in small non-blocking chunks.
func (s *Scanner) DeleteByPattern(ctx context.Context, pattern string, maxBatch int) (int64, error) {
	if maxBatch <= 0 {
		maxBatch = 100
	}

	var totalDeleted int64
	var cursor uint64 = 0

	for {
		nextCursor, keys, err := s.client.Scan(ctx, cursor, pattern, int64(maxBatch))
		if err != nil {
			return totalDeleted, err
		}

		if len(keys) > 0 {
			delArgs := append([]string{"DEL"}, keys...)
			res, err := s.client.Do(ctx, delArgs...)
			if err != nil {
				return totalDeleted, err
			}
			if cnt, ok := res.(int64); ok {
				totalDeleted += cnt
			} else {
				totalDeleted += int64(len(keys))
			}
		}

		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}

	return totalDeleted, nil
}

// ScanAllKeys scans keys matching pattern up to maxCount.
func (s *Scanner) ScanAllKeys(ctx context.Context, pattern string, maxCount int) ([]KeySummary, error) {
	if maxCount <= 0 {
		maxCount = 1000
	}
	var all []KeySummary
	var cursor uint64 = 0

	for {
		resp, err := s.ScanKeys(ctx, cursor, pattern, 250)
		if err != nil {
			return nil, err
		}
		all = append(all, resp.Keys...)
		if len(all) >= maxCount || resp.Cursor == 0 {
			break
		}
		cursor = resp.Cursor
	}

	if len(all) > maxCount {
		all = all[:maxCount]
	}
	return all, nil
}

