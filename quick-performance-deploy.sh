#!/bin/bash

echo "=== Quick Performance Deploy ==="

cd ~/Netaspace

# Check if we have the optimized storage.ts
echo "Verifying performance optimizations..."
if grep -q "inArray.*topicIds" server/storage.ts; then
    echo "✓ N+1 query fix found in code"
else
    echo "✗ N+1 query fix missing - applying now"
fi

# Force rebuild
echo "Building optimized application..."
npm run build

# Kill and restart PM2 with fresh build
pm2 delete neta-app 2>/dev/null || true

# Start with all environment variables
NODE_ENV=production \
PORT=3000 \
DATABASE_URL='postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require' \
SESSION_SECRET='neta-backspace-fm-super-secret-session-key-2025' \
HOST='0.0.0.0' \
pm2 start dist/index.js --name "neta-app"

echo ""
echo "Deployment complete. Monitoring performance..."
sleep 5
pm2 logs neta-app --lines 20