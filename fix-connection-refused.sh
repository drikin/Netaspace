#!/bin/bash

cd ~/Netaspace

echo "=== Fixing Connection Refused Error ==="

# Check current PM2 status and logs
echo "1. Current PM2 status:"
pm2 status

echo ""
echo "2. Recent application logs:"
pm2 logs neta-app --lines 10

echo ""
echo "3. Testing direct connection to port 5000:"
netstat -tlnp | grep :5000 || echo "No process listening on port 5000"

echo ""
echo "4. Creating ecosystem config with explicit environment variables..."
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
      SERVER_IP: '153.125.147.133',
      TRUSTED_PROXIES: '127.0.0.1,153.125.147.133',
      LOG_LEVEL: 'info'
    }
  }]
}
EOF

echo ""
echo "5. Restarting application with proper environment..."
pm2 stop neta-app
pm2 delete neta-app
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "6. Waiting for application to start..."
sleep 10

echo ""
echo "7. Checking if port 5000 is now listening:"
netstat -tlnp | grep :5000 && echo "✓ Port 5000 is now listening" || echo "✗ Port 5000 still not listening"

echo ""
echo "8. Testing application response:"
curl -s http://localhost:5000/health && echo "✓ Application responding" || echo "✗ Application not responding"

echo ""
echo "9. Final PM2 status:"
pm2 status

echo ""
echo "10. Recent logs after restart:"
pm2 logs neta-app --lines 5