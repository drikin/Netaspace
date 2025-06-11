#!/bin/bash

# Quick deployment of latest changes
SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"  
SSH_KEY="~/.ssh/id_ed25519"
APP_DIR="/home/ubuntu/backspace-fm-app"

echo "Quick deployment of latest changes..."

# Create package with only essential updated files
tar czf quick-update.tar.gz \
    client/src/App.tsx \
    client/src/components/header.tsx \
    client/src/components/tab-navigation.tsx \
    client/src/components/admin-controls.tsx \
    client/src/components/ui/topic-card.tsx \
    client/src/pages/home.tsx \
    client/src/pages/admin.tsx \
    server/db.ts \
    server/storage.ts \
    server/routes.ts \
    docker-compose.yml \
    package.json

# Transfer and apply updates
scp -i $SSH_KEY quick-update.tar.gz $SERVER_USER@$SERVER_HOST:$APP_DIR/

ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'QUICK_EOF'
    cd /home/ubuntu/backspace-fm-app
    
    # Stop application
    docker-compose down
    
    # Apply updates
    tar xzf quick-update.tar.gz
    rm quick-update.tar.gz
    
    # Ensure correct environment
    cat > .env << 'ENV_EOF'
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET=backspace_session_secret_2024
ENV_EOF
    
    # Rebuild and start
    docker-compose build
    docker-compose up -d
    
    # Wait and check
    sleep 15
    docker-compose ps
    curl -s http://127.0.0.1:5000/api/version || echo "Service starting..."
QUICK_EOF

rm quick-update.tar.gz

# Test production
echo "Testing production deployment..."
sleep 5
curl -s https://neta.backspace.fm/api/version

echo "Quick deployment completed."