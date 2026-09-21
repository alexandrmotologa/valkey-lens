package explorer

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
)

// CRUDManager executes safe data manipulation and inspection.
type CRUDManager struct {
	client client.Client
}

// NewCRUDManager creates a new CRUD manager.
func NewCRUDManager(cli client.Client) *CRUDManager {
	return &CRUDManager{client: cli}
}

// GetKeyDetail retrieves complete value representation and metadata for a key.
func (c *CRUDManager) GetKeyDetail(ctx context.Context, key string) (*KeyDetail, error) {
	kType, err := c.client.Type(ctx, key)
	if err != nil {
		return nil, err
	}
	if kType == "none" {
		return nil, client.ErrKeyNotFound
	}

	ttlMs, _ := c.client.PTTL(ctx, key)
	memBytes, _ := c.client.MemoryUsage(ctx, key, 0)

	detail := &KeyDetail{
		Name:        key,
		Type:        kType,
		TTLMs:       ttlMs,
		MemoryBytes: memBytes,
	}

	// For mock client, we can retrieve native values directly if needed
	if mock, ok := c.client.(*client.MockClient); ok {
		mockKey, err := mock.GetKeyDetail(key)
		if err == nil {
			detail.Value = mockKey.Value
			switch kType {
			case "string":
				str := mockKey.Value.(string)
				detail.Length = int64(len(str))
				detail.IsJSON = IsValidJSON(str)
			case "hash":
				h := mockKey.Value.(map[string]string)
				detail.Length = int64(len(h))
			case "list":
				l := mockKey.Value.([]string)
				detail.Length = int64(len(l))
			case "set":
				s := mockKey.Value.(map[string]struct{})
				detail.Length = int64(len(s))
				members := make([]string, 0, len(s))
				for m := range s {
					members = append(members, m)
				}
				detail.Value = members
			case "zset":
				zs := mockKey.Value.([]client.MockZMember)
				detail.Length = int64(len(zs))
				items := make([]ZSetItem, len(zs))
				for i, z := range zs {
					items[i] = ZSetItem{Member: z.Member, Score: z.Score}
				}
				detail.Value = items
			case "stream":
				st := mockKey.Value.([]client.MockStreamMessage)
				detail.Length = int64(len(st))
				msgs := make([]StreamMessage, len(st))
				for i, sm := range st {
					msgs[i] = StreamMessage{
						ID:        sm.ID,
						Fields:    sm.Fields,
						Timestamp: sm.Timestamp.UnixMilli(),
					}
				}
				detail.Value = msgs
			}
			return detail, nil
		}
	}

	// Standard command-based retrieval for real database
	switch kType {
	case "string":
		val, err := c.client.Do(ctx, "GET", key)
		if err != nil {
			return nil, err
		}
		strVal := fmt.Sprintf("%v", val)
		detail.Value = strVal
		detail.Length = int64(len(strVal))
		detail.IsJSON = IsValidJSON(strVal)

	case "hash":
		val, err := c.client.Do(ctx, "HGETALL", key)
		if err != nil {
			return nil, err
		}
		fields := make(map[string]string)
		if arr, ok := val.([]string); ok {
			for i := 0; i < len(arr)-1; i += 2 {
				fields[arr[i]] = arr[i+1]
			}
		}
		detail.Value = fields
		detail.Length = int64(len(fields))

	case "list":
		val, err := c.client.Do(ctx, "LRANGE", key, "0", "-1")
		if err != nil {
			return nil, err
		}
		if arr, ok := val.([]string); ok {
			detail.Value = arr
			detail.Length = int64(len(arr))
		} else {
			detail.Value = []string{}
		}

	case "set":
		val, err := c.client.Do(ctx, "SMEMBERS", key)
		if err != nil {
			return nil, err
		}
		if arr, ok := val.([]string); ok {
			detail.Value = arr
			detail.Length = int64(len(arr))
		} else {
			detail.Value = []string{}
		}

	case "zset":
		val, err := c.client.Do(ctx, "ZRANGE", key, "0", "-1", "WITHSCORES")
		if err != nil {
			return nil, err
		}
		var items []ZSetItem
		if arr, ok := val.([]string); ok {
			for i := 0; i < len(arr)-1; i += 2 {
				score, _ := strconv.ParseFloat(arr[i+1], 64)
				items = append(items, ZSetItem{
					Member: arr[i],
					Score:  score,
				})
			}
		}
		detail.Value = items
		detail.Length = int64(len(items))

	case "stream":
		// Fetch recent 50 entries
		val, err := c.client.Do(ctx, "XREVRANGE", key, "+", "-", "COUNT", "50")
		if err != nil {
			detail.Value = []StreamMessage{}
		} else {
			detail.Value = val
		}
	}

	return detail, nil
}

