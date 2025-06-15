#!/bin/bash

# Quick deployment script for 153.125.147.133
# This is the simplified version for immediate deployment

set -e

echo "Quick Deploy to 153.125.147.133"
echo "================================"

# Check if running as ubuntu user
if [ "$USER" != "ubuntu" ]; then
    echo "Please run as ubuntu user: sudo -u ubuntu $0"
    exit 1
fi

# Navigate to home directory
cd /home/ubuntu

# 1. System preparation
echo "Step 1: System update..."
sudo apt update
sudo apt install -y curl git nginx

# 2. Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Step 2: Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# 3. Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "Step 3: Installing PM2..."
    sudo npm install -g pm2
fi

# 4. Clone or update repository
if [ -d "neta-backspace-fm" ]; then
    echo "Step 4: Updating existing repository..."
    cd neta-backspace-fm
    git pull
else
    echo "Step 4: Cloning repository..."
    # Replace with your actual repository URL
    git clone https://github.com/your-username/neta-backspace-fm.git
    cd neta-backspace-fm
fi

# 5. Install dependencies
echo "Step 5: Installing dependencies..."
npm ci --production

# 6. Build application
echo "Step 6: Building application..."
npm run build

# 7. Setup environment file
echo "Step 7: Setting up environment..."
if [ ! -f .env ]; then
    cp .env.production .env
    echo "⚠️  EDIT .env FILE WITH YOUR DATABASE_URL"
    echo "Example: DATABASE_URL=postgresql://user:pass@host:5432/db"
    echo "Press Enter when ready to continue..."
    read
fi

# 8. Test database connection
echo "Step 8: Testing database..."
npm run db:push

# 9. Start with PM2
echo "Step 9: Starting application..."
pm2 stop neta-app 2>/dev/null || true
pm2 delete neta-app 2>/dev/null || true
pm2 start dist/index.js --name "neta-app" -i 1
pm2 save

# 10. Basic Nginx setup (HTTP only first)
echo "Step 10: Configuring Nginx..."
sudo tee /etc/nginx/sites-available/neta > /dev/null <<EOF
server {
    listen 80;
    server_name neta.backspace.fm 153.125.147.133;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/neta /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 11. Test application
echo "Step 11: Testing application..."
sleep 3
if curl -f http://localhost:5000/health; then
    echo "✅ Application is running!"
else
    echo "❌ Application failed to start"
    pm2 logs neta-app --lines 20
    exit 1
fi

echo ""
echo "🎉 Basic deployment complete!"
echo "Application is accessible at:"
echo "- http://153.125.147.133"
echo "- http://neta.backspace.fm (if DNS is configured)"
echo ""
echo "Next steps for production:"
echo "1. Setup SSL: sudo apt install certbot python3-certbot-nginx"
echo "2. Get certificate: sudo certbot --nginx -d neta.backspace.fm"
echo "3. Setup firewall: sudo ufw enable && sudo ufw allow 'Nginx Full'"
echo ""
echo "Monitor with: pm2 logs neta-app"