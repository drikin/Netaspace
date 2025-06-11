#!/bin/bash

# Final deployment script for Backspace.fm
set -e

echo "Starting production deployment..."

# Stop any existing processes
sudo pkill -f "node.*production-server" || true
sudo systemctl stop backspace-fm || true

# Copy service file
sudo cp /home/ubuntu/backspace-fm.service /etc/systemd/system/
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable backspace-fm
sudo systemctl start backspace-fm

# Check status
sudo systemctl status backspace-fm

# Configure nginx
sudo tee /etc/nginx/sites-available/backspace-fm > /dev/null << 'EOF'
server {
    listen 80;
    server_name neta.backspace.fm;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/backspace-fm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

echo "Deployment completed successfully!"
echo "Application should be available at http://neta.backspace.fm"