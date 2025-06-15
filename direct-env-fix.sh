#!/bin/bash

cd ~/Netaspace

# Stop current broken process
pm2 stop neta-app 2>/dev/null || true
pm2 delete neta-app 2>/dev/null || true

# Start with direct environment variables
DATABASE_URL='postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require' \
NODE_ENV=production \
PORT=5000 \
SESSION_SECRET='neta-backspace-fm-super-secret-session-key-2025' \
HOST='0.0.0.0' \
pm2 start dist/index.js --name neta-app

pm2 save

sleep 8

# Verify
netstat -tlnp | grep :5000 && echo "✓ Fixed" || echo "✗ Still broken"
curl -s http://localhost:5000/health && echo "✓ Health OK" || echo "✗ Health failed"
pm2 status