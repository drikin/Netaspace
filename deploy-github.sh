#!/bin/bash

# GitHub-based deployment script for Sakura Cloud
# Usage: ./deploy-github.sh [github-repo-url]

set -e

# Configuration
REPO_URL="${1:-https://github.com/yourusername/backspace-fm.git}"
APP_NAME="backspace-fm"
PORT="5000"
DATA_DIR="/opt/backspace-fm-data"

echo "=== Sakura Cloud GitHub Deployment ==="
echo "Repository: $REPO_URL"
echo "Application: $APP_NAME"
echo "Port: $PORT"

# Stop existing containers
echo "=== Stopping existing containers ==="
docker stop $APP_NAME 2>/dev/null || true
docker rm $APP_NAME 2>/dev/null || true

# Create persistent data directory
echo "=== Setting up persistent storage ==="
sudo mkdir -p $DATA_DIR/persistent $DATA_DIR/backups
sudo chmod -R 755 $DATA_DIR

# Clone/update repository
echo "=== Updating repository ==="
if [ -d "$APP_NAME" ]; then
    cd $APP_NAME
    git pull origin main
else
    git clone $REPO_URL $APP_NAME
    cd $APP_NAME
fi

# Build and run with Docker
echo "=== Building application ==="
docker build -t $APP_NAME:latest .

echo "=== Starting application ==="
docker run -d \
    --name $APP_NAME \
    --restart unless-stopped \
    -p $PORT:5000 \
    -v $DATA_DIR:/app/data \
    -e NODE_ENV=production \
    -e PERSISTENT_DB_PATH=/app/data/persistent/production.sqlite \
    -e BACKUP_DIR=/app/data/backups \
    $APP_NAME:latest

# Wait for startup
echo "=== Waiting for startup ==="
sleep 10

# Health check
echo "=== Health check ==="
if curl -f http://localhost:$PORT/api/version; then
    echo "✅ Deployment successful!"
    echo "Application running at: http://localhost:$PORT"
    echo "Data directory: $DATA_DIR"
else
    echo "❌ Deployment failed - checking logs..."
    docker logs $APP_NAME
    exit 1
fi

# Show status
echo "=== Container status ==="
docker ps | grep $APP_NAME