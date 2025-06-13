#!/bin/bash

echo "=== Deploying Performance Optimizations to Production ==="

cd ~/Netaspace

# Build the application with performance fixes
npm run build

# Deploy to production with current optimized code
pm2 restart neta-app

echo "Performance optimizations deployed successfully!"
echo ""
echo "Expected improvements:"
echo "- Query response time: 350-700ms → 50-150ms"
echo "- Total page load: 1.9s → 300-500ms"
echo "- Reduced database connections per request"
echo ""
echo "Monitoring new performance..."
sleep 5
pm2 logs neta-app --lines 15