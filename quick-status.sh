#!/bin/bash

SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"

ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'STATUS_EOF'
cd /home/ubuntu/backspace-fm-app

echo "=== Container Status ==="
docker-compose -f docker-compose.prod.yml ps

echo -e "\n=== Quick API Test ==="
if curl -s --connect-timeout 5 http://127.0.0.1:5000/api/version; then
    echo -e "\n✅ Application is responding"
    
    echo -e "\n=== Admin Login Test ==="
    LOGIN=$(curl -s -X POST -H "Content-Type: application/json" \
         -d '{"username":"admin","password":"fmbackspace55"}' \
         -c /tmp/test.txt http://127.0.0.1:5000/api/auth/login)
    echo "Login: $LOGIN"
    
    AUTH=$(curl -s -b /tmp/test.txt http://127.0.0.1:5000/api/auth/me)
    echo "Auth: $AUTH"
    
    rm -f /tmp/test.txt
else
    echo -e "\n❌ Application not ready yet"
    
    echo -e "\n=== Container Logs ==="
    docker-compose -f docker-compose.prod.yml logs --tail=10 backspace-fm
fi
STATUS_EOF