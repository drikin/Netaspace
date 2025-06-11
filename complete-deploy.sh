#!/bin/bash

# Complete the production deployment
SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"
APP_DIR="/home/ubuntu/backspace-fm-app"

echo "Completing production deployment..."

ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'COMPLETE_EOF'
    cd /home/ubuntu/backspace-fm-app
    
    # Check current Docker status
    echo "Current Docker status:"
    docker-compose ps
    
    # Check if build is still running
    echo "Checking Docker processes:"
    docker ps -a
    
    # Stop any running containers
    docker-compose down
    
    # Ensure environment is correct
    cat > .env << 'ENV_EOF'
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET=backspace_session_secret_2024
ENV_EOF
    
    # Force rebuild and restart
    docker-compose build --no-cache --force-rm
    docker-compose up -d
    
    # Wait for startup
    echo "Waiting for application startup..."
    sleep 45
    
    # Check final status
    echo "Final application status:"
    docker-compose ps
    docker-compose logs --tail=20 backspace-fm
    
    # Test local API
    echo "Testing local API:"
    curl -s http://127.0.0.1:5000/api/version || echo "API not responding"
COMPLETE_EOF

# Test production endpoint
echo "Testing production endpoint..."
sleep 10
for i in {1..5}; do
    response=$(curl -s https://neta.backspace.fm/api/version)
    if [[ $response == *"app"* ]]; then
        echo "Production API responding: $response"
        break
    else
        echo "Attempt $i: Production not ready yet"
        sleep 10
    fi
done

echo "Deployment completion attempted."