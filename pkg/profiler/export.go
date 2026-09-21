package profiler

import (
	"encoding/json"
	"fmt"
	"strings"
)

// ExportJSON serializes a memory profile report into formatted JSON.
func ExportJSON(report *ProfileReport) ([]byte, error) {
	return json.MarshalIndent(report, "", "  ")
}

// FormatBytes converts raw bytes into a human-readable string.
func FormatBytes(b int64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.2f %cB", float64(b)/float64(div), "KMGTPE"[exp])
}

// ExportHTML produces a standalone self-contained HTML report with embedded CSS.
func ExportHTML(report *ProfileReport) ([]byte, error) {
	var nsRows strings.Builder
	for _, ns := range report.Namespaces {
		leakBadge := `<span class="badge badge-success">Expiring</span>`
		if ns.VolatileCount == 0 {
			leakBadge = `<span class="badge badge-warning">0% Expiry (Persistent)</span>`
		}
		nsRows.WriteString(fmt.Sprintf(`
			<tr>
				<td><strong>%s</strong></td>
				<td>%d</td>
				<td>%s</td>
				<td>%.2f%%</td>
				<td>%s</td>
			</tr>
		`, ns.FullPath, ns.KeyCount, FormatBytes(ns.TotalBytes), ns.Percentage, leakBadge))
	}

	var bigKeyRows strings.Builder
	for i, bk := range report.BigKeys {
		ttlStr := "Persistent"
		if bk.TTL > 0 {
			ttlStr = fmt.Sprintf("%ds", bk.TTL/1000)
		}
		bigKeyRows.WriteString(fmt.Sprintf(`
			<tr>
				<td>#%d</td>
				<td><code>%s</code></td>
				<td><span class="type-badge">%s</span></td>
				<td>%s</td>
				<td>%s</td>
				<td>%s</td>
			</tr>
		`, i+1, bk.Key, bk.Type, FormatBytes(bk.Bytes), ttlStr, bk.Namespace))
	}

	var alertsSection strings.Builder
	if len(report.LeakAlerts) > 0 {
		alertsSection.WriteString(`<div class="alerts-container"><h3>Potential Memory Leaks Detected</h3><ul>`)
		for _, alert := range report.LeakAlerts {
			alertsSection.WriteString(fmt.Sprintf(`<li>%s</li>`, alert))
		}
		alertsSection.WriteString(`</ul></div>`)
	}

	html := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ValkeyLens Memory Audit Report - %s</title>
<style>
  :root {
    --bg: #090d16;
    --surface: #0f172a;
    --surface-border: #1e293b;
    --text: #f8fafc;
    --text-muted: #94a3b8;
    --cyan: #00f5ff;
    --cyan-dim: #0284c7;
    --amber: #fbbf24;
    --rose: #f43f5e;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    line-height: 1.5;
    padding: 32px 24px;
  }
  .container { max-width: 1200px; margin: 0 auto; }
  header {
    border-bottom: 1px solid var(--surface-border);
    padding-bottom: 24px;
    margin-bottom: 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h1 { font-size: 24px; font-weight: 700; color: #fff; }
  h1 span { color: var(--cyan); }
  .timestamp { color: var(--text-muted); font-size: 14px; }
  .grid-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    margin-bottom: 32px;
  }
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    padding: 20px;
  }
  .stat-label { font-size: 13px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .stat-value { font-size: 28px; font-weight: 700; color: #fff; margin-top: 8px; }
  .stat-value.cyan { color: var(--cyan); }
  .alerts-container {
    background: rgba(251, 191, 36, 0.08);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 32px;
  }
  .alerts-container h3 { color: var(--amber); margin-bottom: 12px; font-size: 16px; }
  .alerts-container ul { padding-left: 20px; color: #fde68a; font-size: 14px; }
  .section {
    background: var(--surface);
    border: 1px solid var(--surface-border);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 32px;
  }
  .section h2 { font-size: 18px; margin-bottom: 16px; color: #fff; }
  table { width: 100%%; border-collapse: collapse; text-align: left; font-size: 14px; }
  th, td { padding: 12px 14px; border-bottom: 1px solid var(--surface-border); }
  th { color: var(--text-muted); font-weight: 600; font-size: 12px; text-transform: uppercase; }
  tr:hover { background: rgba(255, 255, 255, 0.02); }
  code { background: #1e293b; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #38bdf8; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
  .badge-success { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
  .badge-warning { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
  .type-badge { background: #334155; color: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
</style>
</head>
<body>
<div class="container">
  <header>
    <div>
      <h1>Valkey<span>Lens</span> Memory Audit</h1>
      <div class="timestamp">Generated: %s</div>
    </div>
  </header>

  <div class="grid-stats">
    <div class="stat-card">
      <div class="stat-label">Scanned Keys</div>
      <div class="stat-value cyan">%d</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Memory Analyzed</div>
      <div class="stat-value">%s</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Active Namespaces</div>
      <div class="stat-value">%d</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Big Keys Monitored</div>
      <div class="stat-value">%d</div>
    </div>
  </div>

  %s

  <div class="section">
    <h2>Namespace Memory Distribution</h2>
    <table>
      <thead>
        <tr>
          <th>Namespace Prefix</th>
          <th>Key Count</th>
          <th>Total Memory</th>
          <th>Share</th>
          <th>TTL Policy</th>
        </tr>
      </thead>
      <tbody>
        %s
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Top %d Big Keys by Memory</h2>
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Key Name</th>
          <th>Type</th>
          <th>Memory Size</th>
          <th>TTL</th>
          <th>Namespace</th>
        </tr>
      </thead>
      <tbody>
        %s
      </tbody>
    </table>
  </div>
</div>
</body>
</html>`,
		report.Timestamp.Format("2006-01-02 15:04:05"),
		report.Timestamp.Format("2006-01-02 15:04:05 MST"),
		report.ScannedKeys,
		FormatBytes(report.TotalBytes),
		len(report.Namespaces),
		len(report.BigKeys),
		alertsSection.String(),
		nsRows.String(),
		len(report.BigKeys),
		bigKeyRows.String(),
	)

	return []byte(html), nil
}
