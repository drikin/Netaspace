# One-Click Deployment to neta.backspace.fm

Deploy the Backspace.fm Topic Manager to your Ubuntu server with HTTPS support.

## Quick Deployment

From Replit Shell, run:

```bash
./scripts/deploy-to-server.sh
```

This will:
- Connect to your Ubuntu server (153.125.147.133)
- Install Docker, nginx, and SSL certificates
- Deploy the application with PostgreSQL database
- Configure HTTPS with automatic SSL renewal
- Set up the admin user and initial data

## Pre-deployment Check

Test your connection first:

```bash
./scripts/test-deployment.sh
```

## After Deployment

- Application: https://neta.backspace.fm
- Admin Panel: https://neta.backspace.fm/admin
- Login: admin / fmbackspace55

## Server Management

Connect to server:
```bash
ssh 153.125.147.133 -l ubuntu -i ~/.ssh/id_ed25519
```

Monitor application:
```bash
cd /home/ubuntu/backspace-fm-app
docker compose -f docker-compose.prod.yml logs -f
```

Restart services:
```bash
docker compose -f docker-compose.prod.yml restart
```

## Features

- Automatic HTTPS with Let's Encrypt
- PostgreSQL database with persistent storage
- Nginx reverse proxy with rate limiting
- Docker containerization
- Health checks and monitoring
- Automatic SSL certificate renewal

The deployment script handles everything automatically including domain configuration, SSL setup, and application initialization.