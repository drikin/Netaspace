#!/bin/bash

SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"

echo "[INFO] Deploying latest code to production..."

# Create complete application package
tar czf latest-deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=dist \
    --exclude='.replit*' \
    --exclude='.config' \
    --exclude='*.tar.gz' \
    --exclude='*.log' \
    --exclude=attached_assets \
    .

echo "[INFO] Transferring application files..."
scp -i $SSH_KEY latest-deploy.tar.gz $SERVER_USER@$SERVER_HOST:/tmp/

echo "[INFO] Setting up production environment..."
ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'DEPLOY_EOF'
    cd /home/ubuntu/backspace-fm-app
    
    # Extract latest application files
    tar xzf /tmp/latest-deploy.tar.gz
    rm /tmp/latest-deploy.tar.gz
    
    # Set production environment
    cat > .env << 'ENV_EOF'
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET=backspace_session_secret_2024
ENV_EOF
    
    # Make scripts executable
    chmod +x scripts/*.sh
    
    # Clean Docker environment
    docker-compose down 2>/dev/null || true
    docker system prune -f
    
    # Build and start application
    docker-compose build --no-cache
    docker-compose up -d
    
    # Wait for startup
    sleep 45
    
    # Check deployment
    echo "=== Container Status ==="
    docker-compose ps
    
    echo "=== Application Logs ==="
    docker-compose logs --tail=10 backspace-fm
    
    echo "=== Local API Test ==="
    curl -s http://127.0.0.1:5000/api/version
DEPLOY_EOF

rm latest-deploy.tar.gz

echo "[SUCCESS] Latest code deployment completed"
echo "[INFO] Verifying production deployment..."
echo "[INFO] Testing HTTPS connection..."

# Verify production endpoint
response=$(curl -s https://neta.backspace.fm/api/version)
if [[ $response == *"app"* ]]; then
    echo "[SUCCESS] HTTPS connection confirmed"
    echo "[INFO] Version info: $response"
else
    echo "[WARNING] Production not responding yet: $response"
fi

echo ""
echo "================================================"
echo "[SUCCESS] Latest code deployment completed!"
echo "================================================"
echo ""
echo "🌐 Website: https://neta.backspace.fm"
echo "🔧 Admin Panel: https://neta.backspace.fm/admin"
echo ""
echo "📊 Status Check:"
echo "   curl https://neta.backspace.fm/api/version"
echo ""
echo "🔍 Log Check:"
echo "   ssh -i ~/.ssh/id_ed25519 ubuntu@153.125.147.133"
echo "   cd /home/ubuntu/backspace-fm-app && docker-compose logs -f"