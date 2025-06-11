#!/bin/bash

# Fix production database configuration
SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"
APP_DIR="/home/ubuntu/backspace-fm-app"

echo "Fixing production database configuration..."

# Update production environment without sudo
ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'FIX_EOF'
    cd /home/ubuntu/backspace-fm-app
    
    echo "Stopping application containers..."
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    docker-compose down 2>/dev/null || true
    
    echo "Updating environment configuration..."
    cat > .env << 'ENV_EOF'
NODE_ENV=production
DATABASE_URL=postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET=backspace_session_secret_2024
ENV_EOF

    echo "Creating new Docker Compose configuration..."
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

    echo "Building and starting application..."
    docker-compose build --no-cache
    docker-compose up -d
    
    echo "Waiting for application startup..."
    sleep 45
    
    echo "Application status:"
    docker-compose ps
    
    echo "Testing local API:"
    curl -s http://127.0.0.1:5000/api/version 2>/dev/null || echo "API not ready yet"
    
    echo "Recent logs:"
    docker-compose logs --tail=15 backspace-fm
FIX_EOF

echo "Testing production site..."
sleep 10
curl -s http://neta.backspace.fm/api/version 2>/dev/null || echo "Production site not accessible yet"

echo "Database configuration fix completed."