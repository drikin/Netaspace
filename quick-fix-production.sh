#!/bin/bash

SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"
APP_DIR="/home/ubuntu/backspace-fm-app"

echo "Fixing production deployment with complete file set..."

# Create complete production package
tar czf production-fix.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=dist \
    --exclude='.replit*' \
    --exclude='.config' \
    --exclude='*.tar.gz' \
    --exclude='*.log' \
    --exclude=attached_assets \
    .

scp -i $SSH_KEY production-fix.tar.gz $SERVER_USER@$SERVER_HOST:/tmp/

ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'FIX_EOF'
    cd /home/ubuntu/backspace-fm-app
    
    # Stop and clean
    docker-compose down 2>/dev/null || true
    docker system prune -f
    
    # Backup current and extract new
    mv .env .env.backup 2>/dev/null || true
    rm -rf ./* 2>/dev/null || true
    
    cd /tmp
    tar xzf production-fix.tar.gz -C /home/ubuntu/backspace-fm-app/
    rm production-fix.tar.gz
    
    cd /home/ubuntu/backspace-fm-app
    
    # Restore environment
    if [ -f .env.backup ]; then
        cp .env.backup .env
    else
        cat > .env << 'ENV_EOF'
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET=backspace_session_secret_2024
ENV_EOF
    fi
    
    # Make scripts executable
    chmod +x scripts/*.sh
    
    # Build and start fresh
    docker-compose build --no-cache
    docker-compose up -d
    
    # Wait and verify
    sleep 25
    
    echo "=== Application Status ==="
    docker-compose ps
    
    echo "=== Recent Logs ==="
    docker-compose logs --tail=10 backspace-fm
    
    echo "=== Local API Test ==="
    curl -s http://127.0.0.1:5000/api/version || echo "Local API not responding"
FIX_EOF

rm production-fix.tar.gz

# Test production endpoint
sleep 15
echo "=== Testing Production API ==="
for i in {1..3}; do
    response=$(curl -s https://neta.backspace.fm/api/version)
    if [[ $response == *"app"* ]]; then
        echo "Success: $response"
        break
    else
        echo "Attempt $i: Not ready yet"
        sleep 10
    fi
done

echo "Production fix deployment completed."