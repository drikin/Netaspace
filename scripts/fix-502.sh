#!/bin/bash

# Fix 502 Bad Gateway error by ensuring proper application startup

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
echo "  Fixing 502 Bad Gateway"
echo "================================================"

# Stop containers completely
print_status "Stopping all containers..."
docker-compose down

# Wait a moment
sleep 3

# Start containers with proper logging
print_status "Starting containers..."
docker-compose up -d

# Wait for startup
print_status "Waiting for application startup..."
sleep 15

# Check if app is responding
print_status "Testing application..."
for i in {1..30}; do
    if curl -s --connect-timeout 2 http://127.0.0.1:5000/api/version > /dev/null; then
        print_success "Application is responding"
        break
    else
        echo -n "."
        sleep 2
    fi
    
    if [ $i -eq 30 ]; then
        print_error "Application failed to start properly"
        exit 1
    fi
done

# Test nginx
print_status "Testing nginx proxy..."
if curl -s --connect-timeout 5 http://localhost/api/version > /dev/null; then
    print_success "Nginx proxy is working"
else
    print_warning "Nginx proxy still failing, restarting nginx..."
    sudo systemctl restart nginx
    sleep 5
    
    if curl -s --connect-timeout 5 http://localhost/api/version > /dev/null; then
        print_success "Nginx proxy now working"
    else
        print_error "Nginx proxy still failing"
    fi
fi

echo ""
print_status "Final status check:"
echo "  App on localhost:5000: $(curl -s http://127.0.0.1:5000/api/version 2>/dev/null || echo 'FAILED')"
echo "  Nginx proxy: $(curl -s http://localhost/api/version 2>/dev/null || echo 'FAILED')"