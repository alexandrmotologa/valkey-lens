package main

import (
	"embed"

	"github.com/alexandrmotologa/valkey-lens/cmd"
)

//go:embed all:ui/dist
var embeddedFS embed.FS

const Version = "0.1.0"

func main() {
	cmd.Execute(embeddedFS, Version)
}
