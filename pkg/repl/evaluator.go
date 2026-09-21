package repl

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
)

// ExecutionResult captures the formatted response of an evaluated command.
type ExecutionResult struct {
	Command      string      `json:"command"`
	Type         string      `json:"type"` // "string", "integer", "array", "map", "nil", "error"
	Raw          interface{} `json:"raw"`
	Formatted    string      `json:"formatted"`
	DurationMs   float64     `json:"duration_ms"`
	IsError      bool        `json:"is_error"`
	ErrorMessage string      `json:"error_message,omitempty"`
}

// Evaluator executes REPL commands with safety interception and formatting.
type Evaluator struct {
	client client.Client
}

// NewEvaluator creates a new REPL evaluator.
func NewEvaluator(cli client.Client) *Evaluator {
	return &Evaluator{client: cli}
}

// SplitCommand parses a command string into arguments, respecting quotes.
func SplitCommand(cmdStr string) []string {
	var args []string
	var current strings.Builder
	inSingleQuote := false
	inDoubleQuote := false
	escaped := false

	for _, ch := range cmdStr {
		if escaped {
			current.WriteRune(ch)
			escaped = false
			continue
		}

		if ch == '\\' {
			escaped = true
			continue
		}

		if ch == '\'' && !inDoubleQuote {
			inSingleQuote = !inSingleQuote
			continue
		}

		if ch == '"' && !inSingleQuote {
			inDoubleQuote = !inDoubleQuote
			continue
		}

		if (ch == ' ' || ch == '\t' || ch == '\n') && !inSingleQuote && !inDoubleQuote {
			if current.Len() > 0 {
				args = append(args, current.String())
				current.Reset()
			}
			continue
		}

		current.WriteRune(ch)
	}

	if current.Len() > 0 {
		args = append(args, current.String())
	}

	return args
}

// Execute evaluates a user-supplied command string.
func (e *Evaluator) Execute(ctx context.Context, cmdStr string) *ExecutionResult {
	cmdStr = strings.TrimSpace(cmdStr)
	if cmdStr == "" {
		return &ExecutionResult{
			Command:   "",
			Type:      "nil",
			Formatted: "(nil)",
		}
	}

	args := SplitCommand(cmdStr)
	if len(args) == 0 {
		return &ExecutionResult{
			Command:   cmdStr,
			Type:      "nil",
			Formatted: "(nil)",
		}
	}

	// 1. Check Safety Guard
	if err := client.CheckCommand(e.client.IsReadOnly(), args...); err != nil {
		return &ExecutionResult{
			Command:      cmdStr,
			Type:         "error",
			Formatted:    fmt.Sprintf("(error) %v", err),
			IsError:      true,
			ErrorMessage: err.Error(),
		}
	}

	// 2. Execute with timing
	start := time.Now()
	res, err := e.client.Do(ctx, args...)
	duration := time.Since(start).Seconds() * 1000.0

	if err != nil {
		return &ExecutionResult{
			Command:      cmdStr,
			Type:         "error",
			Formatted:    fmt.Sprintf("(error) %v", err),
			DurationMs:   duration,
			IsError:      true,
			ErrorMessage: err.Error(),
		}
	}

	return formatResponse(cmdStr, res, duration)
}

func formatResponse(cmd string, res interface{}, durationMs float64) *ExecutionResult {
	if res == nil {
		return &ExecutionResult{
			Command:    cmd,
			Type:       "nil",
			Raw:        nil,
			Formatted:  "(nil)",
			DurationMs: durationMs,
		}
	}

	switch v := res.(type) {
	case string:
		return &ExecutionResult{
			Command:    cmd,
			Type:       "string",
			Raw:        v,
			Formatted:  fmt.Sprintf("\"%s\"", v),
			DurationMs: durationMs,
		}
	case int64:
		return &ExecutionResult{
			Command:    cmd,
			Type:       "integer",
			Raw:        v,
			Formatted:  fmt.Sprintf("(integer) %d", v),
			DurationMs: durationMs,
		}
	case int:
		return &ExecutionResult{
			Command:    cmd,
			Type:       "integer",
			Raw:        v,
			Formatted:  fmt.Sprintf("(integer) %d", v),
			DurationMs: durationMs,
		}
	case []string:
		var sb strings.Builder
		for i, s := range v {
			sb.WriteString(fmt.Sprintf("%d) \"%s\"\n", i+1, s))
		}
		return &ExecutionResult{
			Command:    cmd,
			Type:       "array",
			Raw:        v,
			Formatted:  strings.TrimRight(sb.String(), "\n"),
			DurationMs: durationMs,
		}
	case []interface{}:
		var sb strings.Builder
		for i, s := range v {
			sb.WriteString(fmt.Sprintf("%d) %v\n", i+1, s))
		}
		return &ExecutionResult{
			Command:    cmd,
			Type:       "array",
			Raw:        v,
			Formatted:  strings.TrimRight(sb.String(), "\n"),
			DurationMs: durationMs,
		}
	default:
		return &ExecutionResult{
			Command:    cmd,
			Type:       "string",
			Raw:        v,
			Formatted:  fmt.Sprintf("%v", v),
			DurationMs: durationMs,
		}
	}
}
