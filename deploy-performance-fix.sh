#!/bin/bash

# Deploy performance optimizations to production
SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"
APP_DIR="/home/ubuntu/backspace-fm-app"

echo "Deploying performance optimizations..."

# Create minimal deployment package with just the updated files
tar czf perf-update.tar.gz server/db.ts server/storage.ts

# Transfer and apply updates
scp -i $SSH_KEY perf-update.tar.gz $SERVER_USER@$SERVER_HOST:$APP_DIR/

ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'PERF_EOF'
    cd /home/ubuntu/backspace-fm-app
    
    # Extract performance updates
    tar xzf perf-update.tar.gz
    rm perf-update.tar.gz
    
    # Restart application to apply changes
    docker-compose down
    docker-compose up -d --build
    
    echo "Performance optimizations applied. Waiting for restart..."
    sleep 20
    
    # Check status
    docker-compose ps
    echo "Recent logs:"
    docker-compose logs --tail=5 backspace-fm
PERF_EOF

rm perf-update.tar.gz
echo "Performance optimization deployment completed."