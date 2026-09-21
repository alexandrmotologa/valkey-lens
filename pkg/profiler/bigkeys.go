package profiler

import (
	"container/heap"
	"sort"
)

// BigKeyEntry represents a high memory consuming key.
type BigKeyEntry struct {
	Key       string `json:"key"`
	Type      string `json:"type"`
	Bytes     int64  `json:"bytes"`
	TTL       int64  `json:"ttl"`
	Namespace string `json:"namespace"`
}

// minHeap implements heap.Interface for BigKeyEntry.
type minHeap []BigKeyEntry

func (h minHeap) Len() int           { return len(h) }
func (h minHeap) Less(i, j int) bool { return h[i].Bytes < h[j].Bytes } // min-heap: smallest on top
func (h minHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }

func (h *minHeap) Push(x interface{}) {
	*h = append(*h, x.(BigKeyEntry))
}

func (h *minHeap) Pop() interface{} {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[0 : n-1]
	return x
}

// BigKeyTracker maintains top N big keys in a bounded min-heap.
type BigKeyTracker struct {
	maxCapacity int
	h           minHeap
}

// NewBigKeyTracker creates a tracker with a given max key capacity.
func NewBigKeyTracker(capacity int) *BigKeyTracker {
	if capacity <= 0 {
		capacity = 50
	}
	t := &BigKeyTracker{
		maxCapacity: capacity,
		h:           make(minHeap, 0, capacity),
	}
	heap.Init(&t.h)
	return t
}

// Add checks if a key qualifies for the top N ranking.
func (t *BigKeyTracker) Add(entry BigKeyEntry) {
	if len(t.h) < t.maxCapacity {
		heap.Push(&t.h, entry)
		return
	}

	if entry.Bytes > t.h[0].Bytes {
		t.h[0] = entry
		heap.Fix(&t.h, 0)
	}
}

// Entries returns the tracked big keys sorted descending by memory size.
func (t *BigKeyTracker) Entries() []BigKeyEntry {
	res := make([]BigKeyEntry, len(t.h))
	copy(res, t.h)
	sort.Slice(res, func(i, j int) bool {
		return res[i].Bytes > res[j].Bytes
	})
	return res
}
