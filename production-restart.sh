#!/bin/bash

echo "=== Production Restart - Fixed Ecosystem Config ==="

cd ~/Netaspace

# Kill existing PM2 processes
pm2 kill

# Start with the corrected ESM ecosystem config
pm2 start ecosystem.config.js

echo "Application started with corrected configuration"
echo ""
echo "Checking status..."
pm2 status
pm2 logs --lines 20

echo ""
echo "Testing health endpoint..."
sleep 5
curl -I http://localhost:3000/health