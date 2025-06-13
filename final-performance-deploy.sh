#!/bin/bash

echo "=== Final Performance Optimization Deploy ==="

cd ~/Netaspace

# Build with final optimizations
npm run build

# Deploy to production
pm2 restart neta-app

echo "Final optimizations deployed:"
echo "- Eliminated N+1 queries with JOIN optimization"
echo "- Target: 242-245ms → 50-100ms query time"
echo "- Expected total response: 757-964ms → 200-400ms"
echo ""
echo "Testing final performance..."
sleep 5
pm2 logs neta-app --lines 10