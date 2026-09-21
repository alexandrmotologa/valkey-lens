package clients

import (
	"testing"
)

func TestParseClientList(t *testing.T) {
	raw := `id=42 addr=10.0.1.15:53210 fd=9 name=order-svc age=3600 idle=12 flags=N db=0 cmd=hgetall omem=1024 tot-mem=20480 user=default
id=43 addr=10.0.1.18:49112 fd=11 name=crawler age=120 idle=0 flags=S db=0 cmd=scan omem=0 tot-mem=8192 user=default`

	clients := ParseClientList(raw)
	if len(clients) != 2 {
		t.Fatalf("expected 2 clients, got %d", len(clients))
	}

	c1 := clients[0]
	if c1.ID != 42 || c1.Addr != "10.0.1.15:53210" || c1.Name != "order-svc" || c1.Cmd != "hgetall" || c1.OMem != 1024 {
		t.Errorf("unexpected client 1 values: %+v", c1)
	}

	c2 := clients[1]
	if c2.ID != 43 || c2.Addr != "10.0.1.18:49112" || c2.Name != "crawler" || c2.Cmd != "scan" {
		t.Errorf("unexpected client 2 values: %+v", c2)
	}
}
