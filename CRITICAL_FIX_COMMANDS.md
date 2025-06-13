# Critical Fix - Run These Exact Commands

Your app is crashing because DATABASE_URL isn't loaded. Run these commands to fix:

```bash
cd ~/Netaspace

# Stop broken process
pm2 stop neta-app
pm2 delete neta-app

# Start with environment variables
pm2 start ecosystem.config.js
pm2 save

# Wait for startup
sleep 10

# Verify fix
netstat -tlnp | grep :5000
curl http://localhost:5000/health
pm2 logs neta-app --lines 5
```

After these commands:
- Port 5000 will be listening
- Health check will succeed
- External access at http://153.125.147.133 will work
- Connection refused errors will stop