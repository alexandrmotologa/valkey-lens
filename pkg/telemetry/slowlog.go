package telemetry

import (
	"context"
	"sync"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
)

// SlowlogTracker monitors slow operations.
type SlowlogTracker struct {
	client    client.Client
	mu        sync.Mutex
	lastSeenID int64
}

// NewSlowlogTracker creates a tracker for slow query events.
func NewSlowlogTracker(cli client.Client) *SlowlogTracker {
	return &SlowlogTracker{client: cli}
}

// GetRecentSlowlogs fetches the most recent slow operations.
func (st *SlowlogTracker) GetRecentSlowlogs(ctx context.Context, limit int64) ([]client.SlowlogRecord, error) {
	if limit <= 0 {
		limit = 50
	}
	return st.client.SlowlogGet(ctx, limit)
}

// CheckNewEntries checks for any newly added slowlog records since the last check.
func (st *SlowlogTracker) CheckNewEntries(ctx context.Context) ([]client.SlowlogRecord, error) {
	st.mu.Lock()
	defer st.mu.Unlock()

	entries, err := st.client.SlowlogGet(ctx, 20)
	if err != nil {
		return nil, err
	}

	var newEntries []client.SlowlogRecord
	var highestID = st.lastSeenID

	for _, entry := range entries {
		if entry.ID > st.lastSeenID {
			newEntries = append(newEntries, entry)
		}
		if entry.ID > highestID {
			highestID = entry.ID
		}
	}

	st.lastSeenID = highestID
	return newEntries, nil
}
