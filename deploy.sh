#!/bin/bash

# Automated deployment script for neta.backspace.fm
# Usage: ./deploy.sh [--initial]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$HOME/Netaspace"
SERVICE_NAME="neta-app"
DOMAIN="neta.backspace.fm"
SERVER_IP="153.127.198.207"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Check if running initial setup
INITIAL_SETUP=false
if [[ "$1" == "--initial" ]]; then
    INITIAL_SETUP=true
fi

log "Starting deployment for neta.backspace.fm"
log "Server: $SERVER_IP"
log "Domain: $DOMAIN"
log "Initial setup: $INITIAL_SETUP"

# Navigate to project directory
cd "$PROJECT_DIR" || error "Project directory not found: $PROJECT_DIR"

# Pull latest code from GitHub
log "Pulling latest code from GitHub..."
git fetch origin

# Check if we have local changes
if ! git diff --quiet HEAD origin/main; then
    log "Updates available from origin/main"
    # Safely merge changes without destroying local config
    git pull origin main || {
        warn "Git pull failed. You may need to resolve conflicts manually."
        error "Deployment aborted due to git pull failure"
    }
else
    log "Already up to date with origin/main"
fi

# Install system dependencies if initial setup
if [[ "$INITIAL_SETUP" == true ]]; then
    log "Installing system dependencies..."
    
    # Update system
    sudo apt update && sudo apt upgrade -y
    
    # Install required packages including PostgreSQL
    sudo apt install -y nginx curl git ufw fail2ban jq certbot python3-certbot-nginx postgresql postgresql-contrib
    
    # Install Node.js 20.x if not present
    if ! command -v node &> /dev/null || [[ "$(node --version | cut -d'.' -f1 | cut -d'v' -f2)" -lt "20" ]]; then
        log "Installing Node.js 20.x..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
    fi
    
    # Install PM2 globally if not present
    if ! command -v pm2 &> /dev/null; then
        log "Installing PM2..."
        sudo npm install -g pm2
    fi
    
    # Setup PostgreSQL
    log "Setting up PostgreSQL..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    # Set postgres user password
    sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'netapass123';"
    
    # Create database if it doesn't exist
    sudo -u postgres psql -c "CREATE DATABASE neta_local;" 2>/dev/null || log "Database neta_local already exists"
    
    # Configure firewall
    log "Configuring firewall..."
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    sudo ufw --force enable
fi

# Install/update Node.js dependencies
log "Installing Node.js dependencies..."
npm ci --production=false

# Build application
log "Building application..."
# Always build full application including frontend assets for production deployment
npm run build
log "Built application with frontend and backend"

# Setup environment file for local PostgreSQL
log "Setting up environment variables for local PostgreSQL..."
if [[ -f .env.production ]]; then
    cp .env.production .env
    log "Copied .env.production to .env"
else
    cat > .env << EOF
# Database - Local PostgreSQL
DATABASE_URL=postgresql://postgres:netapass123@localhost:5432/neta_local

# Application
NODE_ENV=production
PORT=5000

# Session Secret
SESSION_SECRET=neta-backspace-fm-super-secret-session-key-2025

# Domain and Server
DOMAIN=neta.backspace.fm
PROTOCOL=https
HOST=0.0.0.0
SERVER_IP=153.127.201.139

# Security
TRUSTED_PROXIES=127.0.0.1,153.127.201.139

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Admin Password (set via environment variable)
# ADMIN_PASSWORD will be set from environment or use default
EOF
    log "Created new .env file for local PostgreSQL"
fi

# Ensure PostgreSQL is running and configured
log "Checking PostgreSQL setup..."
sudo systemctl start postgresql || log "PostgreSQL already running"

# Ensure postgres user has correct password
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'netapass123';" 2>/dev/null || log "Password already set"

# Create database if it doesn't exist
sudo -u postgres psql -c "CREATE DATABASE neta_local;" 2>/dev/null || log "Database neta_local already exists"

# Database setup/migration
log "Setting up database..."
if [[ "$INITIAL_SETUP" == true ]]; then
    # Run database migration for initial setup
    npm run db:push || warn "Database migration failed. Please check DATABASE_URL in .env"
else
    # For updates, just push any schema changes
    npm run db:push || warn "Database update failed. Continuing with deployment..."
fi

# Stop existing PM2 processes
log "Managing PM2 processes..."
pm2 stop $SERVICE_NAME 2>/dev/null || true
pm2 delete $SERVICE_NAME 2>/dev/null || true

