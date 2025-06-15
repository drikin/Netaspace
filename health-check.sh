#!/bin/bash

# Health check script for neta.backspace.fm
# Usage: ./health-check.sh

set -e

echo "🔍 Health Check for neta.backspace.fm"
echo "======================================"

# Check if PM2 is running
echo "📊 PM2 Status:"
pm2 status

# Check application health endpoint
echo ""
echo "🌐 Application Health:"
if curl -f -s http://localhost:5000/health > /dev/null; then
    echo "✅ Application is responding"
    curl -s http://localhost:5000/health | jq .
else
    echo "❌ Application is not responding"
    echo "Checking PM2 logs..."
    pm2 logs neta-app --lines 10
fi

# Check Nginx status
echo ""
echo "🔧 Nginx Status:"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is not running"
    sudo systemctl status nginx
fi

# Check SSL certificate
echo ""
echo "🔒 SSL Certificate:"
if command -v openssl &> /dev/null; then
    ssl_info=$(echo | openssl s_client -servername neta.backspace.fm -connect neta.backspace.fm:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "✅ SSL Certificate is valid"
        echo "$ssl_info"
    else
        echo "❌ SSL Certificate check failed"
    fi
else
    echo "⚠️  OpenSSL not available for certificate check"
fi

# Check disk space
echo ""
echo "💾 Disk Usage:"
df -h / | grep -E "/$"

# Check memory usage
echo ""
echo "🧠 Memory Usage:"
free -h

# Check system load
echo ""
echo "⚡ System Load:"
uptime

echo ""
echo "======================================"
echo "Health check completed"