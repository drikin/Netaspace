#!/bin/bash

echo "=== Ultra Performance Deployment ==="

cd ~/Netaspace

# Build with aggressive optimizations
npm run build

# Apply optimized connection pool settings and restart
pm2 restart neta-app

echo "Ultra performance optimizations deployed"
echo ""
echo "Expected improvements:"
echo "- Database connection pool optimized (5 max, faster timeouts)"
echo "- N+1 query elimination active"
echo "- Query response: 290-580ms → 50-150ms target"
echo ""
echo "Monitoring performance improvements..."
sleep 8
pm2 logs neta-app --lines 20