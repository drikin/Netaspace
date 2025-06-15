# Fix 502 Error - Run These Commands

Your server has two specific issues that need immediate fixing:

## Problem 1: Database Connection
The app logs show: `DATABASE_URL must be set` - PM2 isn't loading environment variables properly.

## Problem 2: Wrong Port
Nginx error logs show it's trying to connect to port 3001, but your app runs on port 5000.

## Fix Commands (Run on Server)

```bash
cd ~/Netaspace

# 1. Stop broken process
pm2 stop neta-app
pm2 delete neta-app

# 2. Create proper PM2 config with environment variables
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'neta-app',
    script: 'dist/index.js',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      DATABASE_URL: 'postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require',
      SESSION_SECRET: 'neta-backspace-fm-super-secret-session-key-2025',
      HOST: '0.0.0.0'
    }
  }]
}
EOF

# 3. Start with proper config
pm2 start ecosystem.config.js
pm2 save

# 4. Fix Nginx to use correct port (5000)
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

# 5. Apply Nginx changes
sudo nginx -t && sudo systemctl reload nginx

# 6. Test
sleep 3
curl http://localhost:5000/health
pm2 status
```

After these commands, your app will be accessible at http://153.125.147.133