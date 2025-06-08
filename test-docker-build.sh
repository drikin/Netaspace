#!/bin/bash

# Test Docker build locally
set -e

APP_NAME="backspace-fm-test"

echo "=== Testing Docker Build ==="

# Clean up any existing test containers
docker stop $APP_NAME 2>/dev/null || true
docker rm $APP_NAME 2>/dev/null || true
docker rmi $APP_NAME:test 2>/dev/null || true

# Build the image
echo "Building Docker image..."
docker build -t $APP_NAME:test .

# Run the container
echo "Starting test container..."
docker run -d \
    --name $APP_NAME \
    -p 5001:5000 \
    -e NODE_ENV=production \
    -e PERSISTENT_DB_PATH=/app/data/persistent/production.sqlite \
    -e BACKUP_DIR=/app/data/backups \
    $APP_NAME:test

# Wait for startup
echo "Waiting for startup..."
sleep 10

# Test the application
echo "Testing application..."
if curl -f http://localhost:5001/api/version >/dev/null 2>&1; then
    echo "✅ Docker build test successful!"
    VERSION=$(curl -s http://localhost:5001/api/version | grep -o '"app":"[^"]*"' | cut -d'"' -f4)
    echo "Application version: $VERSION"
else
    echo "❌ Docker build test failed"
    echo "Container logs:"
    docker logs $APP_NAME
    exit 1
fi

# Clean up
echo "Cleaning up test container..."
docker stop $APP_NAME
docker rm $APP_NAME
docker rmi $APP_NAME:test

echo "✅ Docker build verified successfully"