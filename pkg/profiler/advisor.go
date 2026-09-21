package profiler

import (
	"fmt"
	"strings"
)

// OptimizationInsight provides an actionable diagnostic recommendation to reduce RAM.
type OptimizationInsight struct {
	ID                  string `json:"id"`
	Severity            string `json:"severity"` // critical, warning, tip
	Title               string `json:"title"`
	Description         string `json:"description"`
	EstimatedReclaimable string `json:"estimated_reclaimable"`
	RemediationCommand  string `json:"remediation_command"`
}

// GenerateInsights analyzes a profile report and generates actionable optimization recommendations.
func GenerateInsights(report *ProfileReport) []OptimizationInsight {
	var insights []OptimizationInsight

	if report == nil {
		return insights
	}

	// 1. Check for unexpiring volatile/cache namespaces (TTL Leaks)
	for _, ns := range report.Namespaces {
		lower := strings.ToLower(ns.FullPath)
		isLikelyVolatile := strings.Contains(lower, "session") ||
			strings.Contains(lower, "cache") ||
			strings.Contains(lower, "temp") ||
			strings.Contains(lower, "token") ||
			strings.Contains(lower, "rate")

		if isLikelyVolatile && ns.VolatileCount == 0 && ns.KeyCount > 0 {
			insights = append(insights, OptimizationInsight{
				ID:                  fmt.Sprintf("ttl-leak-%s", ns.FullPath),
				Severity:            "critical",
				Title:               fmt.Sprintf("Cache Leak Detected in '%s' Namespace", ns.FullPath),
				Description:         fmt.Sprintf("Namespace '%s' holds %d keys (%s) without any TTL expiration. In-memory databases treat these as permanent, risking eventual OOM evictions.", ns.FullPath, ns.KeyCount, FormatBytes(ns.TotalBytes)),
				EstimatedReclaimable: FormatBytes(ns.TotalBytes),
				RemediationCommand:  fmt.Sprintf("EXPIRE %s:<id> 86400", ns.FullPath),
			})
		}
	}

	// 2. Check for monolithic uncompressed strings in Big Keys (> 64KB)
	for _, bk := range report.BigKeys {
		if bk.Type == "string" && bk.Bytes > 64*1024 {
			insights = append(insights, OptimizationInsight{
				ID:                  fmt.Sprintf("big-string-%s", bk.Key),
				Severity:            "warning",
				Title:               fmt.Sprintf("Oversized String Blob: '%s'", bk.Key),
				Description:         fmt.Sprintf("Key '%s' occupies %s in a single string. Storing large JSON or binary payloads without client-side compression (zstd/gzip) strains memory bandwidth and fork save buffers.", bk.Key, FormatBytes(bk.Bytes)),
				EstimatedReclaimable: FormatBytes(int64(float64(bk.Bytes) * 0.65)),
				RemediationCommand:  fmt.Sprintf("# Compress payload with zstd before SET, or split into Hash fields"),
			})
		}
	}

	// 3. Check for high key count in flat namespaces (Ziplist/Listpack thresholds)
	for _, ns := range report.Namespaces {
		if ns.KeyCount > 5000 && ns.TotalBytes < 1024*1024 {
			insights = append(insights, OptimizationInsight{
				ID:                  fmt.Sprintf("hash-bucketing-%s", ns.FullPath),
				Severity:            "tip",
				Title:               fmt.Sprintf("High Key Density in '%s' - Consider Hash Bucketing", ns.FullPath),
				Description:         fmt.Sprintf("Storing %d individual keys incurs per-key metadata overhead (dictEntry pointers + robj = ~48 bytes per key). Grouping keys into small Hashes (e.g. %s:{bucket_id}) leverages listpack encoding to save up to 70%% RAM.", ns.KeyCount, ns.FullPath),
				EstimatedReclaimable: FormatBytes(int64(ns.KeyCount * 32)),
				RemediationCommand:  fmt.Sprintf("# Group %s:* into HSET %s:<bucket> <id> <value>", ns.FullPath, ns.FullPath),
			})
		}
	}

	return insights
}
