#!/bin/bash

cd ~/Netaspace

echo "=== Fixing Production Issues ==="

# 1. Fix environment variables
echo "1. Setting up environment variables..."
cp .env.production .env
chmod 600 .env

# 2. Fix Nginx port configuration
echo "2. Fixing Nginx configuration..."
sudo tee /etc/nginx/sites-available/neta.backspace.fm > /dev/null <<'EOF'
server {
    listen 80;
    server_name neta.backspace.fm 153.125.147.133;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }
}
EOF

sudo nginx -t && sudo systemctl reload nginx

# 3. Restart PM2 with environment variables
echo "3. Restarting application with proper environment..."
pm2 stop neta-app
pm2 delete neta-app

# Start with explicit environment file
pm2 start dist/index.js --name "neta-app" --env-file .env --max-memory-restart 300M
pm2 save

echo "4. Waiting for application to start..."
sleep 5

echo "5. Testing application..."
curl -s http://localhost:5000/health && echo "✓ App responding" || echo "✗ App not responding"

echo "6. Final status:"
pm2 status
pm2 logs neta-app --lines 3

echo ""
echo "Application should now be accessible at http://153.125.147.133"