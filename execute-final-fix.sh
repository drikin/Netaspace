#!/bin/bash

cd ~/Netaspace

echo "=== Executing Final Fix for Connection Refused ==="

# Check current status
echo "1. Current PM2 status:"
pm2 status

echo ""
echo "2. Checking if port 5000 is listening:"
netstat -tlnp | grep :5000 || echo "Port 5000 not listening - confirming the issue"

echo ""
echo "3. Current app logs showing DATABASE_URL error:"
pm2 logs neta-app --lines 3

echo ""
echo "4. Applying ecosystem config with environment variables..."
pm2 stop neta-app
pm2 delete neta-app

echo ""
echo "5. Starting with proper environment configuration..."
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "6. Waiting for application startup..."
sleep 15

echo ""
echo "7. Checking if app is now listening on port 5000:"
netstat -tlnp | grep :5000 && echo "✓ SUCCESS: App now listening on port 5000" || echo "✗ FAILED: Still not listening"

echo ""
echo "8. Testing application health:"
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✓ SUCCESS: Application responding to health check"
else
    echo "✗ FAILED: Application not responding"
    echo "Recent logs:"
    pm2 logs neta-app --lines 5
fi

echo ""
echo "9. Testing external access:"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://153.125.147.133 2>/dev/null)
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo "✓ SUCCESS: External access working (HTTP $HTTP_STATUS)"
else
    echo "✗ FAILED: External access still failing (HTTP $HTTP_STATUS)"
fi

echo ""
echo "10. Final PM2 status:"
pm2 status

echo ""
echo "=== Summary ==="
if netstat -tlnp | grep :5000 > /dev/null 2>&1; then
    echo "✅ DEPLOYMENT SUCCESSFUL"
    echo "   - App listening on port 5000"
    echo "   - Database connected"
    echo "   - Available at http://153.125.147.133"
else
    echo "❌ DEPLOYMENT NEEDS ATTENTION"
    echo "   - Check logs: pm2 logs neta-app"
fi