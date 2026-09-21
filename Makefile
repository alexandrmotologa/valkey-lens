.PHONY: all build build-ui build-backend test run clean

BINARY_NAME=valkeylens
BIN_DIR=bin

all: build

build-ui:
	@echo "Building UI..."
	cd ui && npm install && npm run build

build-backend:
	@echo "Building Go backend..."
	@mkdir -p $(BIN_DIR)
	go build -ldflags="-s -w" -o $(BIN_DIR)/$(BINARY_NAME) .

build: build-ui build-backend
	@echo "Build complete: $(BIN_DIR)/$(BINARY_NAME)"

test:
	@echo "Running tests..."
	go test -v ./...

run:
	@echo "Starting ValkeyLens..."
	go run main.go --demo

clean:
	@echo "Cleaning artifacts..."
	rm -rf $(BIN_DIR)
	rm -rf ui/dist
