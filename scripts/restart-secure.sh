#!/bin/bash

# Script to restart the application in secure mode

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
echo "  Secure Application Restart"
echo "================================================"

# 1. Enable UFW firewall
print_status "Enabling UFW firewall..."
sudo ufw --force enable

print_status "UFW status:"
sudo ufw status

# 2. Stop current containers
print_status "Stopping current containers..."
docker-compose down

# 3. Rebuild and start containers in production mode
print_status "Starting containers in secure mode..."
docker-compose up -d --build

# 4. Wait for app to start
print_status "Waiting for PostgreSQL and application to start..."
sleep 20

# 5. Check application status
print_status "Checking application status..."
if docker-compose ps | grep -q "Up"; then
    print_success "Containers are running"
    docker-compose ps
else
    print_error "Containers failed to start"
    exit 1
fi

# 6. Check bind address
print_status "Checking application bind address..."
docker-compose logs backspace-fm | grep "serving on" | tail -1

# 7. Test localhost access
print_status "Testing localhost access..."
if curl -s --connect-timeout 5 http://127.0.0.1:5000/api/version > /dev/null; then
    print_success "Localhost access works"
else
    print_error "Localhost access failed"
fi

# 8. Test external access (should fail)
print_status "Testing external access (should be blocked)..."
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")
if [ "$SERVER_IP" != "unknown" ]; then
    if timeout 5 curl -s http://$SERVER_IP:5000/api/version > /dev/null; then
        print_error "External access still works - security not properly configured"
    else
        print_success "External access blocked - security configured correctly"
    fi
else
    print_warning "Could not determine server IP for external test"
fi

# 9. Test nginx proxy
print_status "Testing nginx proxy access..."
if curl -s --connect-timeout 5 http://localhost/api/version > /dev/null; then
    print_success "Nginx proxy access works"
else
    print_warning "Nginx proxy access failed - check nginx configuration"
fi

echo ""
print_success "Secure restart completed!"
echo ""
print_status "Access summary:"
echo "  ✓ https://neta.backspace.fm - Public access through nginx"
echo "  ✓ http://localhost:5000 - Local access only"
echo "  ✗ http://$SERVER_IP:5000 - External access blocked"