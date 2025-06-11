#!/bin/bash

# Quick fix for production database connection
SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"
APP_DIR="/home/ubuntu/backspace-fm-app"

echo "Applying quick fix to production database configuration..."

# Update production environment variables and restart the application
ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'QUICK_FIX_EOF'
    cd /home/ubuntu/backspace-fm-app
    
    echo "Stopping existing application..."
    sudo docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    sudo docker-compose down 2>/dev/null || true
    
    echo "Updating environment configuration..."
    cat > .env << 'ENV_EOF'
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET=backspace_session_secret_2024
ENV_EOF

    echo "Creating updated Docker Compose configuration..."
    cat > docker-compose.yml << 'COMPOSE_EOF'
version: '3.8'

services:
  backspace-fm:
    build: .
    container_name: backspace-app
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      SESSION_SECRET: ${SESSION_SECRET:-backspace_session_secret_2024}
      PORT: 5000
    ports:
      - "127.0.0.1:5000:5000"
    restart: unless-stopped
    volumes:
      - ./data:/app/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/version"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
COMPOSE_EOF

    echo "Starting application with Neon database..."
    sudo docker-compose build --no-cache
    sudo docker-compose up -d
    
    echo "Waiting for application to start..."
    sleep 30
    
    echo "Checking application status..."
    sudo docker-compose ps
    
    echo "Testing API endpoint..."
    curl -s http://127.0.0.1:5000/api/version || echo "API not yet ready"
    
    echo "Recent application logs:"
    sudo docker-compose logs --tail=20 backspace-fm
QUICK_FIX_EOF

echo "Quick fix applied. Testing production endpoint..."
sleep 5
curl -s http://neta.backspace.fm/api/version || echo "Site not yet accessible"

echo "Production database configuration updated to use Neon database."