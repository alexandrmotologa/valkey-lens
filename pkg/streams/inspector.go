package streams

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
)

// Inspector coordinates stream inspection and consumer group monitoring.
type Inspector struct {
	client client.Client
}

// NewInspector creates a new stream inspector.
func NewInspector(cli client.Client) *Inspector {
	return &Inspector{client: cli}
}

// GetStreamDetail retrieves recent entries and group lag for a stream.
func (in *Inspector) GetStreamDetail(ctx context.Context, key string, limit int64) (*StreamDetail, error) {
	if limit <= 0 {
		limit = 50
	}

	detail := &StreamDetail{
		Key:     key,
		Groups:  make([]ConsumerGroup, 0),
		Entries: make([]StreamMessage, 0),
	}

	// 1. Mock Client handling
	if mock, ok := in.client.(*client.MockClient); ok {
		mockKey, err := mock.GetKeyDetail(key)
		if err != nil {
			return nil, err
		}
		if mockKey.Type != "stream" {
			return nil, fmt.Errorf("key '%s' is not a stream (type: %s)", key, mockKey.Type)
		}

		msgs := mockKey.Value.([]client.MockStreamMessage)
		detail.Length = int64(len(msgs))
		if len(msgs) > 0 {
			detail.FirstEntryID = msgs[0].ID
			detail.LastEntryID = msgs[len(msgs)-1].ID
		}

		// Entries in reverse chronological order
		for i := len(msgs) - 1; i >= 0; i-- {
			sm := msgs[i]
			detail.Entries = append(detail.Entries, StreamMessage{
				ID:        sm.ID,
				Fields:    sm.Fields,
				Timestamp: sm.Timestamp.UnixMilli(),
			})
			if int64(len(detail.Entries)) >= limit {
				break
			}
		}

		groupsMap := mock.GetStreamGroups(key)
		for _, grp := range groupsMap {
			detail.Groups = append(detail.Groups, ConsumerGroup{
				Name:            grp.Name,
				Consumers:       int64(len(grp.Consumers)),
				Pending:         int64(len(grp.Pending)),
				LastDeliveredID: grp.LastDelivered,
				Lag:             0,
			})
		}
		return detail, nil
	}

	// 2. Real Database handling
	// Query length
	xlenRes, err := in.client.Do(ctx, "XLEN", key)
	if err == nil {
		if l, ok := xlenRes.(int64); ok {
			detail.Length = l
		}
	}

	// Query entries via XREVRANGE
	entriesRes, err := in.client.Do(ctx, "XREVRANGE", key, "+", "-", "COUNT", strconv.FormatInt(limit, 10))
	if err == nil {
		// Parse standard RESP arrays: [[id, [k1, v1, k2, v2]], ...]
		if rawEntries, ok := entriesRes.([]interface{}); ok {
			for _, item := range rawEntries {
				if pair, ok := item.([]interface{}); ok && len(pair) >= 2 {
					idStr := fmt.Sprintf("%v", pair[0])
					fieldsMap := make(map[string]string)
					if fieldList, ok := pair[1].([]interface{}); ok {
						for f := 0; f < len(fieldList)-1; f += 2 {
							k := fmt.Sprintf("%v", fieldList[f])
							v := fmt.Sprintf("%v", fieldList[f+1])
							fieldsMap[k] = v
						}
					}
					ts := parseStreamTimestamp(idStr)
					detail.Entries = append(detail.Entries, StreamMessage{
						ID:        idStr,
						Fields:    fieldsMap,
						Timestamp: ts,
					})
				}
			}
		}
	}

	// Query consumer groups via XINFO GROUPS
	groupsRes, err := in.client.Do(ctx, "XINFO", "GROUPS", key)
	if err == nil {
		if rawGroups, ok := groupsRes.([]interface{}); ok {
			for _, gItem := range rawGroups {
				cg := parseGroupInfo(gItem)
				detail.Groups = append(detail.Groups, cg)
			}
		}
	}

	return detail, nil
}

// GetPendingEntries retrieves unacknowledged messages for a consumer group.
func (in *Inspector) GetPendingEntries(ctx context.Context, key, group string, limit int64) ([]PendingEntry, error) {
	if limit <= 0 {
		limit = 50
	}

	// 1. Mock Client handling
	if mock, ok := in.client.(*client.MockClient); ok {
		groups := mock.GetStreamGroups(key)
		grp, ok := groups[group]
		if !ok {
			return []PendingEntry{}, nil
		}
		res := make([]PendingEntry, 0, len(grp.Pending))
		for _, p := range grp.Pending {
			res = append(res, PendingEntry{
				ID:            p.ID,
				Consumer:      p.Consumer,
				IdleTimeMs:    p.IdleTimeMs,
				DeliveryCount: p.DeliveryCount,
			})
			if int64(len(res)) >= limit {
				break
			}
		}
		return res, nil
	}

	// 2. Real Database handling: XPENDING key group - + limit
	res, err := in.client.Do(ctx, "XPENDING", key, group, "-", "+", strconv.FormatInt(limit, 10))
	if err != nil {
		return nil, err
	}

	pendingList := make([]PendingEntry, 0)
	if rawList, ok := res.([]interface{}); ok {
		for _, item := range rawList {
			// Format: [id, consumer, idle_ms, delivery_count]
			if fields, ok := item.([]interface{}); ok && len(fields) >= 4 {
				id := fmt.Sprintf("%v", fields[0])
				consumer := fmt.Sprintf("%v", fields[1])
				idle, _ := strconv.ParseInt(fmt.Sprintf("%v", fields[2]), 10, 64)
				deliveries, _ := strconv.ParseInt(fmt.Sprintf("%v", fields[3]), 10, 64)

				pendingList = append(pendingList, PendingEntry{
					ID:            id,
					Consumer:      consumer,
					IdleTimeMs:    idle,
					DeliveryCount: deliveries,
				})
			}
		}
	}

	return pendingList, nil
}

func parseStreamTimestamp(id string) int64 {
	parts := strings.Split(id, "-")
	if len(parts) > 0 {
		ts, _ := strconv.ParseInt(parts[0], 10, 64)
		return ts
	}
	return 0
}

func parseGroupInfo(item interface{}) ConsumerGroup {
	cg := ConsumerGroup{}
	if kvList, ok := item.([]interface{}); ok {
		for i := 0; i < len(kvList)-1; i += 2 {
			k := fmt.Sprintf("%v", kvList[i])
			v := kvList[i+1]
			switch k {
			case "name":
				cg.Name = fmt.Sprintf("%v", v)
			case "consumers":
				if num, ok := v.(int64); ok {
					cg.Consumers = num
				}
			case "pending":
				if num, ok := v.(int64); ok {
					cg.Pending = num
				}
			case "last-delivered-id":
				cg.LastDeliveredID = fmt.Sprintf("%v", v)
			case "lag":
				if num, ok := v.(int64); ok {
					cg.Lag = num
				}
			}
		}
	}
	return cg
}
