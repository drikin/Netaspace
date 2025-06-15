#!/bin/bash

echo "=== Production Performance Emergency Fix ==="

cd ~/Netaspace

# Complete fresh start
pm2 kill
rm -rf dist/ node_modules/.cache

# Fresh build with optimizations
npm run build

# Verify optimized build exists
if [ ! -f "dist/index.js" ]; then
    echo "Build failed, aborting"
    exit 1
fi

echo "Starting optimized production server..."

# Direct node start with optimizations (bypass PM2 config issues)
NODE_ENV=production \
PORT=3000 \
DATABASE_URL='postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require' \
SESSION_SECRET='neta-backspace-fm-super-secret-session-key-2025' \
HOST='0.0.0.0' \
pm2 start dist/index.js --name "neta-app" --no-daemon &

sleep 8

echo "Testing performance..."
curl -w "Total time: %{time_total}s\n" -s "http://localhost:3000/api/weeks/active" > /dev/null

echo ""
echo "Performance logs:"
pm2 logs neta-app --lines 20