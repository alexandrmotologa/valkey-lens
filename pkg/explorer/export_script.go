package explorer

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
)

// ScriptExporter serializes keyspace data into executable .redis command scripts.
type ScriptExporter struct {
	client  client.Client
	scanner *Scanner
	crud    *CRUDManager
}

// NewScriptExporter creates a new script exporter.
func NewScriptExporter(c client.Client, s *Scanner, crud *CRUDManager) *ScriptExporter {
	return &ScriptExporter{
		client:  c,
		scanner: s,
		crud:    crud,
	}
}

// ExportScript scans keys matching pattern and formats them into raw Redis commands.
func (e *ScriptExporter) ExportScript(ctx context.Context, pattern string, limit int) (string, error) {
	if pattern == "" {
		pattern = "*"
	}
	if limit <= 0 || limit > 5000 {
		limit = 1000
	}

	keys, err := e.scanner.ScanAllKeys(ctx, pattern, limit)
	if err != nil {
		return "", fmt.Errorf("failed to scan keys for script export: %w", err)
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("# ValkeyLens Dataset Dump\n"))
	sb.WriteString(fmt.Sprintf("# Generated at: %s\n", time.Now().Format(time.RFC3339)))
	sb.WriteString(fmt.Sprintf("# Keys count: %d (pattern: %s)\n\n", len(keys), pattern))

	for _, k := range keys {
		detail, err := e.crud.GetKeyDetail(ctx, k.Name)
		if err != nil {
			continue
		}

		switch detail.Type {
		case "string":
			strVal, ok := detail.Value.(string)
			if ok {
				sb.WriteString(fmt.Sprintf("SET %s %s\n", quoteString(k.Name), quoteString(strVal)))
			}
		case "hash":
			hVal, ok := detail.Value.(map[string]string)
			if ok && len(hVal) > 0 {
				var pairs []string
				for field, val := range hVal {
					pairs = append(pairs, fmt.Sprintf("%s %s", quoteString(field), quoteString(val)))
				}
				sb.WriteString(fmt.Sprintf("HSET %s %s\n", quoteString(k.Name), strings.Join(pairs, " ")))
			}
		case "list":
			lVal, ok := detail.Value.([]string)
			if ok && len(lVal) > 0 {
				var quoted []string
				for _, item := range lVal {
					quoted = append(quoted, quoteString(item))
				}
				sb.WriteString(fmt.Sprintf("RPUSH %s %s\n", quoteString(k.Name), strings.Join(quoted, " ")))
			}
		case "set":
			sVal, ok := detail.Value.([]string)
			if ok && len(sVal) > 0 {
				var quoted []string
				for _, item := range sVal {
					quoted = append(quoted, quoteString(item))
				}
				sb.WriteString(fmt.Sprintf("SADD %s %s\n", quoteString(k.Name), strings.Join(quoted, " ")))
			}
		case "zset":
			zVal, ok := detail.Value.([]ZSetItem)
			if ok && len(zVal) > 0 {
				var parts []string
				for _, item := range zVal {
					parts = append(parts, fmt.Sprintf("%f %s", item.Score, quoteString(item.Member)))
				}
				sb.WriteString(fmt.Sprintf("ZADD %s %s\n", quoteString(k.Name), strings.Join(parts, " ")))
			}
		}

		// Apply TTL if applicable
		if detail.TTLMs > 0 {
			ttlSec := detail.TTLMs / 1000
			if ttlSec > 0 {
				sb.WriteString(fmt.Sprintf("EXPIRE %s %d\n", quoteString(k.Name), ttlSec))
			}
		}
	}

	return sb.String(), nil
}

func quoteString(s string) string {
	escaped := strings.ReplaceAll(s, "\\", "\\\\")
	escaped = strings.ReplaceAll(escaped, "\"", "\\\"")
	escaped = strings.ReplaceAll(escaped, "\n", "\\n")
	escaped = strings.ReplaceAll(escaped, "\r", "\\r")
	escaped = strings.ReplaceAll(escaped, "\t", "\\t")
	return fmt.Sprintf("\"%s\"", escaped)
}
