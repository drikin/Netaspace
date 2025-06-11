#!/bin/bash

SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"
APP_DIR="/home/ubuntu/backspace-fm-app"

echo "Updating production source files..."

# Create source update package
tar czf source-update.tar.gz \
    client/src/App.tsx \
    client/src/components/header.tsx \
    client/src/pages/admin.tsx \
    server/routes.ts \
    server/storage.ts \
    package.json

scp -i $SSH_KEY source-update.tar.gz $SERVER_USER@$SERVER_HOST:$APP_DIR/

ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'UPDATE_EOF'
    cd /home/ubuntu/backspace-fm-app
    
    # Stop container
    docker-compose down
    
    # Update source files
    tar xzf source-update.tar.gz
    rm source-update.tar.gz
    
    # Remove compiled cache to force rebuild
    rm -rf dist/ node_modules/.cache/
    
    # Clear Docker build cache for this image only
    docker image rm backspace-fm-app-backspace-fm 2>/dev/null || true
    
    # Rebuild without cache
    docker-compose build --no-cache backspace-fm
    docker-compose up -d
    
    sleep 20
    docker-compose logs --tail=5 backspace-fm
UPDATE_EOF

rm source-update.tar.gz

# Test updated production
sleep 10
curl -s https://neta.backspace.fm/api/version

echo "Source update completed."