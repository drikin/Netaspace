#!/bin/bash

SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"

echo "Emergency production fix - direct source update..."

# Create minimal update with just the changed files
tar czf quick-update.tar.gz \
    client/src/App.tsx \
    client/src/components/header.tsx \
    client/src/pages/admin.tsx \
    server/routes.ts \
    server/storage.ts \
    server/index.ts \
    shared/schema.ts \
    package.json \
    scripts/start-app.sh

scp -i $SSH_KEY quick-update.tar.gz $SERVER_USER@$SERVER_HOST:/tmp/

ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'EMERGENCY_EOF'
    cd /home/ubuntu/backspace-fm-app
    
    # Extract updates
    tar xzf /tmp/quick-update.tar.gz
    rm /tmp/quick-update.tar.gz
    
    # Ensure environment
    cat > .env << 'ENV_EOF'
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET=backspace_session_secret_2024
ENV_EOF
    
    # Make sure scripts are executable
    chmod +x scripts/start-app.sh
    
    # Remove any Docker cache and rebuild
    docker-compose down 2>/dev/null || true
    docker image rm backspace-fm-app-backspace-fm 2>/dev/null || true
    docker builder prune -f
    
    # Build fresh
    docker-compose build --no-cache --pull
    docker-compose up -d
    
    # Wait for startup
    sleep 30
    
    # Check status
    docker-compose ps
    docker-compose logs --tail=10 backspace-fm
    
    # Test locally
    curl -s http://127.0.0.1:5000/api/version
EMERGENCY_EOF

rm quick-update.tar.gz

# Verify production
sleep 20
echo "Testing production API..."
curl -s https://neta.backspace.fm/api/version

echo "Emergency fix completed."