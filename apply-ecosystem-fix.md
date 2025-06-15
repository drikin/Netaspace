# Apply Ecosystem Configuration Fix

Run these commands to restart PM2 with proper environment variables:

```bash
cd ~/Netaspace
pm2 stop neta-app
pm2 delete neta-app
pm2 start ecosystem.config.js
pm2 save
sleep 10
netstat -tlnp | grep :5000
curl http://localhost:5000/health
```

This will load the DATABASE_URL and resolve the connection refused errors.