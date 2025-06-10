#!/bin/bash

# Apply the fix for 502 Bad Gateway

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "================================================"
echo "  Applying 502 Fix"
echo "================================================"

print_status "Stopping containers..."
docker-compose down

print_status "Rebuilding containers with updated configuration..."
docker-compose up -d --build

print_status "Waiting for PostgreSQL and application startup..."
sleep 30

print_status "Testing application health..."
for i in {1..30}; do
    if curl -s --connect-timeout 2 http://127.0.0.1:5000/api/version > /dev/null; then
        print_success "Application is responding"
        break
    else
        echo -n "."
        sleep 2
    fi
    
    if [ $i -eq 30 ]; then
        print_error "Application still not responding"
        exit 1
    fi
done

print_status "Testing nginx proxy..."
if curl -s --connect-timeout 5 http://localhost/api/version > /dev/null; then
    print_success "Nginx proxy working"
else
    print_error "Nginx proxy still failing"
    sudo systemctl restart nginx
    sleep 5
    
    if curl -s --connect-timeout 5 http://localhost/api/version > /dev/null; then
        print_success "Nginx proxy now working after restart"
    else
        print_error "Nginx proxy still failing after restart"
    fi
fi

print_status "Checking container health..."
docker ps | grep backspace

echo ""
print_success "Fix applied! Test with: https://neta.backspace.fm"