# Ensure we have the correct ecosystem config with local PostgreSQL
log "Checking ecosystem configuration..."
if [[ -f ecosystem.config.js && ! -f ecosystem.config.cjs ]]; then
    log "Converting ecosystem.config.js to CommonJS format..."
    # Convert to CommonJS format and update settings
    sed -i 's/export default {/module.exports = {/' ecosystem.config.js
    sed -i 's/153\.127\.198\.207/153.127.201.139/g' ecosystem.config.js
    mv ecosystem.config.js ecosystem.config.cjs
    log "Converted to ecosystem.config.cjs with correct settings"
fi

# Always ensure ecosystem.config.cjs has correct local PostgreSQL settings
if [[ -f ecosystem.config.cjs ]]; then
    log "Updating ecosystem.config.cjs with local PostgreSQL settings..."
    # Update IP addresses
    sed -i 's/153\.127\.198\.207/153.127.201.139/g' ecosystem.config.cjs
    # Ensure local PostgreSQL DATABASE_URL
    sed -i "s|DATABASE_URL: '[^']*'|DATABASE_URL: 'postgresql://postgres:netapass123@localhost:5432/neta_local'|g" ecosystem.config.cjs
    # Ensure ADMIN_PASSWORD uses environment variable
    sed -i "s|ADMIN_PASSWORD: '[^']*'|ADMIN_PASSWORD: process.env.ADMIN_PASSWORD \|\| 'default_admin_pass'|g" ecosystem.config.cjs
    log "Updated ecosystem.config.cjs with local PostgreSQL and admin settings"
fi

# Start application with PM2
log "Starting application with PM2..."
if [[ -f ecosystem.config.cjs ]]; then
    pm2 start ecosystem.config.cjs
elif [[ -f ecosystem.config.js ]]; then
    pm2 start ecosystem.config.js
else
    PORT=5000 pm2 start dist/index.js --name "$SERVICE_NAME" -i 1 --max-memory-restart 300M
fi

pm2 save

# Setup PM2 startup script if initial setup
if [[ "$INITIAL_SETUP" == true ]]; then
    log "Configuring PM2 startup..."
    pm2 startup
fi

# Configure Nginx
log "Configuring Nginx..."

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN $SERVER_IP;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL certificate paths (will be configured by certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN/chain.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri @nodejs;
    }
    
    # Main application proxy
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Fallback to Node.js
    location @nodejs {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://127.0.0.1:5000/health;
    }
    
    # Logs
    access_log /var/log/nginx/$DOMAIN.access.log;
    error_log /var/log/nginx/$DOMAIN.error.log;
}
EOF

# Enable site and remove default
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# Test and reload Nginx
if sudo nginx -t; then
    sudo systemctl reload nginx
    log "Nginx configuration applied successfully"
else
    error "Nginx configuration test failed"
fi

# Setup SSL certificate if initial setup and domain is configured
if [[ "$INITIAL_SETUP" == true ]]; then
    log "Checking SSL certificate..."
    if ! sudo test -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem; then
        log "Setting up SSL certificate..."
        sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@backspace.fm || warn "SSL setup failed. Run manually: sudo certbot --nginx -d $DOMAIN"
    else
        log "SSL certificate already exists"
    fi
fi

# Wait for application to start
log "Waiting for application to start..."
sleep 5

# Health check
log "Performing health check..."
max_attempts=10
attempt=0

while [[ $attempt -lt $max_attempts ]]; do
    if curl -f -s http://localhost:5000/ > /dev/null; then
        log "Application is running successfully!"
        break
    else
        attempt=$((attempt + 1))
        if [[ $attempt -eq $max_attempts ]]; then
            error "Application failed to start. Check logs: pm2 logs $SERVICE_NAME"
        fi
        log "Waiting for application... (attempt $attempt/$max_attempts)"
        sleep 3
    fi
done

# Final status
log "Deployment completed successfully!"
echo ""
echo "Application Status:"
pm2 status
echo ""
echo "Access URLs:"
echo "- HTTPS: https://$DOMAIN"
echo "- HTTP: http://$SERVER_IP (redirects to HTTPS)"
echo ""
echo "Management Commands:"
echo "- View logs: pm2 logs $SERVICE_NAME"
echo "- Restart: pm2 restart $SERVICE_NAME"
echo "- Status: pm2 status"
echo "- Nginx logs: sudo tail -f /var/log/nginx/$DOMAIN.error.log"
echo ""
echo "Update deployment: git pull && ./deploy.sh"
echo "Health check: curl -I https://$DOMAIN/health"