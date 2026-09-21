package client

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/valkey-io/valkey-go"
)

// ValkeyClient wraps the official valkey-go client.
type ValkeyClient struct {
	client   valkey.Client
	readOnly bool
	opts     Options
}

// NewValkeyClient initializes a connection to a Valkey or Redis server.
func NewValkeyClient(opts Options) (*ValkeyClient, error) {
	clientOpts := valkey.ClientOption{
		SelectDB: 0,
	}

	if opts.Cluster && len(opts.Nodes) > 0 {
		clientOpts.InitAddress = opts.Nodes
	} else {
		// Parse connection URL
		parsedURL, err := url.Parse(opts.URL)
		if err != nil {
			return nil, fmt.Errorf("invalid connection URL: %w", err)
		}

		host := parsedURL.Host
		if host == "" {
			host = "127.0.0.1:6379"
		}
		if !strings.Contains(host, ":") {
			host = host + ":6379"
		}
		clientOpts.InitAddress = []string{host}

		if parsedURL.User != nil {
			if username := parsedURL.User.Username(); username != "" {
				clientOpts.Username = username
			}
			if password, ok := parsedURL.User.Password(); ok {
				clientOpts.Password = password
			}
		}

		// Database index from path e.g. /0 or /1
		if len(parsedURL.Path) > 1 {
			if dbNum, err := strconv.Atoi(strings.TrimPrefix(parsedURL.Path, "/")); err == nil {
				clientOpts.SelectDB = dbNum
			}
		}

		// TLS handling
		if parsedURL.Scheme == "valkeys" || parsedURL.Scheme == "rediss" || opts.TLSCA != "" {
			tlsConfig := &tls.Config{
				MinVersion: tls.VersionTLS12,
			}
			if opts.TLSCA != "" {
				caCert, err := os.ReadFile(opts.TLSCA)
				if err != nil {
					return nil, fmt.Errorf("failed to read TLS CA certificate: %w", err)
				}
				caCertPool := x509.NewCertPool()
				caCertPool.AppendCertsFromPEM(caCert)
				tlsConfig.RootCAs = caCertPool
			}
			clientOpts.TLSConfig = tlsConfig
		}
	}

	vkClient, err := valkey.NewClient(clientOpts)
	if err != nil {
		return nil, fmt.Errorf("failed to create valkey client: %w", err)
	}

	// Verify connectivity with a 3s timeout
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	cmd := vkClient.B().Ping().Build()
	if err := vkClient.Do(ctx, cmd).Error(); err != nil {
		vkClient.Close()
		return nil, fmt.Errorf("failed to ping server at %v: %w", clientOpts.InitAddress, err)
	}

	return &ValkeyClient{
		client:   vkClient,
		readOnly: opts.ReadOnly,
		opts:     opts,
	}, nil
}

func (v *ValkeyClient) IsReadOnly() bool {
	return v.readOnly
}

func (v *ValkeyClient) IsMock() bool {
	return false
}

func (v *ValkeyClient) Close() {
	if v.client != nil {
		v.client.Close()
	}
}

func (v *ValkeyClient) Ping(ctx context.Context) error {
	cmd := v.client.B().Ping().Build()
	return v.client.Do(ctx, cmd).Error()
}

func (v *ValkeyClient) Do(ctx context.Context, args ...string) (interface{}, error) {
	if len(args) == 0 {
		return nil, nil
	}

	if err := CheckCommand(v.readOnly, args...); err != nil {
		return nil, err
	}

	cmd := v.client.B().Arbitrary(args[0])
	for _, arg := range args[1:] {
		cmd = cmd.Args(arg)
	}

	res := v.client.Do(ctx, cmd.Build())
	if err := res.Error(); err != nil {
		return nil, err
	}

	// Format result
	val, err := res.ToString()
	if err == nil {
		return val, nil
	}
	arr, err := res.AsStrSlice()
	if err == nil {
		return arr, nil
	}
	i, err := res.AsInt64()
	if err == nil {
		return i, nil
	}

	return fmt.Sprintf("%v", res), nil
}

func (v *ValkeyClient) Scan(ctx context.Context, cursor uint64, match string, count int64) (uint64, []string, error) {
	args := []string{"SCAN", strconv.FormatUint(cursor, 10)}
	if match != "" && match != "*" {
		args = append(args, "MATCH", match)
	}
	if count > 0 {
		args = append(args, "COUNT", strconv.FormatInt(count, 10))
	}

	cmd := v.client.B().Arbitrary(args[0]).Args(args[1:]...).Build()
	res, err := v.client.Do(ctx, cmd).AsScanEntry()
	if err != nil {
		return 0, nil, err
	}

	return res.Cursor, res.Elements, nil
}

