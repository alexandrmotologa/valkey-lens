package profiler

import (
	"sort"
	"strings"
)

// NamespaceNode represents a segment in the memory prefix tree.
type NamespaceNode struct {
	Name            string            `json:"name"`
	FullPath        string            `json:"full_path"`
	KeyCount        int64             `json:"key_count"`
	TotalBytes      int64             `json:"total_bytes"`
	Percentage      float64           `json:"percentage"`
	VolatileCount   int64             `json:"volatile_count"`   // keys with expiry
	PersistentCount int64             `json:"persistent_count"` // keys with no expiry (potential leak)
	Children        []*NamespaceNode  `json:"children,omitempty"`
	childrenMap     map[string]*NamespaceNode `json:"-"`
}

// PrefixTree organizes keys into hierarchical namespace buckets.
type PrefixTree struct {
	Root      *NamespaceNode
	Delimiter string
}

// NewPrefixTree initializes a prefix tree with a given delimiter.
func NewPrefixTree(delimiter string) *PrefixTree {
	if delimiter == "" {
		delimiter = ":"
	}
	return &PrefixTree{
		Delimiter: delimiter,
		Root: &NamespaceNode{
			Name:        "root",
			FullPath:    "",
			childrenMap: make(map[string]*NamespaceNode),
		},
	}
}

// Insert adds a key, its memory footprint, and expiration status into the tree.
func (t *PrefixTree) Insert(key string, bytes int64, hasTTL bool) {
	t.Root.KeyCount++
	t.Root.TotalBytes += bytes
	if hasTTL {
		t.Root.VolatileCount++
	} else {
		t.Root.PersistentCount++
	}

	parts := strings.Split(key, t.Delimiter)
	if len(parts) <= 1 {
		// Key without delimiter placed under (root)
		part := "(unnamespaced)"
		child := t.getOrCreateChild(t.Root, part, part)
		child.KeyCount++
		child.TotalBytes += bytes
		if hasTTL {
			child.VolatileCount++
		} else {
			child.PersistentCount++
		}
		return
	}

	// Insert each namespace segment (excluding the final unique key id)
	current := t.Root
	pathBuilder := ""
	for i := 0; i < len(parts)-1; i++ {
		part := parts[i]
		if pathBuilder == "" {
			pathBuilder = part
		} else {
			pathBuilder = pathBuilder + t.Delimiter + part
		}

		current = t.getOrCreateChild(current, part, pathBuilder)
		current.KeyCount++
		current.TotalBytes += bytes
		if hasTTL {
			current.VolatileCount++
		} else {
			current.PersistentCount++
		}
	}
}

func (t *PrefixTree) getOrCreateChild(parent *NamespaceNode, name, fullPath string) *NamespaceNode {
	if parent.childrenMap == nil {
		parent.childrenMap = make(map[string]*NamespaceNode)
	}
	child, exists := parent.childrenMap[name]
	if !exists {
		child = &NamespaceNode{
			Name:        name,
			FullPath:    fullPath,
			childrenMap: make(map[string]*NamespaceNode),
		}
		parent.childrenMap[name] = child
	}
	return child
}

// Finalize calculates percentages and converts maps to sorted slices.
func (t *PrefixTree) Finalize() {
	if t.Root.TotalBytes > 0 {
		t.Root.Percentage = 100.0
	}
	t.finalizeNode(t.Root, t.Root.TotalBytes)
}

func (t *PrefixTree) finalizeNode(node *NamespaceNode, totalRootBytes int64) {
	if len(node.childrenMap) == 0 {
		return
	}

	children := make([]*NamespaceNode, 0, len(node.childrenMap))
	for _, child := range node.childrenMap {
		if totalRootBytes > 0 {
			child.Percentage = (float64(child.TotalBytes) / float64(totalRootBytes)) * 100.0
		}
		t.finalizeNode(child, totalRootBytes)
		children = append(children, child)
	}

	// Sort children by TotalBytes descending
	sort.Slice(children, func(i, j int) bool {
		return children[i].TotalBytes > children[j].TotalBytes
	})

	node.Children = children
}

// FlattenTopNamespaces returns a flattened list of distinct top-level namespaces.
func (t *PrefixTree) FlattenTopNamespaces() []*NamespaceNode {
	list := make([]*NamespaceNode, 0)
	for _, child := range t.Root.Children {
		list = append(list, child)
		// Include 2nd level children if significant
		for _, sub := range child.Children {
			list = append(list, sub)
		}
	}
	sort.Slice(list, func(i, j int) bool {
		return list[i].TotalBytes > list[j].TotalBytes
	})
	return list
}
