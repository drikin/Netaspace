#!/bin/bash

# Immediate fix for production deployment
cd ~/Netaspace

echo "Applying critical production fix..."

# Stop current broken process
pm2 stop neta-app 2>/dev/null || true
pm2 delete neta-app 2>/dev/null || true

# Start with ecosystem config containing DATABASE_URL
pm2 start ecosystem.config.js
pm2 save

# Brief wait for startup
sleep 8

# Check results
echo "Verifying fix:"
if netstat -tlnp | grep :5000 > /dev/null 2>&1; then
    echo "✓ Port 5000 listening"
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
        echo "✓ Health check passed"
        echo "✓ Deployment successful - accessible at http://153.125.147.133"
    else
        echo "✗ Health check failed"
        pm2 logs neta-app --lines 3
    fi
else
    echo "✗ Port 5000 not listening"
    pm2 logs neta-app --lines 5
fi

pm2 status