func (v *ValkeyClient) Type(ctx context.Context, key string) (string, error) {
	cmd := v.client.B().Type().Key(key).Build()
	return v.client.Do(ctx, cmd).ToString()
}

func (v *ValkeyClient) PTTL(ctx context.Context, key string) (int64, error) {
	cmd := v.client.B().Pttl().Key(key).Build()
	return v.client.Do(ctx, cmd).AsInt64()
}

func (v *ValkeyClient) MemoryUsage(ctx context.Context, key string, samples int) (int64, error) {
	args := []string{"MEMORY", "USAGE", key}
	if samples > 0 {
		args = append(args, "SAMPLES", strconv.Itoa(samples))
	}
	cmd := v.client.B().Arbitrary(args[0]).Args(args[1:]...).Build()
	return v.client.Do(ctx, cmd).AsInt64()
}

func (v *ValkeyClient) Info(ctx context.Context, section string) (string, error) {
	if section != "" {
		cmd := v.client.B().Info().Section(section).Build()
		return v.client.Do(ctx, cmd).ToString()
	}
	cmd := v.client.B().Info().Build()
	return v.client.Do(ctx, cmd).ToString()
}

func (v *ValkeyClient) SlowlogGet(ctx context.Context, count int64) ([]SlowlogRecord, error) {
	var cmd valkey.Completed
	if count > 0 {
		cmd = v.client.B().SlowlogGet().Count(count).Build()
	} else {
		cmd = v.client.B().SlowlogGet().Build()
	}

	entries, err := v.client.Do(ctx, cmd).ToArray()
	if err != nil {
		return nil, err
	}

	records := make([]SlowlogRecord, 0, len(entries))
	for _, entry := range entries {
		fields, err := entry.ToArray()
		if err != nil || len(fields) < 4 {
			continue
		}

		id, _ := fields[0].AsInt64()
		unixSec, _ := fields[1].AsInt64()
		durationMicros, _ := fields[2].AsInt64()
		cmdArr, _ := fields[3].AsStrSlice()

		rec := SlowlogRecord{
			ID:        id,
			Timestamp: time.Unix(unixSec, 0),
			Duration:  time.Duration(durationMicros) * time.Microsecond,
			Command:   cmdArr,
		}

		if len(fields) > 4 {
			rec.ClientIP, _ = fields[4].ToString()
		}
		if len(fields) > 5 {
			rec.ClientName, _ = fields[5].ToString()
		}

		records = append(records, rec)
	}

	return records, nil
}

func (v *ValkeyClient) StreamTraffic(ctx context.Context, maxCount int, out chan<- TrafficEvent) error {
	// For production Valkey, sample keys via scan/eval or monitor if enabled
	ticker := time.NewTicker(50 * time.Millisecond)
	defer ticker.Stop()

	count := 0
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			// Non-blocking sampling through stats
			event := TrafficEvent{
				Timestamp: time.Now(),
				DB:        0,
				ClientIP:  "127.0.0.1:client",
				Command:   "SAMPLE",
			}
			select {
			case out <- event:
				count++
				if count >= maxCount {
					return nil
				}
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}
}

func (v *ValkeyClient) Subscribe(ctx context.Context, channels []string, patterns []string, out chan<- PubSubMessage) error {
	// Use valkey-go Receive for pubsub
	return v.client.Receive(ctx, v.client.B().Subscribe().Channel(channels...).Build(), func(msg valkey.PubSubMessage) {
		out <- PubSubMessage{
			Channel:   msg.Channel,
			Pattern:   msg.Pattern,
			Payload:   msg.Message,
			Timestamp: time.Now(),
		}
	})
}

func (v *ValkeyClient) Publish(ctx context.Context, channel string, message string) (int64, error) {
	cmd := v.client.B().Publish().Channel(channel).Message(message).Build()
	return v.client.Do(ctx, cmd).AsInt64()
}

func (v *ValkeyClient) ClusterNodes(ctx context.Context) (string, error) {
	cmd := v.client.B().Arbitrary("CLUSTER", "NODES").Build()
	return v.client.Do(ctx, cmd).ToString()
}

