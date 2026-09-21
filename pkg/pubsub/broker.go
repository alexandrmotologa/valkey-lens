package pubsub

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
)

// Broker coordinates pub/sub subscriptions and active listeners.
type Broker struct {
	client client.Client
	mu     sync.RWMutex
}

// NewBroker creates a new pub/sub broker.
func NewBroker(c client.Client) *Broker {
	return &Broker{client: c}
}

// Subscribe streams messages on channels and patterns to the listener channel.
func (b *Broker) Subscribe(ctx context.Context, channels []string, patterns []string, out chan<- client.PubSubMessage) error {
	return b.client.Subscribe(ctx, channels, patterns, out)
}

// Publish broadcasts a message to a channel.
func (b *Broker) Publish(ctx context.Context, channel, message string) (int64, error) {
	if b.client.IsReadOnly() {
		return 0, fmt.Errorf("cannot publish message: server is in read-only mode")
	}
	return b.client.Publish(ctx, channel, message)
}

// ActiveMessage is an enriched pub/sub event for UI streaming.
type EnrichedMessage struct {
	ID        int64     `json:"id"`
	Channel   string    `json:"channel"`
	Pattern   string    `json:"pattern,omitempty"`
	Payload   string    `json:"payload"`
	Length    int       `json:"length"`
	Timestamp time.Time `json:"timestamp"`
	IsJSON    bool      `json:"is_json"`
}
