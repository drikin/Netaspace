# Deployment Instructions for Server Administrator

## Quick Fix for Current Issues

Run these commands on the deployment server (`ubuntu@neta`):

```bash
# 1. Fix Git lock file issue
cd ~/Netaspace
rm -f .git/index.lock
rm -f .git/refs/heads/*.lock
git reset --hard HEAD

# 2. Clean up disk space
sudo apt-get clean
sudo rm -rf /tmp/*
sudo journalctl --vacuum-time=3d
docker system prune -f --volumes

# 3. Run the automated cleanup script
chmod +x scripts/cleanup-deployment.sh
./scripts/cleanup-deployment.sh
```

## If the automated script doesn't work, follow these manual steps:

```bash
# Stop all containers
docker-compose down --remove-orphans

# Clean Docker resources thoroughly
docker system prune -f --volumes
docker image prune -a -f
docker container prune -f

# Pull latest changes
git pull origin main

# Start PostgreSQL first
docker-compose up -d postgres
sleep 15

# Start the application
docker-compose up -d backspace-fm
sleep 10

# Verify everything is running
docker-compose ps
curl http://localhost:5000/api/version
```

## Admin Login Credentials

- Username: `admin`
- Password: `fmbackspace55`
- Access URL: `http://localhost:5000/admin`

## Database Status

The application now uses PostgreSQL instead of SQLite:
- Database: `backspace_fm`
- User: `postgres`
- Sessions are stored in PostgreSQL for persistence
- Optimized connection pooling for deployment environment

## Monitoring Commands

```bash
# Check application status
docker-compose logs -f

# Check disk space
df -h /

# Check database connection
docker-compose exec postgres psql -U postgres -d backspace_fm -c "SELECT version();"

# Verify admin user
docker-compose exec postgres psql -U postgres -d backspace_fm -c "SELECT username, is_admin FROM users WHERE username='admin';"
```

## Troubleshooting

If admin login still fails:
1. Check application logs: `docker-compose logs backspace-fm`
2. Verify database connection: `docker-compose logs postgres`
3. Reset admin user: `docker-compose exec postgres psql -U postgres -d backspace_fm -c "UPDATE users SET password='fmbackspace55' WHERE username='admin';"`

The PostgreSQL migration is complete and should resolve the deployment authentication issues.