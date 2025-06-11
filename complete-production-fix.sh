#!/bin/bash

SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"
APP_DIR="/home/ubuntu/backspace-fm-app"

echo "Fixing production deployment with complete file transfer..."

# Create complete production package including Docker files
tar czf complete-production.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=dist \
    --exclude='.replit*' \
    --exclude='.config' \
    --exclude='*.tar.gz' \
    --exclude='*.log' \
    --exclude=attached_assets \
    .

echo "Transferring complete application files..."
scp -i $SSH_KEY complete-production.tar.gz $SERVER_USER@$SERVER_HOST:/tmp/

echo "Deploying to production server..."
ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'PRODUCTION_EOF'
    cd /home/ubuntu/backspace-fm-app
    
    # Stop any running containers
    docker-compose down 2>/dev/null || true
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    
    # Clean existing files
    rm -rf ./* 2>/dev/null || true
    
    # Extract complete application
    cd /tmp
    tar xzf complete-production.tar.gz -C /home/ubuntu/backspace-fm-app/
    rm complete-production.tar.gz
    
    cd /home/ubuntu/backspace-fm-app
    
    # Ensure proper environment file
    cat > .env << 'ENV_EOF'
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET=backspace_session_secret_2024
ENV_EOF
    
    # Make scripts executable
    chmod +x scripts/*.sh
    
    # Verify Docker files exist
    echo "=== Checking Docker files ==="
    ls -la Dockerfile docker-compose.yml
    
    # Clean Docker system
    docker system prune -f
    
    # Build and start with standard docker-compose.yml
    echo "=== Building application ==="
    docker-compose build --no-cache
    
    echo "=== Starting application ==="
    docker-compose up -d
    
    # Wait for startup
    echo "=== Waiting for startup ==="
    sleep 30
    
    # Check status
    echo "=== Container Status ==="
    docker-compose ps
    
    echo "=== Application Logs ==="
    docker-compose logs --tail=15 backspace-fm
    
    echo "=== Local API Test ==="
    curl -s http://127.0.0.1:5000/api/version || echo "Local API not responding"
PRODUCTION_EOF

rm complete-production.tar.gz

# Test production endpoint
echo "=== Testing Production Endpoint ==="
sleep 20
for i in {1..5}; do
    echo "Test attempt $i:"
    response=$(curl -s https://neta.backspace.fm/api/version)
    if [[ $response == *"app"* ]]; then
        echo "✓ Production API active: $response"
        
        # Verify latest code by checking for absence of archive functionality
        home_page=$(curl -s https://neta.backspace.fm/)
        if [[ $home_page != *"Archive"* ]] && [[ $home_page != *"archive"* ]]; then
            echo "✓ Latest code confirmed - Archive functionality removed"
        else
            echo "⚠ Old code detected - Archive functionality still present"
        fi
        break
    else
        echo "  Response: $response"
        if [ $i -lt 5 ]; then
            echo "  Waiting 15 seconds..."
            sleep 15
        fi
    fi
done

echo "Production deployment fix completed."