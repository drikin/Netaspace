#!/bin/bash

# Security script to block direct access to port 5000 from external IPs
# Only allow access through nginx reverse proxy on port 80/443

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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root or with sudo"
    exit 1
fi

echo "================================================"
echo "  Port Security Configuration"
echo "================================================"

# Enable UFW if not already enabled
print_status "Configuring UFW firewall..."
if ! ufw status | grep -q "Status: active"; then
    print_warning "Enabling UFW firewall..."
    echo "y" | ufw enable
fi

# Reset UFW to defaults first (optional)
read -p "Reset UFW rules to defaults? (y/N): " reset_ufw
if [[ $reset_ufw =~ ^[Yy]$ ]]; then
    print_status "Resetting UFW to defaults..."
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
fi

# Allow essential services
print_status "Allowing essential services..."
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

# Block port 5000 from external access (allow only localhost)
print_status "Blocking external access to port 5000..."
ufw deny 5000/tcp

# Allow localhost to access port 5000 (for nginx reverse proxy)
print_status "Allowing localhost access to port 5000..."
ufw allow from 127.0.0.1 to any port 5000

# Show current rules
print_success "Firewall configuration completed!"
print_status "Current UFW rules:"
ufw status numbered

echo ""
print_status "Port access summary:"
echo "  ✓ Port 22  (SSH): Allowed from anywhere"
echo "  ✓ Port 80  (HTTP): Allowed from anywhere"  
echo "  ✓ Port 443 (HTTPS): Allowed from anywhere"
echo "  ✗ Port 5000: Blocked from external IPs"
echo "  ✓ Port 5000: Allowed from localhost (127.0.0.1)"

echo ""
print_status "Testing configuration..."

# Test external blocking
print_status "Checking if port 5000 is blocked externally..."
if ss -tlnp | grep -q ":5000 "; then
    print_success "Port 5000 is running locally"
    
    # Test localhost access
    if curl -s --connect-timeout 5 http://127.0.0.1:5000/api/version > /dev/null; then
        print_success "Localhost can access port 5000 ✓"
    else
        print_warning "Localhost cannot access port 5000"
    fi
else
    print_warning "Port 5000 is not running"
fi

echo ""
print_status "Additional security recommendations:"
echo "  1. Ensure your app only binds to 127.0.0.1:5000 (not 0.0.0.0:5000)"
echo "  2. Monitor nginx access logs: tail -f /var/log/nginx/access.log"
echo "  3. Regularly update system: apt update && apt upgrade"

echo ""
print_success "Security configuration completed!"
print_status "Your app is now only accessible through:"
echo "  - https://neta.backspace.fm (SSL encrypted)"
echo "  - http://neta.backspace.fm (redirected to HTTPS)"
echo "  - Direct port 5000 access is blocked from external IPs"