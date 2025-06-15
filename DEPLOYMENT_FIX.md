# Quick Fix for Deployment Issue

The deployment failed at the build step because `vite` was missing. Run these commands on your server to complete the deployment:

## Fix Commands

SSH to your server and run:

```bash
cd ~/Netaspace

# Install all dependencies (including dev dependencies for build)
npm ci

# Build the application
npm run build

# Start the application with PM2
pm2 stop neta-app 2>/dev/null || true
pm2 delete neta-app 2>/dev/null || true
pm2 start dist/index.js --name "neta-app" -i 1 --max-memory-restart 300M
pm2 save

# Configure Nginx
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
    }
}
EOF

# Enable the site
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/neta.backspace.fm /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Test the application
curl http://localhost:5000/health
```

## Verify Deployment

Check that everything is running:

```bash
pm2 status
curl -I http://153.125.147.133
```

## DNS Configuration

Add this A record to backspace.fm DNS:
```
Type: A
Name: neta
Value: 153.125.147.133
```

## SSL Setup (After DNS)

Once DNS propagates:
```bash
sudo certbot --nginx -d neta.backspace.fm
```

## Future Updates

For future deployments, the corrected script is available. Simply run:
```bash
git pull
./update.sh
```

The application will be accessible at http://153.125.147.133 immediately and https://neta.backspace.fm after DNS + SSL setup.