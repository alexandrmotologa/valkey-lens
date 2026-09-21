package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/alexandrmotologa/valkey-lens/pkg/cluster"
	"github.com/alexandrmotologa/valkey-lens/server/middleware"
)

type ClusterHandler struct {
	resolver *cluster.Resolver
}

func NewClusterHandler(r *cluster.Resolver) *ClusterHandler {
	return &ClusterHandler{resolver: r}
}

// Topology handles GET /api/cluster/topology
func (h *ClusterHandler) Topology(w http.ResponseWriter, r *http.Request) {
	report, err := h.resolver.GetTopology(r.Context())
	if err != nil {
		middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(report)
}

// SlotLookup handles GET /api/cluster/slot?key=user:{1000}:profile
func (h *ClusterHandler) SlotLookup(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if key == "" {
		middleware.WriteError(w, http.StatusBadRequest, "Missing 'key' query parameter")
		return
	}

	slot, hashTag := cluster.CalculateSlot(key)
	res := cluster.SlotLookupResult{
		Key:     key,
		HashTag: hashTag,
		Slot:    slot,
	}

	// Try finding owning node
	report, err := h.resolver.GetTopology(r.Context())
	if err == nil && report != nil {
		for _, node := range report.Nodes {
			for _, sr := range node.Slots {
				if slot >= sr.Start && slot <= sr.End {
					res.NodeID = node.ID
					res.NodeAddr = node.Address
					break
				}
			}
			if res.NodeID != "" {
				break
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(res)
}
