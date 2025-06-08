#!/bin/bash

# Deployment verification script for Sakura Cloud
# Usage: ./verify-deployment.sh [server-ip]

set -e

SERVER_IP="${1:-localhost}"
PORT="5000"
APP_NAME="backspace-fm"

echo "=== Deployment Verification ==="
echo "Server: $SERVER_IP:$PORT"
echo "Application: $APP_NAME"

# Test container status
echo "Checking container status..."
if docker ps | grep -q $APP_NAME; then
    echo "✅ Container is running"
else
    echo "❌ Container not found or not running"
    docker ps -a | grep $APP_NAME || echo "Container does not exist"
    exit 1
fi

# Test application health
echo "Testing application health..."
if curl -f http://$SERVER_IP:$PORT/api/version >/dev/null 2>&1; then
    echo "✅ Application is responding"
    VERSION=$(curl -s http://$SERVER_IP:$PORT/api/version | grep -o '"app":"[^"]*"' | cut -d'"' -f4)
    echo "Application version: $VERSION"
else
    echo "❌ Application not responding"
    echo "Container logs:"
    docker logs --tail 20 $APP_NAME
    exit 1
fi

# Test data persistence
echo "Checking data persistence..."
if docker exec $APP_NAME ls -la /app/data/persistent/ >/dev/null 2>&1; then
    echo "✅ Data directory accessible"
    DB_SIZE=$(docker exec $APP_NAME du -h /app/data/persistent/production.sqlite 2>/dev/null | cut -f1 || echo "0")
    echo "Database size: $DB_SIZE"
else
    echo "❌ Data directory not accessible"
    exit 1
fi

# Test backup system
echo "Checking backup system..."
BACKUP_COUNT=$(docker exec $APP_NAME ls -1 /app/data/backups/ 2>/dev/null | wc -l || echo "0")
if [ "$BACKUP_COUNT" -gt 0 ]; then
    echo "✅ Backups found: $BACKUP_COUNT files"
else
    echo "⚠️ No backups found (may be normal for new deployment)"
fi

# Test API endpoints
echo "Testing API endpoints..."
ENDPOINTS=("/api/version" "/api/weeks/active")
for endpoint in "${ENDPOINTS[@]}"; do
    if curl -f http://$SERVER_IP:$PORT$endpoint >/dev/null 2>&1; then
        echo "✅ $endpoint responding"
    else
        echo "❌ $endpoint not responding"
    fi
done

# Resource usage
echo "Checking resource usage..."
CPU_USAGE=$(docker stats --no-stream --format "table {{.CPUPerc}}" $APP_NAME | tail -1)
MEM_USAGE=$(docker stats --no-stream --format "table {{.MemUsage}}" $APP_NAME | tail -1)
echo "CPU usage: $CPU_USAGE"
echo "Memory usage: $MEM_USAGE"

echo ""
echo "=== Deployment Summary ==="
echo "Status: ✅ Deployment verified successfully"
echo "Access URL: http://$SERVER_IP:$PORT"
echo "Admin panel: http://$SERVER_IP:$PORT/admin"
echo "Chrome extension setup: http://$SERVER_IP:$PORT/extension"
echo ""
echo "Management commands:"
echo "  docker logs $APP_NAME           # View logs"
echo "  docker restart $APP_NAME        # Restart application"
echo "  docker exec -it $APP_NAME sh    # Access container shell"