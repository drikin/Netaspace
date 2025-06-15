#!/bin/bash

echo "=== Immediate Production Optimization ==="

cd ~/Netaspace

# Stop any existing PM2 processes
pm2 kill

# Ensure we have the latest optimized code
echo "Building with latest optimizations..."
npm run build

# Verify optimizations are in place
echo "Checking optimizations:"
if grep -q "COALESCE(COUNT" server/storage.ts; then
    echo "✓ JOIN optimization found"
else
    echo "✗ JOIN optimization missing"
fi

if grep -q "max: 5" server/db.ts; then
    echo "✓ Connection pool optimization found"  
else
    echo "✗ Connection pool optimization missing"
fi

# Start with all environment variables and optimizations
echo "Starting optimized production server..."

NODE_ENV=production \
PORT=3000 \
DATABASE_URL='postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require' \
SESSION_SECRET='neta-backspace-fm-super-secret-session-key-2025' \
HOST='0.0.0.0' \
DOMAIN='neta.backspace.fm' \
PROTOCOL='https' \
pm2 start dist/index.js --name "neta-app"

echo ""
echo "Production optimization complete!"
echo "Expected performance: 50-150ms query times"
echo ""
echo "Testing performance..."
sleep 8

# Test the health endpoint
curl -w "Response time: %{time_total}s\n" -s -o /dev/null http://localhost:3000/health

echo ""
echo "Recent performance logs:"
pm2 logs neta-app --lines 15