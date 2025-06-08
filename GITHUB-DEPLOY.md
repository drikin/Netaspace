# GitHub-based Deployment Guide for Sakura Cloud

This guide enables direct deployment from GitHub repository to Sakura Cloud using Docker.

## Prerequisites

1. **Sakura Cloud Ubuntu Server** with Docker installed
2. **GitHub Repository** with the application code
3. **SSH Access** to the Sakura Cloud server

## Quick Deployment

### Option 1: Direct Docker Commands

```bash
# Clone repository
git clone https://github.com/yourusername/backspace-fm.git
cd backspace-fm

# Build and run
docker build -t backspace-fm .
docker run -d \
  --name backspace-fm \
  --restart unless-stopped \
  -p 5000:5000 \
  -v /opt/backspace-fm-data:/app/data \
  backspace-fm
```

### Option 2: Using Deployment Script

```bash
# Download and run deployment script
wget https://raw.githubusercontent.com/yourusername/backspace-fm/main/deploy-github.sh
chmod +x deploy-github.sh
./deploy-github.sh https://github.com/yourusername/backspace-fm.git
```

## Manual Deployment Steps

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker (if not already installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Create data directory
sudo mkdir -p /opt/backspace-fm-data/{persistent,backups}
sudo chown -R ubuntu:ubuntu /opt/backspace-fm-data
```

### 2. Repository Clone

```bash
# Clone repository
git clone https://github.com/yourusername/backspace-fm.git
cd backspace-fm
```

### 3. Build Application

```bash
# Build Docker image
docker build -t backspace-fm:latest .
```

### 4. Run Application

```bash
# Stop existing container (if any)
docker stop backspace-fm 2>/dev/null || true
docker rm backspace-fm 2>/dev/null || true

# Run new container
docker run -d \
  --name backspace-fm \
  --restart unless-stopped \
  -p 5000:5000 \
  -v /opt/backspace-fm-data:/app/data \
  -e NODE_ENV=production \
  -e PERSISTENT_DB_PATH=/app/data/persistent/production.sqlite \
  -e BACKUP_DIR=/app/data/backups \
  backspace-fm:latest
```

### 5. Verify Deployment

```bash
# Check container status
docker ps | grep backspace-fm

# Check logs
docker logs backspace-fm

# Test application
curl http://localhost:5000/api/version
```

## Updates and Redeployment

### Update from GitHub

```bash
cd backspace-fm
git pull origin main
docker build -t backspace-fm:latest .
docker stop backspace-fm
docker rm backspace-fm
docker run -d \
  --name backspace-fm \
  --restart unless-stopped \
  -p 5000:5000 \
  -v /opt/backspace-fm-data:/app/data \
  -e NODE_ENV=production \
  backspace-fm:latest
```

### Using Docker Compose (Alternative)

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: backspace-fm
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - /opt/backspace-fm-data:/app/data
    environment:
      - NODE_ENV=production
      - PERSISTENT_DB_PATH=/app/data/persistent/production.sqlite
      - BACKUP_DIR=/app/data/backups
```

Deploy with:
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

## Data Persistence

- **Database**: `/opt/backspace-fm-data/persistent/production.sqlite`
- **Backups**: `/opt/backspace-fm-data/backups/`
- **Data survives**: Container restarts, updates, and redeployments

## Monitoring

```bash
# View logs
docker logs -f backspace-fm

# Check resource usage
docker stats backspace-fm

# Health check
curl http://localhost:5000/api/version
```

## Troubleshooting

### Container won't start
```bash
docker logs backspace-fm
```

### Port already in use
```bash
sudo lsof -i :5000
docker stop $(docker ps -q --filter "publish=5000")
```

### Data not persisting
```bash
ls -la /opt/backspace-fm-data/
docker exec backspace-fm ls -la /app/data/
```

## Security Notes

- Application runs on port 5000
- Data directory has restricted permissions
- Container runs with limited privileges
- Health checks monitor application status

## Access

After successful deployment, access the application at:
- **URL**: `http://YOUR_SAKURA_SERVER_IP:5000`
- **Health Check**: `http://YOUR_SAKURA_SERVER_IP:5000/api/version`