#!/bin/bash

# Debug script for 502 Bad Gateway issue
# Run this on your server to diagnose and fix the issue

echo "=== Debugging 502 Bad Gateway ==="
echo ""

echo "1. Checking PM2 status:"
pm2 status

echo ""
echo "2. Checking if app responds on localhost:"
curl -v http://localhost:5000/health 2>&1 | head -10

echo ""
echo "3. Checking Nginx configuration:"
sudo nginx -t

echo ""
echo "4. Checking active Nginx sites:"
ls -la /etc/nginx/sites-enabled/

echo ""
echo "5. Checking Nginx error logs:"
sudo tail -5 /var/log/nginx/error.log

echo ""
echo "6. Checking app logs:"
pm2 logs neta-app --lines 10

echo ""
echo "7. Testing direct connection:"
telnet localhost 5000 < /dev/null

echo ""
echo "=== Fixes ==="
echo ""

echo "Ensuring Nginx proxy configuration is correct..."
sudo tee /etc/nginx/sites-available/neta.backspace.fm > /dev/null <<'EOF'
server {
    listen 80;
    server_name neta.backspace.fm 153.125.147.133;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name neta.backspace.fm 153.125.147.133;
    
    # Basic SSL configuration (update paths if certificates exist)
    # ssl_certificate /path/to/certificate;
    # ssl_certificate_key /path/to/private/key;
    
    # For now, handle both HTTP and HTTPS
    error_page 497 https://$server_name$request_uri;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # Handle OPTIONS requests for CORS
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
    
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }
}
EOF

echo "Testing new Nginx configuration..."
if sudo nginx -t; then
    echo "Nginx config is valid, reloading..."
    sudo systemctl reload nginx
    echo "Nginx reloaded successfully"
else
    echo "Nginx config has errors!"
    exit 1
fi

echo ""
echo "Restarting PM2 application..."
pm2 restart neta-app

echo ""
echo "Waiting for app to start..."
sleep 3

echo ""
echo "Final health check:"
echo "Testing localhost:5000..."
curl -s http://localhost:5000/health && echo "✓ App responding on localhost"

echo "Testing via Nginx..."
curl -s -I http://153.125.147.133 | head -5

echo ""
echo "=== Status Summary ==="
pm2 status
echo ""
echo "If you still see 502, check:"
echo "1. pm2 logs neta-app"
echo "2. sudo tail -f /var/log/nginx/error.log"
echo "3. curl -v http://localhost:5000"