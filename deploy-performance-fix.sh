#!/bin/bash

echo "=== Deploying Performance Fix to Production ==="

cd ~/Netaspace

# Build the optimized application
npm run build

# Stop current PM2 process
pm2 stop neta-app

# Start with optimized code
NODE_ENV=production \
PORT=3000 \
DATABASE_URL='postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require' \
SESSION_SECRET='neta-backspace-fm-super-secret-session-key-2025' \
HOST='0.0.0.0' \
pm2 start dist/index.js --name "neta-app"

echo "Performance fix deployed"
echo ""
echo "Monitoring query performance..."
pm2 logs neta-app --lines 10

echo ""
echo "Testing health endpoint..."
sleep 3
curl -I http://localhost:3000/health