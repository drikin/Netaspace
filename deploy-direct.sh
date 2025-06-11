#!/bin/bash

# Direct deployment without Docker timeouts
echo "Deploying corrected application directly..."

ssh -i ~/.ssh/id_ed25519 ubuntu@153.125.147.133 << 'EOF'
cd /home/ubuntu/backspace-fm-app

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install dependencies with timeout handling
export NODE_OPTIONS="--max-old-space-size=2048"
timeout 300 npm install --production || {
    echo "npm install timed out, trying with reduced parallelism"
    npm install --production --maxsockets 1 --jobs 1
}

# Build the application
npm run build

# Kill any existing processes
pkill -f "node.*index.js" || true
pkill -f "npm.*start" || true

# Start the application in background
nohup npm start > app.log 2>&1 &

# Wait a moment and check if it's running
sleep 5
if pgrep -f "node.*index.js" > /dev/null; then
    echo "Application started successfully"
    tail -10 app.log
else
    echo "Application failed to start, checking logs:"
    tail -20 app.log
fi
EOF