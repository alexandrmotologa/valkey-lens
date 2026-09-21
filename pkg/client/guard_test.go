package client

import (
	"errors"
	"testing"
)

func TestCheckCommand(t *testing.T) {
	tests := []struct {
		name     string
		readOnly bool
		args     []string
		wantErr  bool
		errType  error
	}{
		{
			name:     "Keys * blocked",
			readOnly: false,
			args:     []string{"KEYS", "*"},
			wantErr:  true,
			errType:  ErrBlockedCommand,
		},
		{
			name:     "FlushAll blocked",
			readOnly: false,
			args:     []string{"FLUSHALL"},
			wantErr:  true,
			errType:  ErrBlockedCommand,
		},
		{
			name:     "FlushDB blocked",
			readOnly: false,
			args:     []string{"FLUSHDB"},
			wantErr:  true,
			errType:  ErrBlockedCommand,
		},
		{
			name:     "Shutdown blocked",
			readOnly: false,
			args:     []string{"SHUTDOWN"},
			wantErr:  true,
			errType:  ErrBlockedCommand,
		},
		{
			name:     "Ping allowed in normal mode",
			readOnly: false,
			args:     []string{"PING"},
			wantErr:  false,
		},
		{
			name:     "Set allowed in normal mode",
			readOnly: false,
			args:     []string{"SET", "foo", "bar"},
			wantErr:  false,
		},
		{
			name:     "Set blocked in read-only mode",
			readOnly: true,
			args:     []string{"SET", "foo", "bar"},
			wantErr:  true,
			errType:  ErrReadOnly,
		},
		{
			name:     "Del blocked in read-only mode",
			readOnly: true,
			args:     []string{"DEL", "foo"},
			wantErr:  true,
			errType:  ErrReadOnly,
		},
		{
			name:     "Get allowed in read-only mode",
			readOnly: true,
			args:     []string{"GET", "foo"},
			wantErr:  false,
		},
		{
			name:     "Config set blocked in read-only mode",
			readOnly: true,
			args:     []string{"CONFIG", "SET", "maxmemory", "100mb"},
			wantErr:  true,
			errType:  ErrReadOnly,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := CheckCommand(tt.readOnly, tt.args...)
			if (err != nil) != tt.wantErr {
				t.Fatalf("CheckCommand() error = %v, wantErr %v", err, tt.wantErr)
			}
			if tt.wantErr && tt.errType != nil {
				if !errors.Is(err, tt.errType) {
					t.Errorf("expected error type %v, got %v", tt.errType, err)
				}
			}
		})
	}
}
