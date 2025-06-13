#!/bin/bash

# Final fix for production deployment
cd ~/Netaspace

echo "=== Final Production Fix ==="

# Check current PM2 status
echo "Current PM2 status:"
pm2 status

# Check if app is responding
echo ""
echo "Testing localhost connection:"
curl -s http://localhost:5000/health && echo "✓ App responding" || echo "✗ App connection failed"

# Check recent logs for database errors
echo ""
echo "Recent app logs:"
pm2 logs neta-app --lines 5

# Create ecosystem config with explicit environment variables
echo ""
echo "Creating PM2 ecosystem config with environment variables..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'neta-app',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'cluster',
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      DATABASE_URL: 'postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require',
      SESSION_SECRET: 'neta-backspace-fm-super-secret-session-key-2025',
      DOMAIN: 'neta.backspace.fm',
      PROTOCOL: 'https',
      HOST: '0.0.0.0',
      SERVER_IP: '153.125.147.133'
    }
  }]
}
EOF

# Restart with proper environment
echo "Restarting PM2 with ecosystem config..."
pm2 stop neta-app
pm2 delete neta-app
pm2 start ecosystem.config.js
pm2 save

# Wait for startup
echo "Waiting for application to start..."
sleep 5

# Test health
echo ""
echo "Testing application health:"
curl -s http://localhost:5000/health && echo "✓ Health check passed" || echo "✗ Health check failed"

# Test external access
echo ""
echo "Testing external access:"
curl -s -I http://153.125.147.133 | head -3

# Final status
echo ""
echo "Final PM2 status:"
pm2 status

echo ""
echo "If healthy, your app is now accessible at:"
echo "- HTTP: http://153.125.147.133"
echo "- Domain: https://neta.backspace.fm (after DNS setup)"