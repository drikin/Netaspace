#!/bin/bash

cd ~/Netaspace

echo "=== Verifying Deployment Status ==="

# Test app health
echo "1. Testing application health:"
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✓ App is responding on localhost:5000"
else
    echo "✗ App not responding - checking logs..."
    pm2 logs neta-app --lines 10
    
    echo ""
    echo "Applying environment variable fix..."
    
    # Create ecosystem config
    cat > ecosystem.config.js << 'EOF'
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
    
    # Restart with proper config
    pm2 stop neta-app
    pm2 delete neta-app
    pm2 start ecosystem.config.js
    pm2 save
    
    sleep 5
    curl -s http://localhost:5000/health > /dev/null 2>&1 && echo "✓ Fixed - app now responding" || echo "✗ Still not responding"
fi

echo ""
echo "2. Testing external access:"
curl -s -I http://153.125.147.133 | head -1

echo ""
echo "3. Final status:"
pm2 status

echo ""
echo "If all tests pass, your app is live at http://153.125.147.133"