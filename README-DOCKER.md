# Docker Deployment Guide

Quick setup guide for running Backspace.fm Topic Manager with Docker.

## Prerequisites

- Docker and Docker Compose installed
- Git repository cloned

## Quick Start

```bash
# Make scripts executable (if needed)
chmod +x scripts/*.sh

# Setup and start the application
./scripts/docker-setup.sh
```

The application will be available at `http://localhost:5000`

## Manual Setup

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Available Scripts

### Setup Script
```bash
./scripts/docker-setup.sh
```
- Checks Docker installation
- Creates necessary directories
- Builds and starts the application
- Waits for application to be ready

### Update Script
```bash
./scripts/docker-update.sh
```
- Creates database backup
- Pulls latest changes from git
- Rebuilds and restarts the application

### Logs Script
```bash
./scripts/docker-logs.sh [OPTIONS]

Options:
  -f, --follow     Follow log output (real-time)
  -t, --tail N     Show last N lines (default: 100)
  -s, --status     Show container status
  -h, --help       Show help
```

## Data Persistence

- Database: `./database/neta.sqlite` (mounted as volume)
- Backups: Automatically created during updates

## Troubleshooting

### Database permission errors (SQLITE_READONLY)
```bash
# Fix permissions automatically
./scripts/fix-permissions.sh

# Or manually:
chmod -R 755 database/
chmod 664 database/neta.sqlite
docker-compose restart
```

### Application not starting
```bash
# Check container status
docker-compose ps

# View logs
./scripts/docker-logs.sh -f

# Restart
docker-compose restart
```

### Port already in use
```bash
# Stop any existing containers
docker-compose down

# Check what's using port 5000
lsof -i :5000

# Kill the process or change port in docker-compose.yml
```

### Database issues
```bash
# Check database file permissions
ls -la database/

# View application logs for database errors
./scripts/docker-logs.sh | grep -i database

# Rebuild with fresh database
docker-compose down
rm database/neta.sqlite
docker-compose up -d
```

## Admin Access

Default admin credentials:
- Username: `admin`
- Password: `fmbackspace55`

## Environment Variables

Set in `docker-compose.yml`:
- `NODE_ENV=production`
- `DATABASE_URL=./database/neta.sqlite`

## Production Deployment

For production deployment:

1. Change admin password after first login
2. Set up proper reverse proxy (nginx)
3. Enable HTTPS
4. Set up automated backups
5. Monitor logs and disk space