#!/bin/bash

SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"

echo "Checking production deployment status..."

ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'VERIFY_EOF'
    cd /home/ubuntu/backspace-fm-app
    
    echo "=== Docker Status ==="
    docker-compose ps
    
    echo "=== Recent Application Logs ==="
    docker-compose logs --tail=15 backspace-fm
    
    echo "=== Container Health Check ==="
    docker inspect backspace-fm-app-backspace-fm-1 --format='{{.State.Status}}: {{.State.Health.Status}}' 2>/dev/null || echo "Container status check failed"
    
    echo "=== Local API Test ==="
    curl -s http://127.0.0.1:5000/api/version || echo "Local API not responding"
    
    echo "=== Process Check ==="
    docker-compose exec -T backspace-fm ps aux | grep node || echo "Node process check failed"
VERIFY_EOF

echo ""
echo "=== Testing Production Endpoint ==="
for i in {1..5}; do
    echo "Attempt $i:"
    response=$(curl -s https://neta.backspace.fm/api/version)
    if [[ $response == *"app"* ]]; then
        echo "✓ Production API active: $response"
        
        # Check if it's the latest version by testing removed features
        home_response=$(curl -s https://neta.backspace.fm/)
        if [[ $home_response != *"Archive"* ]] && [[ $home_response != *"archive"* ]]; then
            echo "✓ Latest code confirmed - Archive functionality removed"
        else
            echo "⚠ Still showing old code with Archive functionality"
        fi
        break
    else
        echo "  Not ready: $response"
        if [ $i -lt 5 ]; then
            sleep 15
        fi
    fi
done

echo ""
echo "Verification completed."