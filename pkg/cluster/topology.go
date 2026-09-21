package cluster

import (
	"context"
	"strconv"
	"strings"

	"github.com/alexandrmotologa/valkey-lens/pkg/client"
)

// TotalSlots in standard Valkey/Redis cluster.
const TotalSlots = 16384

// SlotRange represents a contiguous range of hash slots [Start, End].
type SlotRange struct {
	Start int `json:"start"`
	End   int `json:"end"`
}

// ClusterNode represents an individual node in the cluster topology.
type ClusterNode struct {
	ID        string      `json:"id"`
	Address   string      `json:"address"`
	Flags     string      `json:"flags"`
	Role      string      `json:"role"` // master, replica
	MasterID  string      `json:"master_id,omitempty"`
	PingSent  int64       `json:"ping_sent"`
	PongRecv  int64       `json:"pong_recv"`
	ConfigEpoch int64     `json:"config_epoch"`
	LinkState string      `json:"link_state"` // connected, disconnected
	Slots     []SlotRange `json:"slots"`
	SlotCount int         `json:"slot_count"`
}

// TopologyReport represents the full cluster overview.
type TopologyReport struct {
	Nodes          []ClusterNode `json:"nodes"`
	TotalNodes     int           `json:"total_nodes"`
	MasterCount    int           `json:"master_count"`
	ReplicaCount   int           `json:"replica_count"`
	AssignedSlots  int           `json:"assigned_slots"`
	ClusterState   string        `json:"cluster_state"` // ok, fail
	IsCluster      bool          `json:"is_cluster"`
}

// SlotLookupResult describes the mapping for a specific key.
type SlotLookupResult struct {
	Key        string `json:"key"`
	HashTag    string `json:"hash_tag,omitempty"`
	Slot       int    `json:"slot"`
	NodeID     string `json:"node_id,omitempty"`
	NodeAddr   string `json:"node_addr,omitempty"`
}

// Resolver queries and processes cluster topology.
type Resolver struct {
	client client.Client
}

// NewResolver creates a new cluster topology resolver.
func NewResolver(c client.Client) *Resolver {
	return &Resolver{client: c}
}

// GetTopology queries the cluster topology from the active node.
func (r *Resolver) GetTopology(ctx context.Context) (*TopologyReport, error) {
	raw, err := r.client.ClusterNodes(ctx)
	if err != nil {
		// Non-cluster mode fallback
		return &TopologyReport{
			Nodes:         []ClusterNode{},
			TotalNodes:    1,
			MasterCount:   1,
			ReplicaCount:  0,
			AssignedSlots: TotalSlots,
			ClusterState:  "standalone",
			IsCluster:     false,
		}, nil
	}

	return ParseClusterNodes(raw), nil
}

// ParseClusterNodes parses the standard CLUSTER NODES output.
func ParseClusterNodes(raw string) *TopologyReport {
	lines := strings.Split(strings.TrimSpace(raw), "\n")
	report := &TopologyReport{
		Nodes:        make([]ClusterNode, 0, len(lines)),
		ClusterState: "ok",
		IsCluster:    true,
	}

	totalAssigned := 0
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		fields := strings.Fields(line)
		if len(fields) < 8 {
			continue
		}

		node := ClusterNode{
			ID:        fields[0],
			Address:   fields[1],
			Flags:     fields[2],
			MasterID:  fields[3],
			LinkState: fields[7],
			Slots:     make([]SlotRange, 0),
		}

		// Role detection
		if strings.Contains(node.Flags, "master") {
			node.Role = "master"
			report.MasterCount++
		} else {
			node.Role = "replica"
			report.ReplicaCount++
		}

		if strings.Contains(node.Flags, "fail") {
			report.ClusterState = "fail"
		}

		// Parse slots if master (fields from index 8 onwards)
		for i := 8; i < len(fields); i++ {
			slotToken := fields[i]
			// Ignore migrating / importing tokens like [123->-nodeid]
			if strings.HasPrefix(slotToken, "[") {
				continue
			}

			if strings.Contains(slotToken, "-") {
				parts := strings.SplitN(slotToken, "-", 2)
				start, err1 := strconv.Atoi(parts[0])
				end, err2 := strconv.Atoi(parts[1])
				if err1 == nil && err2 == nil {
					node.Slots = append(node.Slots, SlotRange{Start: start, End: end})
					node.SlotCount += (end - start + 1)
					totalAssigned += (end - start + 1)
				}
			} else {
				single, err := strconv.Atoi(slotToken)
				if err == nil {
					node.Slots = append(node.Slots, SlotRange{Start: single, End: single})
					node.SlotCount++
					totalAssigned++
				}
			}
		}

		report.Nodes = append(report.Nodes, node)
	}

	report.TotalNodes = len(report.Nodes)
	report.AssignedSlots = totalAssigned
	return report
}

// CalculateSlot returns the CRC16 hash slot for any key or hashtagged key.
func CalculateSlot(key string) (slot int, tag string) {
	tag = extractHashTag(key)
	hashInput := tag
	if hashInput == "" {
		hashInput = key
	}
	slot = int(crc16([]byte(hashInput)) % TotalSlots)
	return slot, tag
}

// extractHashTag extracts the substring between the first '{' and next '}'.
func extractHashTag(key string) string {
	s := strings.IndexByte(key, '{')
	if s == -1 {
		return ""
	}
	e := strings.IndexByte(key[s+1:], '}')
	if e == -1 || e == 0 {
		return ""
	}
	return key[s+1 : s+1+e]
}

// Redis CRC16 XMODEM lookup table.
var crc16Table = [256]uint16{
	0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7,
	0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef,
	0x1231, 0x0210, 0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6,
	0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de,
	0x2462, 0x3443, 0x0420, 0x1401, 0x64e6, 0x74c7, 0x44a4, 0x5485,
	0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d,
	0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6, 0x5695, 0x46b4,
	0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d, 0xc7bc,
	0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
	0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b,
	0x5af5, 0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12,
	0xdbfd, 0xcbdc, 0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
	0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41,
	0xedae, 0xfd8f, 0xcdec, 0xddcd, 0xad2a, 0xbd0b, 0x8d68, 0x9d49,
	0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70,
	0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a, 0x9f59, 0x8f78,
	0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e, 0xe16f,
	0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
	0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e,
	0x02b1, 0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256,
	0xb5ea, 0xa5cb, 0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d,
	0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447, 0x5424, 0x4405,
	0xa7db, 0xb7fa, 0x8799, 0x97b8, 0xe75f, 0xf77e, 0xc71d, 0xd73c,
	0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634,
	0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9, 0xb98a, 0xa9ab,
	0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882, 0x28a3,
	0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
	0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92,
	0xfd2e, 0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9,
	0x7c26, 0x6c07, 0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1,
	0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8,
	0x6e17, 0x7e36, 0x4e55, 0x5e74, 0x2e93, 0x3eb2, 0x0ed1, 0x1ef0,
}

func crc16(buf []byte) uint16 {
	var crc uint16 = 0
	for _, b := range buf {
		crc = (crc << 8) ^ crc16Table[byte(crc>>8)^b]
	}
	return crc
}
