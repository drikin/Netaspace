#!/bin/bash

# DNS verification script for neta.backspace.fm

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

DOMAIN="neta.backspace.fm"

echo "================================================"
echo "  DNS Check for $DOMAIN"
echo "================================================"

# Get server's public IP
print_status "Getting server's public IP address..."
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || curl -s ipecho.net/plain 2>/dev/null)
if [ -n "$SERVER_IP" ]; then
    print_success "Server IP: $SERVER_IP"
else
    print_warning "Could not determine server IP automatically"
    SERVER_IP="[UNKNOWN]"
fi

# Check DNS resolution
print_status "Checking DNS resolution for $DOMAIN..."
RESOLVED_IP=$(dig +short $DOMAIN 2>/dev/null | tail -n1)

if [ -n "$RESOLVED_IP" ]; then
    print_success "DNS resolved to: $RESOLVED_IP"
    
    if [ "$RESOLVED_IP" = "$SERVER_IP" ]; then
        print_success "DNS points to this server ✓"
    else
        print_warning "DNS points to different IP address"
        echo "  Expected: $SERVER_IP"
        echo "  Resolved: $RESOLVED_IP"
    fi
else
    print_error "DNS resolution failed"
    echo "  The domain $DOMAIN does not resolve to an IP address"
fi

# Check from multiple DNS servers
print_status "Checking DNS from different servers..."

dns_servers=("8.8.8.8" "1.1.1.1" "208.67.222.222")
dns_names=("Google" "Cloudflare" "OpenDNS")

for i in "${!dns_servers[@]}"; do
    server="${dns_servers[$i]}"
    name="${dns_names[$i]}"
    
    result=$(dig @$server +short $DOMAIN 2>/dev/null | tail -n1)
    if [ -n "$result" ]; then
        echo "  $name ($server): $result"
    else
        echo "  $name ($server): No response"
    fi
done

# Check HTTP connectivity
print_status "Testing HTTP connectivity..."

if curl -s --connect-timeout 10 http://$DOMAIN/api/version > /dev/null 2>&1; then
    print_success "HTTP connection successful"
    response=$(curl -s http://$DOMAIN/api/version 2>/dev/null)
    echo "  Response: $response"
else
    print_error "HTTP connection failed"
fi

# Check HTTPS connectivity
print_status "Testing HTTPS connectivity..."

if curl -s --connect-timeout 10 https://$DOMAIN/api/version > /dev/null 2>&1; then
    print_success "HTTPS connection successful"
    
    # Check SSL certificate
    print_status "Checking SSL certificate..."
    cert_info=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
    if [ -n "$cert_info" ]; then
        echo "  $cert_info"
    fi
else
    print_warning "HTTPS connection failed (SSL may not be configured yet)"
fi

# Summary and recommendations
echo ""
print_status "Summary and next steps:"

if [ -z "$RESOLVED_IP" ]; then
    print_error "DNS Setup Required:"
    echo "  1. Add A record in your DNS provider:"
    echo "     Name: neta"
    echo "     Type: A"
    echo "     Value: $SERVER_IP"
    echo "     TTL: 300"
    echo ""
    echo "  2. Wait for DNS propagation (5-60 minutes)"
    echo "  3. Run this script again to verify"
elif [ "$RESOLVED_IP" != "$SERVER_IP" ]; then
    print_warning "DNS Misconfiguration:"
    echo "  Update your A record to point to: $SERVER_IP"
    echo "  Current value: $RESOLVED_IP"
else
    print_success "DNS is correctly configured!"
    
    if ! curl -s https://$DOMAIN/api/version > /dev/null 2>&1; then
        echo ""
        print_status "SSL Setup Required:"
        echo "  Run: sudo ./scripts/nginx-setup.sh $DOMAIN your-email@domain.com"
    else
        print_success "Domain is fully configured and accessible!"
    fi
fi

echo ""
print_status "Useful commands:"
echo "  dig $DOMAIN                    # Check DNS resolution"
echo "  curl -I http://$DOMAIN         # Test HTTP"
echo "  curl -I https://$DOMAIN        # Test HTTPS"
echo "  ./scripts/nginx-status.sh      # Check server status"