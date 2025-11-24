# MediaMine Video Player - Makefile

.PHONY: help install dev build package test test-e2e test-unit clean

# Default target
help:
	@echo "MediaMine Video Player - Available Commands:"
	@echo ""
	@echo "  make install    - Install all dependencies"
	@echo "  make dev        - Run development server with Electron"
	@echo "  make build      - Build production bundles"
	@echo "  make package    - Build and package application for distribution"
	@echo "  make test       - Run all tests (unit + e2e)"
	@echo "  make test-unit  - Run unit tests with Vitest"
	@echo "  make test-e2e   - Run E2E tests with Playwright"
	@echo "  make clean      - Clean build artifacts"
	@echo ""

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm install

# Run development server
dev:
	@echo "Starting development server..."
	npm run dev

# Build for production
build:
	@echo "Building for production..."
	npm run build

# Package application for distribution
package:
	@echo "Building and packaging application..."
	npm run package

# Run all tests
test: test-unit test-e2e

# Run unit tests
test-unit:
	@echo "Running unit tests with Vitest..."
	npm run test

# Run E2E tests
test-e2e:
	@echo "Running E2E tests with Playwright..."
	npm run test:e2e

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist release node_modules/.vite
	@echo "Clean complete!"
