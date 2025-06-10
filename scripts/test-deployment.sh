#!/bin/bash

# Quick deployment test script
# Usage: ./scripts/test-deployment.sh

SERVER_IP="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"
DOMAIN="neta.backspace.fm"

echo "Testing deployment to $DOMAIN..."

# Test SSH connection
echo "🔗 Testing SSH connection..."
if ssh -o ConnectTimeout=5 -i $SSH_KEY $SERVER_USER@$SERVER_IP "echo 'Connected'" 2>/dev/null; then
    echo "✅ SSH connection successful"
else
    echo "❌ SSH connection failed"
    exit 1
fi

# Test if Docker is available
echo "🐳 Checking Docker availability..."
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "docker --version" 2>/dev/null || {
    echo "⚠️  Docker not found on server"
}

# Check disk space
echo "💾 Checking disk space..."
ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "df -h /"

echo ""
echo "✅ Pre-deployment checks completed"
echo "Run the full deployment with: ./scripts/deploy-to-server.sh"