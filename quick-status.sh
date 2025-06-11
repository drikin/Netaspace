#!/bin/bash

SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"

ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'STATUS_EOF'
    cd /home/ubuntu/backspace-fm-app
    
    echo "=== Build Status ==="
    docker ps -a | grep backspace
    
    echo "=== Build Logs ==="
    docker-compose logs --tail=20 2>/dev/null || echo "No logs available"
    
    echo "=== Docker Images ==="
    docker images | grep backspace
    
    echo "=== Restart Container ==="
    docker-compose up -d
    
    sleep 10
    
    echo "=== Final Status ==="
    docker-compose ps
    curl -s http://127.0.0.1:5000/api/version || echo "Still not responding"
STATUS_EOF