package pubsub

import (
	"context"
	"testing"
	"time"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
)

func TestPubSubBroker(t *testing.T) {
	mockClient := client.NewMockClient(false)
	broker := NewBroker(mockClient)

	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	msgChan := make(chan client.PubSubMessage, 10)
	go func() {
		_ = broker.Subscribe(ctx, []string{"events:orders"}, nil, msgChan)
	}()

	receivers, err := broker.Publish(ctx, "events:orders", `{"status":"ok"}`)
	if err != nil {
		t.Fatalf("unexpected publish error: %v", err)
	}
	if receivers <= 0 {
		t.Errorf("expected positive receivers count, got %d", receivers)
	}
}
