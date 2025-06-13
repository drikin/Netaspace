#!/bin/bash

# Fixed deployment script for neta.backspace.fm
# Run this to complete the deployment after the vite error

set -e

PROJECT_DIR="$HOME/Netaspace"
SERVICE_NAME="neta-app"
DOMAIN="neta.backspace.fm"
SERVER_IP="153.125.147.133"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

cd "$PROJECT_DIR"

log "Installing all dependencies (including dev dependencies)..."
npm ci

log "Building application..."
npm run build

log "Setting up environment variables..."
if [[ ! -f .env ]]; then
    cp .env.production .env
    log "Environment file created"
fi

log "Setting up database..."
npm run db:push

log "Managing PM2 processes..."
pm2 stop $SERVICE_NAME 2>/dev/null || true
pm2 delete $SERVICE_NAME 2>/dev/null || true

log "Starting application with PM2..."
pm2 start dist/index.js --name "$SERVICE_NAME" -i 1 --max-memory-restart 300M
pm2 save
pm2 startup

log "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN $SERVER_IP;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
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
    
    location /health {
        access_log off;
        proxy_pass http://127.0.0.1:5000/health;
    }
}
EOF

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

if sudo nginx -t; then
    sudo systemctl reload nginx
    log "Nginx configured successfully"
else
    log "Nginx configuration error"
    exit 1
fi

log "Waiting for application to start..."
sleep 5

# Health check
max_attempts=10
attempt=0

while [[ $attempt -lt $max_attempts ]]; do
    if curl -f -s http://localhost:5000/health > /dev/null; then
        log "Application is running successfully!"
        break
    else
        attempt=$((attempt + 1))
        if [[ $attempt -eq $max_attempts ]]; then
            log "Application failed to start. Checking logs..."
            pm2 logs $SERVICE_NAME --lines 20
            exit 1
        fi
        log "Waiting for application... (attempt $attempt/$max_attempts)"
        sleep 3
    fi
done

log "Deployment completed successfully!"
echo ""
echo "Application Status:"
pm2 status
echo ""
echo "Access URLs:"
echo "- HTTP: http://$SERVER_IP"
echo "- Domain: http://$DOMAIN (after DNS setup)"
echo ""
echo "Next steps:"
echo "1. Configure DNS: Add A record 'neta' pointing to $SERVER_IP"
echo "2. Setup SSL: sudo certbot --nginx -d $DOMAIN"
echo ""
echo "Management commands:"
echo "- View logs: pm2 logs $SERVICE_NAME"
echo "- Restart: pm2 restart $SERVICE_NAME"