// SetString stores a string value with optional TTL.
func (c *CRUDManager) SetString(ctx context.Context, key, val string, ttlSec int64) error {
	args := []string{"SET", key, val}
	if ttlSec > 0 {
		args = append(args, "EX", strconv.FormatInt(ttlSec, 10))
	}
	_, err := c.client.Do(ctx, args...)
	return err
}

// DeleteKey removes a key.
func (c *CRUDManager) DeleteKey(ctx context.Context, key string) error {
	_, err := c.client.Do(ctx, "DEL", key)
	return err
}

// UpdateTTL sets or removes the key's expiration.
func (c *CRUDManager) UpdateTTL(ctx context.Context, key string, ttlSec int64) error {
	if ttlSec <= 0 {
		// Persist key (remove ttl)
		_, err := c.client.Do(ctx, "PERSIST", key)
		return err
	}
	_, err := c.client.Do(ctx, "EXPIRE", key, strconv.FormatInt(ttlSec, 10))
	return err
}

// HSet sets a field in a hash.
func (c *CRUDManager) HSet(ctx context.Context, key, field, value string) error {
	_, err := c.client.Do(ctx, "HSET", key, field, value)
	return err
}

// HDel removes a field from a hash.
func (c *CRUDManager) HDel(ctx context.Context, key, field string) error {
	_, err := c.client.Do(ctx, "HDEL", key, field)
	return err
}

// SAdd adds members to a set.
func (c *CRUDManager) SAdd(ctx context.Context, key string, members ...string) error {
	args := append([]string{"SADD", key}, members...)
	_, err := c.client.Do(ctx, args...)
	return err
}

// SRem removes members from a set.
func (c *CRUDManager) SRem(ctx context.Context, key string, members ...string) error {
	args := append([]string{"SREM", key}, members...)
	_, err := c.client.Do(ctx, args...)
	return err
}

// LPush prepends items to a list.
func (c *CRUDManager) LPush(ctx context.Context, key string, items ...string) error {
	args := append([]string{"LPUSH", key}, items...)
	_, err := c.client.Do(ctx, args...)
	return err
}

// RPush appends items to a list.
func (c *CRUDManager) RPush(ctx context.Context, key string, items ...string) error {
	args := append([]string{"RPUSH", key}, items...)
	_, err := c.client.Do(ctx, args...)
	return err
}

// ZAdd adds a member with score to a sorted set.
func (c *CRUDManager) ZAdd(ctx context.Context, key string, score float64, member string) error {
	_, err := c.client.Do(ctx, "ZADD", key, strconv.FormatFloat(score, 'f', -1, 64), member)
	return err
}

// ZRem removes a member from a sorted set.
func (c *CRUDManager) ZRem(ctx context.Context, key string, member string) error {
	_, err := c.client.Do(ctx, "ZREM", key, member)
	return err
}

// ExpireSimulator calculates future expiry time.
func ExpireSimulator(ttlMs int64) *time.Time {
	if ttlMs <= 0 {
		return nil
	}
	t := time.Now().Add(time.Duration(ttlMs) * time.Millisecond)
	return &t
}
