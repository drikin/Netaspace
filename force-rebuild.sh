#!/bin/bash

# Force complete rebuild with latest code
SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"
APP_DIR="/home/ubuntu/backspace-fm-app"

echo "Force rebuilding production with latest code..."

# Create complete fresh deployment
tar czf fresh-deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=dist \
    --exclude=.replit \
    --exclude=.config \
    --exclude='*.tar.gz' \
    --exclude='*.log' \
    --exclude=attached_assets \
    .

scp -i $SSH_KEY fresh-deploy.tar.gz $SERVER_USER@$SERVER_HOST:$APP_DIR/

ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'REBUILD_EOF'
    cd /home/ubuntu/backspace-fm-app
    
    # Complete cleanup
    docker-compose down
    docker system prune -af
    docker builder prune -af
    
    # Remove all old files
    rm -rf ./* ./.*  2>/dev/null || true
    
    # Extract fresh code
    tar xzf fresh-deploy.tar.gz
    rm fresh-deploy.tar.gz
    
    # Set environment
    cat > .env << 'ENV_EOF'
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET=backspace_session_secret_2024
ENV_EOF
    
    # Force complete rebuild without cache
    docker-compose build --no-cache --pull --force-rm
    docker-compose up -d
    
    # Wait for startup
    sleep 30
    
    # Verify rebuild
    docker-compose ps
    echo "Latest logs:"
    docker-compose logs --tail=10 backspace-fm
    
    # Test application
    curl -s http://127.0.0.1:5000/api/version
REBUILD_EOF

rm fresh-deploy.tar.gz

# Test production
sleep 15
echo "Testing production with latest code:"
curl -s https://neta.backspace.fm/api/version

echo "Force rebuild completed."