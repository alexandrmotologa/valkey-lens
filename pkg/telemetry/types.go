package telemetry

// MetricPoint holds a single historical telemetry sample.
type MetricPoint struct {
	Timestamp        int64   `json:"timestamp"` // Unix timestamp in seconds
	OpsPerSec        int64   `json:"ops_per_sec"`
	UsedMemoryBytes  int64   `json:"used_memory_bytes"`
	UsedMemoryRSS    int64   `json:"used_memory_rss"`
	ConnectedClients int64   `json:"connected_clients"`
	HitRatio         float64 `json:"hit_ratio"`
	CPUUsage         float64 `json:"cpu_usage"`
	IOThreadsActive  int     `json:"io_threads_active"`
}

// ServerInfo contains static/runtime server metadata.
type ServerInfo struct {
	Version            string  `json:"version"`
	Mode               string  `json:"mode"`
	OS                 string  `json:"os"`
	UptimeSec          int64   `json:"uptime_sec"`
	TotalKeys          int64   `json:"total_keys"`
	UsedMemoryHuman    string  `json:"used_memory_human"`
	UsedMemoryRSSHuman string  `json:"used_memory_rss_human"`
	MemFragRatio       float64 `json:"mem_frag_ratio"`
	IsValkey           bool    `json:"is_valkey"`
}

// TelemetrySnapshot combines the latest server status with recent metric history.
type TelemetrySnapshot struct {
	Server  ServerInfo    `json:"server"`
	Current MetricPoint   `json:"current"`
	History []MetricPoint `json:"history"`
}
