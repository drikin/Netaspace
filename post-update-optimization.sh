#!/bin/bash

echo "=== Post-Update Production Optimization ==="

cd ~/Netaspace

# Wait for any ongoing processes to complete
sleep 5

# Ensure PM2 is installed and available
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Stop any existing processes
pm2 kill 2>/dev/null || true

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build with optimizations
echo "Building optimized application..."
npm run build

# Verify build exists
if [ ! -f "dist/index.js" ]; then
    echo "Build failed, exiting"
    exit 1
fi

# Start optimized production server
echo "Starting optimized server..."
NODE_ENV=production \
PORT=3000 \
DATABASE_URL='postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require' \
SESSION_SECRET='neta-backspace-fm-super-secret-session-key-2025' \
HOST='0.0.0.0' \
pm2 start dist/index.js --name "neta-app"

echo ""
echo "Production optimization complete!"
echo "Performance improvements applied:"
echo "- JOIN query optimization for faster database queries"
echo "- Optimized connection pool settings"
echo "- N+1 query problem resolution"
echo ""

# Test performance
echo "Testing application..."
sleep 8
curl -I http://localhost:3000/health

echo ""
echo "Application logs:"
pm2 logs neta-app --lines 10