#!/bin/bash

# Quick deployment from uploaded bundle
# Run this after uploading and extracting the deployment bundle

set -e

echo "Quick Deploy from Bundle"
echo "========================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Please run from project directory."
    exit 1
fi

# 1. Install dependencies
echo "Step 1: Installing dependencies..."
npm ci --production

# 2. Build application
echo "Step 2: Building application..."
npm run build

# 3. Setup environment file
echo "Step 3: Setting up environment..."
if [ ! -f .env ]; then
    cp .env.production .env
    echo "Environment file created from .env.production"
fi

# 4. Test database connection
echo "Step 4: Testing database connection..."
if npm run db:push; then
    echo "Database connection successful"
else
    echo "Database connection failed. Please check .env file"
    exit 1
fi

# 5. Stop existing PM2 process if running
echo "Step 5: Managing PM2 processes..."
pm2 stop neta-app 2>/dev/null || true
pm2 delete neta-app 2>/dev/null || true

# 6. Start application with PM2
echo "Step 6: Starting application..."
pm2 start dist/index.js --name "neta-app" -i 1 --max-memory-restart 300M
pm2 save

# 7. Setup PM2 startup (only if not already configured)
if ! pm2 startup | grep -q "already"; then
    pm2 startup
fi

# 8. Configure Nginx
echo "Step 7: Configuring Nginx..."
sudo tee /etc/nginx/sites-available/neta > /dev/null <<EOF
server {
    listen 80;
    server_name neta.backspace.fm 153.125.147.133;
    
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

# Remove default site and enable our site
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/neta /etc/nginx/sites-enabled/

# Test and reload nginx
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "Nginx configured successfully"
else
    echo "Nginx configuration error"
    exit 1
fi

# 9. Test application
echo "Step 8: Testing application..."
sleep 3

if curl -f http://localhost:5000/health >/dev/null 2>&1; then
    echo "✅ Application is running successfully!"
else
    echo "❌ Application health check failed"
    echo "Checking PM2 logs..."
    pm2 logs neta-app --lines 10
    exit 1
fi

# 10. Final status
echo ""
echo "🎉 Deployment Complete!"
echo "========================"
echo ""
echo "Application Status:"
pm2 status

echo ""
echo "Access URLs:"
echo "- Direct IP: http://153.125.147.133"
echo "- Domain: http://neta.backspace.fm (after DNS setup)"
echo ""
echo "Management Commands:"
echo "- View logs: pm2 logs neta-app"
echo "- Restart: pm2 restart neta-app"
echo "- Stop: pm2 stop neta-app"
echo "- Status: pm2 status"
echo ""
echo "Next Steps:"
echo "1. Configure DNS: Add A record 'neta' pointing to 153.125.147.133"
echo "2. Setup SSL: sudo apt install certbot python3-certbot-nginx"
echo "3. Get certificate: sudo certbot --nginx -d neta.backspace.fm"
echo ""
echo "Monitor with: pm2 logs neta-app --lines 50"