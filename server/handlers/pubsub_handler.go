package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
	"github.com/alexandrmotologa/valkey-lens/pkg/pubsub"
	"github.com/alexandrmotologa/valkey-lens/server/middleware"
)

type PubSubHandler struct {
	broker *pubsub.Broker
}

func NewPubSubHandler(b *pubsub.Broker) *PubSubHandler {
	return &PubSubHandler{broker: b}
}

// Publish broadcasts a message to a channel: POST /api/pubsub/publish
func (h *PubSubHandler) Publish(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Channel string `json:"channel"`
		Message string `json:"message"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Channel == "" {
		middleware.WriteError(w, http.StatusBadRequest, "Invalid request body: channel is required")
		return
	}

	receivers, err := h.broker.Publish(r.Context(), body.Channel, body.Message)
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	middleware.WriteJSON(w, http.StatusOK, map[string]interface{}{
		"success":   true,
		"receivers": receivers,
	})
}

// Stream handles GET /api/pubsub/stream?channels=c1,c2&patterns=p1*,p2*
func (h *PubSubHandler) Stream(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	channelsParam := r.URL.Query().Get("channels")
	patternsParam := r.URL.Query().Get("patterns")

	var channels []string
	if channelsParam != "" {
		for _, c := range strings.Split(channelsParam, ",") {
			trimmed := strings.TrimSpace(c)
			if trimmed != "" {
				channels = append(channels, trimmed)
			}
		}
	}

	var patterns []string
	if patternsParam != "" {
		for _, p := range strings.Split(patternsParam, ",") {
			trimmed := strings.TrimSpace(p)
			if trimmed != "" {
				patterns = append(patterns, trimmed)
			}
		}
	}

	if len(channels) == 0 && len(patterns) == 0 {
		patterns = []string{"*"}
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	msgChan := make(chan client.PubSubMessage, 100)
	go func() {
		_ = h.broker.Subscribe(r.Context(), channels, patterns, msgChan)
	}()

	// Send initial connected event
	fmt.Fprintf(w, "event: ready\ndata: {\"status\":\"connected\",\"channels\":%d,\"patterns\":%d}\n\n", len(channels), len(patterns))
	flusher.Flush()

	heartbeat := time.NewTicker(15 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-heartbeat.C:
			fmt.Fprintf(w, ": heartbeat\n\n")
			flusher.Flush()
		case msg, ok := <-msgChan:
			if !ok {
				return
			}
			isJSON := false
			var js json.RawMessage
			if json.Unmarshal([]byte(msg.Payload), &js) == nil {
				isJSON = true
			}

			enriched := pubsub.EnrichedMessage{
				ID:        time.Now().UnixNano(),
				Channel:   msg.Channel,
				Pattern:   msg.Pattern,
				Payload:   msg.Payload,
				Length:    len(msg.Payload),
				Timestamp: time.Now(),
				IsJSON:    isJSON,
			}

			data, err := json.Marshal(enriched)
			if err == nil {
				fmt.Fprintf(w, "event: message\ndata: %s\n\n", data)
				flusher.Flush()
			}
		}
	}
}
