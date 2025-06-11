#!/bin/bash

# Production Monitoring Script for neta.backspace.fm
# Ensures full functionality is always available

SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"

check_service_status() {
    ssh -o StrictHostKeyChecking=no -i $SSH_KEY $SERVER_USER@$SERVER_HOST \
        "sudo systemctl is-active neta-app" 2>/dev/null
}

check_endpoint() {
    local endpoint=$1
    curl -f -s -m 10 "https://neta.backspace.fm$endpoint" > /dev/null 2>&1
}

test_topic_submission() {
    curl -f -s -m 15 -X POST https://neta.backspace.fm/api/topics \
        -H "Content-Type: application/json" \
        -d '{"title":"Monitor Test","url":"https://example.com/monitor","description":"Automated monitoring test"}' \
        > /dev/null 2>&1
}

# Check service status
if [ "$(check_service_status)" != "active" ]; then
    echo "ERROR: Service not active, restarting..."
    ssh -o StrictHostKeyChecking=no -i $SSH_KEY $SERVER_USER@$SERVER_HOST \
        "sudo systemctl restart neta-app"
    sleep 5
fi

# Check critical endpoints
endpoints=("/health" "/api/version" "/api/weeks/active")
for endpoint in "${endpoints[@]}"; do
    if ! check_endpoint "$endpoint"; then
        echo "ERROR: Endpoint $endpoint failed"
        exit 1
    fi
done

# Test topic submission functionality
if ! test_topic_submission; then
    echo "ERROR: Topic submission failed"
    exit 1
fi

echo "OK: All systems operational"