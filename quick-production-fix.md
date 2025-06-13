# Immediate Production Fix

Your server has two issues:
1. DATABASE_URL environment variable not loaded by PM2
2. Nginx proxying to wrong port (3001 instead of 5000)

Run these exact commands on your server:

```bash
cd ~/Netaspace

# Stop current broken process
pm2 stop neta-app
pm2 delete neta-app

# Create PM2 ecosystem file with explicit environment
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'neta-app',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'cluster',
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      DATABASE_URL: 'postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require',
      SESSION_SECRET: 'neta-backspace-fm-super-secret-session-key-2025',
      DOMAIN: 'neta.backspace.fm',
      HOST: '0.0.0.0'
    }
  }]
}
EOF

# Start with ecosystem config
pm2 start ecosystem.config.js
pm2 save

# Fix Nginx port configuration
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

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx

# Test the fix
sleep 3
curl http://localhost:5000/health
curl -I http://153.125.147.133
```

After running these commands, your app will be accessible at http://153.125.147.133

Check status with: `pm2 status` and `pm2 logs neta-app`