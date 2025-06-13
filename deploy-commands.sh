#!/bin/bash

# Complete deployment commands for 153.125.147.133
# Run these commands on your sakura cloud server

echo "🚀 Starting deployment to 153.125.147.133..."

# Step 1: Initial server setup
echo "=== 1. Server Initial Setup ==="
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx curl git ufw fail2ban jq

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Step 2: Firewall configuration
echo "=== 2. Configuring Firewall ==="
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Step 3: Clone repository
echo "=== 3. Cloning Repository ==="
cd /home/ubuntu
git clone https://github.com/your-username/neta-backspace-fm.git
cd neta-backspace-fm

# Step 4: Install dependencies and build
echo "=== 4. Installing Dependencies ==="
npm ci --production
npm run build

# Step 5: Setup environment variables
echo "=== 5. Setting up Environment Variables ==="
cp .env.production .env

# Edit this file with your actual database credentials
echo "⚠️  IMPORTANT: Edit .env file with your Neon database credentials"
echo "Run: nano .env"
echo "Update DATABASE_URL with your actual Neon PostgreSQL connection string"
read -p "Press Enter after updating .env file..."

# Step 6: Database migration
echo "=== 6. Database Setup ==="
npm run db:push

# Step 7: Start application with PM2
echo "=== 7. Starting Application ==="
pm2 stop neta-app 2>/dev/null || true
pm2 delete neta-app 2>/dev/null || true
pm2 start pm2.config.js
pm2 save
pm2 startup

# Step 8: Setup Nginx
echo "=== 8. Configuring Nginx ==="
sudo cp nginx-config.conf /etc/nginx/sites-available/neta.backspace.fm
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/neta.backspace.fm /etc/nginx/sites-enabled/

# Create temporary HTTP-only config for SSL setup
sudo tee /etc/nginx/sites-available/neta-temp.conf > /dev/null <<EOF
server {
    listen 80;
    server_name neta.backspace.fm 153.125.147.133;
    
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
    }
}
EOF

sudo rm -f /etc/nginx/sites-enabled/neta.backspace.fm
sudo ln -s /etc/nginx/sites-available/neta-temp.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Step 9: Install SSL certificate
echo "=== 9. Setting up SSL Certificate ==="
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d neta.backspace.fm --non-interactive --agree-tos --email admin@backspace.fm

# Step 10: Apply final Nginx configuration with SSL
echo "=== 10. Applying Final Nginx Configuration ==="
sudo rm -f /etc/nginx/sites-enabled/neta-temp.conf
sudo ln -s /etc/nginx/sites-available/neta.backspace.fm /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Step 11: Final checks
echo "=== 11. Final Verification ==="
pm2 status
sudo systemctl status nginx
curl -I https://neta.backspace.fm/health

echo "✅ Deployment completed!"
echo ""
echo "Application URLs:"
echo "- HTTPS: https://neta.backspace.fm"
echo "- HTTP (redirects): http://153.125.147.133"
echo ""
echo "Management commands:"
echo "- View logs: pm2 logs neta-app"
echo "- Restart app: pm2 restart neta-app"
echo "- Check status: pm2 status"
echo "- View nginx logs: sudo tail -f /var/log/nginx/neta.backspace.fm.error.log"