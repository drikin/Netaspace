#!/bin/bash

echo "=== Direct PM2 Start - Production Fix ==="

cd ~/Netaspace

# Kill existing PM2 processes
pm2 kill

# Start directly with all environment variables
pm2 start dist/index.js \
  --name "neta-app" \
  --instances 1 \
  --exec-mode cluster \
  --max-memory-restart 300M \
  --env NODE_ENV=production \
  --env PORT=3000 \
  --env DATABASE_URL='postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require' \
  --env SESSION_SECRET='neta-backspace-fm-super-secret-session-key-2025' \
  --env DOMAIN='neta.backspace.fm' \
  --env PROTOCOL='https' \
  --env HOST='0.0.0.0' \
  --env SERVER_IP='153.125.147.133' \
  --env TRUSTED_PROXIES='127.0.0.1,153.125.147.133' \
  --env LOG_LEVEL='info' \
  --env RATE_LIMIT_WINDOW_MS=900000 \
  --env RATE_LIMIT_MAX_REQUESTS=100

echo "Application started directly with PM2"
echo ""
echo "Checking status..."
pm2 status
pm2 logs --lines 10

echo ""
echo "Testing health endpoint..."
sleep 5
curl -I http://localhost:3000/health