#!/bin/bash

# Initial server setup for neta.backspace.fm on Ubuntu
# Run this once on a fresh Ubuntu server

set -e

DOMAIN="neta.backspace.fm"
SERVER_IP="153.125.147.133"
PROJECT_DIR="$HOME/Netaspace"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting initial setup for neta.backspace.fm"

# Check if running as ubuntu user
if [[ "$USER" != "ubuntu" ]]; then
    echo "Please run as ubuntu user"
    exit 1
fi

# Update system
log "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
log "Installing system dependencies..."
sudo apt install -y nginx curl git ufw fail2ban jq certbot python3-certbot-nginx

# Install Node.js 20.x
log "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
log "Installing PM2..."
sudo npm install -g pm2

# Configure firewall
log "Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Clone repository if not exists
if [[ ! -d "$PROJECT_DIR" ]]; then
    log "Cloning repository..."
    # Replace with your actual repository URL
    git clone https://github.com/drikin/netaspace.git "$PROJECT_DIR"
else
    log "Repository already exists at $PROJECT_DIR"
fi

cd "$PROJECT_DIR"

# Make deploy script executable
chmod +x deploy.sh

log "Initial setup completed!"
log "Next steps:"
log "1. Configure environment variables: cp .env.production .env && nano .env"
log "2. Run initial deployment: ./deploy.sh --initial"
log "3. Configure DNS to point $DOMAIN to $SERVER_IP"