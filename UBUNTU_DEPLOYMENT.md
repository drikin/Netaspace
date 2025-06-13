# Ubuntu Server Deployment Guide - neta.backspace.fm

## Complete Deployment Solution

**Server**: 153.125.147.133  
**Domain**: https://neta.backspace.fm  
**Project Path**: ~/Netaspace  
**Database**: Existing Neon PostgreSQL (no migration needed)

## 1. Initial Server Setup (Run Once)

SSH to your server and execute:

```bash
# Download and run initial setup
wget https://raw.githubusercontent.com/drikin/netaspace/main/initial-setup.sh
chmod +x initial-setup.sh
./initial-setup.sh
```

This installs Node.js, PM2, Nginx, and clones the repository.

## 2. Environment Configuration

```bash
cd ~/Netaspace
chmod +x production-env-template.sh
./production-env-template.sh
```

This creates the .env file with your existing database connection.

## 3. Initial Deployment

```bash
chmod +x deploy.sh
./deploy.sh --initial
```

This performs:
- Full system setup
- Database schema deployment
- Application build and start
- Nginx configuration with SSL
- Service registration

## 4. DNS Configuration

Add this A record to backspace.fm:
```
Type: A
Name: neta
Value: 153.125.147.133
```

## 5. Regular Updates (One Command)

For all future deployments:

```bash
cd ~/Netaspace
./update.sh
```

This automatically:
- Pulls latest code from GitHub
- Rebuilds the application
- Restarts services
- Verifies deployment

## Management Commands

```bash
# View application logs
pm2 logs neta-app

# Restart application
pm2 restart neta-app

# Check status
pm2 status

# View Nginx logs
sudo tail -f /var/log/nginx/neta.backspace.fm.error.log

# Manual SSL renewal
sudo certbot renew
```

## Monitoring

The deployment includes:
- PM2 process management with auto-restart
- Nginx reverse proxy with SSL
- Automatic health checks
- Log rotation
- Firewall configuration

## Backup Systemd Service

A systemd service is also created as backup:

```bash
# Create service (run once)
chmod +x systemd-service.sh
./systemd-service.sh

# Manual service control
sudo systemctl status neta-app
sudo systemctl start neta-app
sudo systemctl stop neta-app
```

## Automated Features

- **Zero-downtime deployments**: PM2 handles graceful restarts
- **SSL auto-renewal**: Certbot automatically renews certificates
- **Process monitoring**: PM2 restarts the app if it crashes
- **Log management**: Automatic log rotation and archival
- **Security**: Firewall rules and security headers configured

Your existing database and all current data will be preserved throughout all deployments.