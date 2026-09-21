package explorer

import "encoding/json"

// KeySummary represents a key item in the explorer list.
type KeySummary struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	TTLMs       int64  `json:"ttl_ms"`       // -1 = no expiry, -2 = expired/missing
	MemoryBytes int64  `json:"memory_bytes"` // memory usage in bytes
	Namespace   string `json:"namespace"`    // e.g. "user:profile"
}

// ZSetItem represents an element and its score in a sorted set.
type ZSetItem struct {
	Member string  `json:"member"`
	Score  float64 `json:"score"`
}

// StreamMessage represents an entry in a stream.
type StreamMessage struct {
	ID        string            `json:"id"`
	Fields    map[string]string `json:"fields"`
	Timestamp int64             `json:"timestamp"`
}

// KeyDetail contains full representation of a key and its value.
type KeyDetail struct {
	Name        string      `json:"name"`
	Type        string      `json:"type"`
	TTLMs       int64       `json:"ttl_ms"`
	MemoryBytes int64       `json:"memory_bytes"`
	Length      int64       `json:"length"`
	Value       interface{} `json:"value"`
	IsJSON      bool        `json:"is_json"`
}

// ScanResponse returns paginated keys with cursor.
type ScanResponse struct {
	Cursor    uint64       `json:"cursor"`
	Keys      []KeySummary `json:"keys"`
	TotalKeys int64        `json:"total_keys"`
}

// IsValidJSON checks if a string is valid JSON object or array.
func IsValidJSON(s string) bool {
	s = stringTrimSpace(s)
	if !(len(s) >= 2 && ((s[0] == '{' && s[len(s)-1] == '}') || (s[0] == '[' && s[len(s)-1] == ']'))) {
		return false
	}
	var js interface{}
	return json.Unmarshal([]byte(s), &js) == nil
}

func stringTrimSpace(s string) string {
	for len(s) > 0 && (s[0] == ' ' || s[0] == '\t' || s[0] == '\n' || s[0] == '\r') {
		s = s[1:]
	}
	for len(s) > 0 && (s[len(s)-1] == ' ' || s[len(s)-1] == '\t' || s[len(s)-1] == '\n' || s[len(s)-1] == '\r') {
		s = s[:len(s)-1]
	}
	return s
}
