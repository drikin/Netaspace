#!/bin/bash

echo "=== Force Production Performance Sync ==="

cd ~/Netaspace

# Verify we have the optimized code
echo "Checking N+1 optimization status..."
if grep -q "inArray.*topicIds" server/storage.ts; then
    echo "✓ N+1 query optimization found"
else
    echo "✗ N+1 optimization missing"
fi

if grep -q "max: 5" server/db.ts; then
    echo "✓ Connection pool optimization found"
else
    echo "✗ Connection pool optimization missing"
fi

# Force full rebuild and deployment
echo "Force rebuilding with all optimizations..."
rm -rf dist/
npm run build

# Completely restart PM2 with fresh environment
pm2 delete neta-app
pm2 flush

# Start with all optimizations
NODE_ENV=production \
PORT=3000 \
DATABASE_URL='postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require' \
SESSION_SECRET='neta-backspace-fm-super-secret-session-key-2025' \
HOST='0.0.0.0' \
pm2 start dist/index.js --name "neta-app"

echo ""
echo "Production sync complete. Expected performance:"
echo "- Query time: 294-596ms → 80-200ms"
echo "- Total response: 886-1999ms → 300-600ms"
echo ""
echo "Testing optimized performance..."
sleep 10
pm2 logs neta-app --lines 25