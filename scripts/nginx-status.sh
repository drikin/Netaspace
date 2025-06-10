#!/bin/bash

# Nginx status and monitoring script

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
echo "  Nginx & Application Status"
echo "================================================"

# Check nginx status
print_status "Checking nginx status..."
if systemctl is-active --quiet nginx; then
    print_success "Nginx is running"
else
    print_error "Nginx is not running"
    echo "  To start: sudo systemctl start nginx"
fi

# Check nginx configuration
print_status "Testing nginx configuration..."
if nginx -t 2>/dev/null; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration has errors"
    echo "  Run: sudo nginx -t"
fi

# Check if backspace-fm site is enabled
print_status "Checking site configuration..."
if [ -L /etc/nginx/sites-enabled/backspace-fm ]; then
    print_success "Backspace-fm site is enabled"
else
    print_warning "Backspace-fm site is not enabled"
fi

# Check Docker containers
print_status "Checking Docker containers..."
if command -v docker-compose &> /dev/null; then
    if docker-compose ps | grep -q "Up"; then
        print_success "Docker containers are running"
        docker-compose ps
    else
        print_warning "Docker containers are not running"
        echo "  To start: docker-compose up -d"
    fi
else
    print_warning "Docker compose not found"
fi

# Test HTTP connectivity
print_status "Testing HTTP connectivity..."
if curl -s http://localhost/api/version > /dev/null; then
    print_success "App is responding on port 80"
    echo "  Response: $(curl -s http://localhost/api/version | head -c 100)..."
else
    print_error "App is not responding on port 80"
fi

# Test direct app connectivity
print_status "Testing direct app connectivity..."
if curl -s http://localhost:5000/api/version > /dev/null; then
    print_success "App is responding on port 5000"
else
    print_error "App is not responding on port 5000"
fi

# Show nginx error logs (last 10 lines)
print_status "Recent nginx error logs:"
if [ -f /var/log/nginx/error.log ]; then
    tail -n 10 /var/log/nginx/error.log | sed 's/^/  /'
else
    echo "  No error log found"
fi

echo ""
print_status "Quick commands:"
echo "  sudo systemctl status nginx    # Detailed nginx status"
echo "  sudo systemctl reload nginx    # Reload configuration"
echo "  sudo tail -f /var/log/nginx/access.log  # Watch access logs"
echo "  docker-compose logs -f         # Watch app logs"