#!/bin/bash

# Nginx setup script for Backspace.fm Topic Manager
# Configures nginx to serve the app on port 80 with SSL support

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
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
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root or with sudo"
        exit 1
    fi
}

# Install nginx
install_nginx() {
    print_status "Installing nginx..."
    apt update
    apt install -y nginx
    systemctl enable nginx
    print_success "Nginx installed successfully"
}

# Create nginx configuration
create_nginx_config() {
    local domain=${1:-localhost}
    
    print_status "Creating nginx configuration for domain: $domain"
    
    cat > /etc/nginx/sites-available/backspace-fm << EOF
server {
    listen 80;
    server_name $domain;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/css text/javascript text/xml text/plain text/x-component application/javascript application/json application/xml application/rss+xml application/atom+xml image/svg+xml;

    # Proxy to Node.js app
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffer_size 4k;
        proxy_buffers 4 32k;
        proxy_busy_buffers_size 64k;
    }



    # Static file caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:5000/api/version;
        proxy_set_header Host \$host;
        access_log off;
    }
}
EOF

    print_success "Nginx configuration created"
}

# Enable site
enable_site() {
    print_status "Enabling backspace-fm site..."
    
    # Remove default site if it exists
    if [ -L /etc/nginx/sites-enabled/default ]; then
        rm /etc/nginx/sites-enabled/default
        print_status "Removed default nginx site"
    fi
    
    # Enable our site
    ln -sf /etc/nginx/sites-available/backspace-fm /etc/nginx/sites-enabled/
    
    print_success "Site enabled"
}

# Test nginx configuration
test_nginx_config() {
    print_status "Testing nginx configuration..."
    if nginx -t; then
        print_success "Nginx configuration is valid"
        return 0
    else
        print_error "Nginx configuration test failed"
        return 1
    fi
}

# Setup SSL with certbot (optional)
setup_ssl() {
    local domain=$1
    local email=$2
    
    if [ -z "$domain" ] || [ "$domain" = "localhost" ]; then
        print_warning "Skipping SSL setup for localhost"
        return 0
    fi
    
    if [ -z "$email" ]; then
        print_warning "No email provided, skipping SSL setup"
        return 0
    fi
    
    print_status "Setting up SSL certificate for $domain..."
    
    # Install certbot
    apt install -y certbot python3-certbot-nginx
    
    # Get certificate
    certbot --nginx -d "$domain" --email "$email" --agree-tos --non-interactive
    
    if [ $? -eq 0 ]; then
        print_success "SSL certificate installed successfully"
        
        # Setup auto-renewal
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
        print_success "SSL auto-renewal configured"
    else
        print_warning "SSL certificate installation failed"
    fi
}

# Setup firewall
setup_firewall() {
    print_status "Configuring firewall..."
    
    # Allow SSH, HTTP, and HTTPS
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Enable firewall if not already enabled
    if ! ufw status | grep -q "Status: active"; then
        print_warning "Enabling UFW firewall..."
        echo "y" | ufw enable
    fi
    
    print_success "Firewall configured"
}

# Main installation function
main() {
    local domain=${1:-localhost}
    local email=$2
    
    echo "================================================"
    echo "  Backspace.fm - Nginx Setup"
    echo "================================================"
    echo ""
    
    check_root
    
    print_status "Setting up nginx for domain: $domain"
    if [ -n "$email" ]; then
        print_status "SSL will be configured with email: $email"
    fi
    
    # Install and configure nginx
    install_nginx
    create_nginx_config "$domain"
    enable_site
    
    # Test configuration
    if ! test_nginx_config; then
        print_error "Configuration test failed. Aborting."
        exit 1
    fi
    
    # Restart nginx
    print_status "Restarting nginx..."
    systemctl restart nginx
    
    if systemctl is-active --quiet nginx; then
        print_success "Nginx started successfully"
    else
        print_error "Failed to start nginx"
        exit 1
    fi
    
    # Setup SSL if domain and email provided
    if [ "$domain" != "localhost" ] && [ -n "$email" ]; then
        setup_ssl "$domain" "$email"
    fi
    
    # Setup firewall
    setup_firewall
    
    echo ""
    print_success "Nginx setup completed!"
    print_status "Your app should now be accessible at:"
    if [ "$domain" != "localhost" ]; then
        echo "  http://$domain"
        if [ -n "$email" ]; then
            echo "  https://$domain (if SSL was successful)"
        fi
    else
        echo "  http://localhost"
        echo "  http://$(hostname -I | awk '{print $1}')"
    fi
    
    echo ""
    print_status "Useful commands:"
    echo "  nginx -t              # Test configuration"
    echo "  systemctl reload nginx # Reload configuration"
    echo "  systemctl status nginx # Check nginx status"
    echo "  tail -f /var/log/nginx/error.log # View error logs"
}

# Show help
show_help() {
    echo "Usage: $0 [domain] [email]"
    echo ""
    echo "Arguments:"
    echo "  domain    Domain name (default: localhost)"
    echo "  email     Email for SSL certificate (optional)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Setup for localhost"
    echo "  $0 example.com                        # Setup for domain without SSL"
    echo "  $0 example.com admin@example.com      # Setup for domain with SSL"
    echo ""
    echo "Note: This script must be run as root or with sudo"
}

# Check arguments
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# Run main function
main "$1" "$2"