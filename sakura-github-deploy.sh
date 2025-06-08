#!/bin/bash

# One-command GitHub deployment for Sakura Cloud
# Usage: curl -fsSL https://raw.githubusercontent.com/username/repo/main/sakura-github-deploy.sh | bash
# Or: wget -O - https://raw.githubusercontent.com/username/repo/main/sakura-github-deploy.sh | bash

set -e

# Configuration
REPO_URL="${GITHUB_REPO:-https://github.com/yourusername/backspace-fm.git}"
APP_NAME="backspace-fm"
PORT="5000"
DATA_DIR="/opt/backspace-fm-data"

echo "=== Sakura Cloud One-Command Deployment ==="
echo "Repository: $REPO_URL"
echo "Port: $PORT"
echo "Data Directory: $DATA_DIR"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "Please run as ubuntu user, not root"
    exit 1
fi

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
    rm get-docker.sh
    echo "Docker installed. Please log out and log back in, then run this script again."
    exit 0
fi

# Stop and remove existing container
echo "Cleaning up existing deployment..."
docker stop $APP_NAME 2>/dev/null || true
docker rm $APP_NAME 2>/dev/null || true
docker rmi $APP_NAME:latest 2>/dev/null || true

# Create persistent data directory
echo "Setting up data persistence..."
sudo mkdir -p $DATA_DIR/persistent $DATA_DIR/backups
sudo chown -R ubuntu:ubuntu $DATA_DIR
sudo chmod -R 755 $DATA_DIR

# Clone or update repository
echo "Updating application code..."
if [ -d "$APP_NAME" ]; then
    cd $APP_NAME
    git pull origin main
    cd ..
else
    git clone $REPO_URL $APP_NAME
fi

# Build and deploy
echo "Building application..."
cd $APP_NAME
docker build -t $APP_NAME:latest . --no-cache

echo "Starting application..."
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
echo "Waiting for application startup..."
sleep 15

# Health check
echo "Performing health check..."
for i in {1..10}; do
    if curl -f http://localhost:$PORT/api/version >/dev/null 2>&1; then
        echo "✅ Deployment successful!"
        echo ""
        echo "🌐 Application URL: http://$(curl -s ifconfig.me):$PORT"
        echo "📊 Health Check: http://$(curl -s ifconfig.me):$PORT/api/version"
        echo "💾 Data Directory: $DATA_DIR"
        echo ""
        echo "Management commands:"
        echo "  View logs: docker logs $APP_NAME"
        echo "  Restart: docker restart $APP_NAME"
        echo "  Stop: docker stop $APP_NAME"
        echo "  Update: cd $APP_NAME && git pull && docker build -t $APP_NAME:latest . && docker stop $APP_NAME && docker rm $APP_NAME && docker run -d --name $APP_NAME --restart unless-stopped -p $PORT:5000 -v $DATA_DIR:/app/data -e NODE_ENV=production $APP_NAME:latest"
        exit 0
    fi
    echo "Waiting for startup... (attempt $i/10)"
    sleep 3
done

echo "❌ Deployment failed - checking logs..."
docker logs $APP_NAME
exit 1