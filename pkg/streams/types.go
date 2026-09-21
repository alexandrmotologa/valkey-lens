package streams

// StreamMessage represents an entry in a stream.
type StreamMessage struct {
	ID        string            `json:"id"`
	Fields    map[string]string `json:"fields"`
	Timestamp int64             `json:"timestamp"`
}

// ConsumerGroup represents consumer group metadata from XINFO GROUPS.
type ConsumerGroup struct {
	Name            string `json:"name"`
	Consumers       int64  `json:"consumers"`
	Pending         int64  `json:"pending"`
	LastDeliveredID string `json:"last_delivered_id"`
	Lag             int64  `json:"lag"`
}

// ConsumerDetail represents an individual consumer worker from XINFO CONSUMERS.
type ConsumerDetail struct {
	Name       string `json:"name"`
	Pending    int64  `json:"pending"`
	IdleTimeMs int64  `json:"idle_time_ms"`
}

// PendingEntry represents an unacknowledged message from XPENDING.
type PendingEntry struct {
	ID            string `json:"id"`
	Consumer      string `json:"consumer"`
	IdleTimeMs    int64  `json:"idle_time_ms"`
	DeliveryCount int64  `json:"delivery_count"`
}

// StreamDetail provides a complete view of a stream and its consumer groups.
type StreamDetail struct {
	Key          string          `json:"key"`
	Length       int64           `json:"length"`
	FirstEntryID string          `json:"first_entry_id"`
	LastEntryID  string          `json:"last_entry_id"`
	Groups       []ConsumerGroup `json:"groups"`
	Entries      []StreamMessage `json:"entries"`
}
