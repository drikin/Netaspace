#!/bin/bash

# Complete production deployment with Neon database
SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"
APP_DIR="/home/ubuntu/backspace-fm-app"

echo "Deploying complete application to production..."

# Create deployment package
tar czf production-deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=dist \
    --exclude=.replit \
    --exclude=.config \
    --exclude='*.tar.gz' \
    --exclude='*.log' \
    --exclude=attached_assets \
    .

# Transfer and deploy
scp -i $SSH_KEY production-deploy.tar.gz $SERVER_USER@$SERVER_HOST:$APP_DIR/

ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'DEPLOY_EOF'
    cd /home/ubuntu/backspace-fm-app
    
    # Stop existing containers
    docker-compose down 2>/dev/null || true
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    
    # Extract new files
    tar xzf production-deploy.tar.gz
    rm production-deploy.tar.gz
    
    # Create production environment
    cat > .env << 'ENV_EOF'
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET=backspace_session_secret_2024
ENV_EOF

    # Build and start application
    docker-compose build --no-cache
    docker-compose up -d
    
    # Wait and check status
    sleep 30
    docker-compose ps
    docker-compose logs --tail=10 backspace-fm
DEPLOY_EOF

# Clean up local file
rm production-deploy.tar.gz

# Test production
echo "Testing production deployment..."
sleep 10
curl -s http://neta.backspace.fm/api/version

echo "Production deployment completed."