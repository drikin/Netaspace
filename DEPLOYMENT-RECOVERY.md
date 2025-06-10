# Deployment Recovery Guide

This guide provides step-by-step instructions to recover from disk space issues and PostgreSQL connection problems in the deployment environment.

## Immediate Recovery Steps

### 1. Clean Up Disk Space

```bash
# Run the cleanup script
chmod +x scripts/cleanup-deployment.sh
./scripts/cleanup-deployment.sh
```

### 2. Manual Cleanup (if script fails)

```bash
# Fix Git lock files
rm -f .git/index.lock
rm -f .git/refs/heads/*.lock
git reset --hard HEAD

# Clean Docker resources
docker-compose down --remove-orphans
docker system prune -f --volumes
docker image prune -f
docker container prune -f
docker volume prune -f

# Clean system files
sudo apt-get clean
sudo rm -rf /tmp/*
sudo journalctl --vacuum-time=3d

# Check available space
df -h /
```

### 3. Rebuild PostgreSQL Environment

```bash
# Stop all containers
docker-compose down

# Remove old volumes (CAUTION: This will delete data)
docker volume rm $(docker volume ls -q) 2>/dev/null || true

# Start PostgreSQL first
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
sleep 15

# Create database and tables
docker-compose exec postgres createdb -U postgres backspace_fm 2>/dev/null || true

# Start application
docker-compose up -d backspace-fm

# Run database migrations
sleep 10
docker-compose exec backspace-fm npm run db:push
```

### 4. Initialize Admin User

```bash
# Connect to PostgreSQL and create admin user
docker-compose exec postgres psql -U postgres -d backspace_fm -c "
INSERT INTO users (username, password, is_admin, email) 
VALUES ('admin', 'fmbackspace55', true, 'admin@backspace.fm')
ON CONFLICT (username) DO UPDATE SET 
  password = EXCLUDED.password,
  is_admin = EXCLUDED.is_admin,
  email = EXCLUDED.email;
"

# Create initial week
docker-compose exec postgres psql -U postgres -d backspace_fm -c "
INSERT INTO weeks (title, start_date, end_date, is_active)
VALUES ('Week 1', '2025-01-06', '2025-01-12', true)
ON CONFLICT DO NOTHING;
"
```

## Troubleshooting Common Issues

### PostgreSQL Connection Timeouts

If you see connection timeout errors:

1. Check PostgreSQL container status:
```bash
docker-compose ps postgres
docker-compose logs postgres
```

2. Restart PostgreSQL with increased resources:
```bash
docker-compose down
docker-compose up -d postgres
sleep 20
docker-compose up -d backspace-fm
```

3. Verify database connection:
```bash
docker-compose exec postgres psql -U postgres -d backspace_fm -c "SELECT version();"
```

### Application Not Responding

1. Check application logs:
```bash
docker-compose logs -f backspace-fm
```

2. Verify all services are running:
```bash
docker-compose ps
```

3. Test application endpoint:
```bash
curl http://localhost:5000/api/version
```

### Admin Login Issues

1. Verify admin user exists:
```bash
docker-compose exec postgres psql -U postgres -d backspace_fm -c "SELECT * FROM users WHERE username='admin';"
```

2. Reset admin password:
```bash
docker-compose exec postgres psql -U postgres -d backspace_fm -c "UPDATE users SET password='fmbackspace55' WHERE username='admin';"
```

3. Check session table:
```bash
docker-compose exec postgres psql -U postgres -d backspace_fm -c "SELECT COUNT(*) FROM sessions;"
```

## Database Environment Variables

Ensure these environment variables are set in your deployment:

```bash
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/backspace_fm
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=backspace_fm
PGHOST=postgres
PGPORT=5432
```

## Monitoring Commands

```bash
# Monitor application
docker-compose logs -f

# Check disk usage
df -h /

# Monitor Docker resources
docker stats

# Check PostgreSQL connections
docker-compose exec postgres psql -U postgres -d backspace_fm -c "SELECT count(*) FROM pg_stat_activity;"
```

## Performance Optimization

The application now includes:
- Optimized PostgreSQL connection pool (max 5 connections)
- Extended connection timeouts for deployment environment
- PostgreSQL-based session storage for persistence
- Comprehensive error handling and logging

## Emergency Contacts

If issues persist, check:
1. Server disk space: `df -h /`
2. Memory usage: `free -h`
3. Docker resources: `docker system df`
4. Application logs: `docker-compose logs`

## Backup and Recovery

Regular backups are created in the `./backups/` directory. To restore:

```bash
# List available backups
ls -la backups/

# Restore from backup (replace BACKUP_FILE with actual filename)
docker-compose exec postgres psql -U postgres -d backspace_fm < backups/BACKUP_FILE.sql
```