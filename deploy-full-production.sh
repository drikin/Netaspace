#!/bin/bash

# Full Production Deployment Script for neta.backspace.fm
# This script ensures the complete application is always deployed

set -e

echo "🚀 Starting full production deployment to neta.backspace.fm..."

# Configuration
SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"
SERVICE_NAME="neta-app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required files exist
if [ ! -f "production-server-complete.mjs" ]; then
    log_error "production-server-complete.mjs not found!"
    exit 1
fi

if [ ! -d "dist/public" ]; then
    log_error "Built frontend not found! Run 'npm run build' first."
    exit 1
fi

# Build frontend if package.json is newer than dist
if [ "package.json" -nt "dist/public/index.html" ]; then
    log_info "Building frontend..."
    npm run build
fi

# Create deployment package
log_info "Creating deployment package..."
tar -czf full-production.tar.gz \
    production-server-complete.mjs \
    dist/

# Upload to server
log_info "Uploading to production server..."
scp -o StrictHostKeyChecking=no -i $SSH_KEY full-production.tar.gz $SERVER_USER@$SERVER_HOST:/home/ubuntu/

# Deploy on server
log_info "Deploying on production server..."
ssh -o StrictHostKeyChecking=no -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'EOF'
    set -e
    
    # Extract deployment package
    tar -xzf full-production.tar.gz
    
    # Backup current server if it exists
    if [ -f "production-server-complete.mjs.backup" ]; then
        rm -f production-server-complete.mjs.backup.old
        mv production-server-complete.mjs.backup production-server-complete.mjs.backup.old
    fi
    
    if [ -f "production-server-complete.mjs" ]; then
        cp production-server-complete.mjs production-server-complete.mjs.backup
    fi
    
    # Update systemd service to use complete server
    sudo systemctl stop neta-app || true
    
    # Ensure service file points to complete server
    sudo sed -i 's/ExecStart=.*$/ExecStart=\/usr\/bin\/node production-server-complete.mjs/g' /etc/systemd/system/neta-app.service
    
    # Reload and restart service
    sudo systemctl daemon-reload
    sudo systemctl start neta-app
    sudo systemctl enable neta-app
    
    # Verify service is running
    sleep 3
    if sudo systemctl is-active --quiet neta-app; then
        echo "✅ Service started successfully"
        sudo systemctl status neta-app --no-pager -l
    else
        echo "❌ Service failed to start"
        sudo journalctl -u neta-app -n 20 --no-pager
        exit 1
    fi
    
    # Test endpoints
    echo "🧪 Testing endpoints..."
    
    # Test health endpoint
    if curl -f -s http://localhost:3001/health > /dev/null; then
        echo "✅ Health endpoint OK"
    else
        echo "❌ Health endpoint failed"
    fi
    
    # Test version endpoint
    if curl -f -s http://localhost:3001/api/version > /dev/null; then
        echo "✅ Version endpoint OK"
    else
        echo "❌ Version endpoint failed"
    fi
    
    # Test topic submission
    if curl -f -s -X POST http://localhost:3001/api/topics \
       -H "Content-Type: application/json" \
       -d '{"title":"Test","url":"https://example.com/test","description":"Deployment test"}' > /dev/null; then
        echo "✅ Topic submission OK"
    else
        echo "❌ Topic submission failed"
    fi
    
    echo "🎉 Full production deployment completed successfully!"
EOF

# Clean up local deployment package
rm -f full-production.tar.gz

# Final verification from external
log_info "Performing external verification..."
sleep 2

# Test from external
if curl -f -s https://neta.backspace.fm/health > /dev/null; then
    log_info "✅ External health check passed"
else
    log_error "❌ External health check failed"
    exit 1
fi

if curl -f -s https://neta.backspace.fm/api/version > /dev/null; then
    log_info "✅ External API check passed"
else
    log_error "❌ External API check failed"
    exit 1
fi

log_info "🎉 Full production deployment to neta.backspace.fm completed successfully!"
log_info "📍 Application is running at: https://neta.backspace.fm/"
log_info "🔧 Features available:"
log_info "   - Topic submission and management"
log_info "   - Admin authentication (admin/fmbackspace55)"
log_info "   - URL information fetching"
log_info "   - Complete topic lifecycle management"