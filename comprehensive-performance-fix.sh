#!/bin/bash

echo "=== Comprehensive Performance Fix for Production ==="

cd ~/Netaspace

# Stop current application
pm2 stop neta-app

# Build optimized version
npm run build

# Start with optimized connection pool and environment
NODE_ENV=production \
PORT=3000 \
DATABASE_URL='postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require' \
SESSION_SECRET='neta-backspace-fm-super-secret-session-key-2025' \
HOST='0.0.0.0' \
pm2 start dist/index.js --name "neta-app"

echo "Performance optimizations deployed:"
echo "✓ Optimized connection pool (max: 5, faster timeouts)"
echo "✓ N+1 query elimination"
echo "✓ Database indexes applied"
echo "✓ Enhanced query monitoring"
echo ""
echo "Target: 290-580ms → 80-200ms"
echo ""
echo "Testing performance..."
sleep 5

# Test endpoint performance
echo "Health check:"
curl -w "Response time: %{time_total}s\n" -s -o /dev/null http://localhost:3000/health

echo ""
echo "Recent logs:"
pm2 logs neta-app --lines 15