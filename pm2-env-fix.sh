#!/bin/bash

cd ~/Netaspace

echo "=== PM2 Environment Fix ==="

# Stop current process
pm2 stop neta-app 2>/dev/null || true
pm2 delete neta-app 2>/dev/null || true

# Create a simple ecosystem config without env_file
cat > ecosystem-simple.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'neta-app',
    script: 'dist/index.js',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      DATABASE_URL: 'postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require',
      SESSION_SECRET: 'neta-backspace-fm-super-secret-session-key-2025',
      HOST: '0.0.0.0'
    }
  }]
}
EOF

# Start with simple config
pm2 start ecosystem-simple.config.js
pm2 save

sleep 8

# Check results
if netstat -tlnp | grep :5000 > /dev/null; then
    echo "✓ Port 5000 listening"
    if curl -s http://localhost:5000/health > /dev/null; then
        echo "✓ Health check passed"
        echo "✓ FIXED - Application running"
    else
        echo "✗ Health check failed"
    fi
else
    echo "✗ Port 5000 not listening"
    pm2 logs neta-app --lines 3
fi