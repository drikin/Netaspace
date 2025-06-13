#!/bin/bash

cd ~/Netaspace

echo "=== Completing the Fix ==="

echo "3. Testing direct connection to port 5000:"
netstat -tlnp | grep :5000 || echo "No process listening on port 5000"

echo ""
echo "4. Ecosystem config already created, now applying it..."

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

echo ""
echo "11. Testing external access:"
curl -I http://153.125.147.133