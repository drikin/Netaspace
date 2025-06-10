#!/bin/bash

# Diagnose 502 Bad Gateway issues

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "================================================"
echo "  502 Bad Gateway Diagnosis"
echo "================================================"

# Check Docker containers
print_status "Checking Docker containers..."
if command -v docker &> /dev/null; then
    if docker ps | grep -q backspace; then
        print_success "Docker containers are running"
        docker ps | grep backspace
    else
        print_error "Docker containers are not running"
        print_status "Starting containers..."
        docker-compose up -d
        sleep 5
    fi
else
    print_error "Docker not found"
fi

# Check application logs
print_status "Checking application logs..."
if docker logs $(docker ps -q --filter "name=backspace") 2>/dev/null | tail -10; then
    echo ""
else
    print_warning "Could not retrieve Docker logs"
fi

# Test localhost connection
print_status "Testing localhost:5000 connection..."
if curl -s --connect-timeout 5 http://127.0.0.1:5000/api/version > /dev/null; then
    print_success "App responds on localhost:5000"
    response=$(curl -s http://127.0.0.1:5000/api/version)
    echo "  Response: $response"
else
    print_error "App not responding on localhost:5000"
    
    # Check if port is bound
    print_status "Checking port 5000 binding..."
    if ss -tlnp | grep :5000; then
        print_warning "Port 5000 is bound but not responding"
    else
        print_error "Port 5000 is not bound"
    fi
fi

# Check nginx status
print_status "Checking nginx status..."
if systemctl is-active --quiet nginx; then
    print_success "Nginx is running"
else
    print_error "Nginx is not running"
    print_status "Starting nginx..."
    sudo systemctl start nginx
fi

# Check nginx configuration
print_status "Testing nginx configuration..."
if sudo nginx -t 2>/dev/null; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration has errors"
    sudo nginx -t
fi

# Check nginx error logs
print_status "Recent nginx error logs:"
if [ -f /var/log/nginx/error.log ]; then
    sudo tail -n 10 /var/log/nginx/error.log | sed 's/^/  /'
else
    print_warning "No nginx error log found"
fi

# Test direct nginx upstream
print_status "Testing nginx upstream connection..."
if curl -s --connect-timeout 5 http://localhost/api/version > /dev/null; then
    print_success "Nginx proxy is working"
else
    print_error "Nginx proxy connection failed"
fi

echo ""
print_status "Quick fixes to try:"
echo "  1. Restart application: docker-compose restart"
echo "  2. Restart nginx: sudo systemctl restart nginx" 
echo "  3. Check logs: docker logs \$(docker ps -q --filter name=backspace)"
echo "  4. Test direct app: curl http://127.0.0.1:5000/api/version"