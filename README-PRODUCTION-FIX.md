# Production SQLite Permission Fix

## Problem
In production Docker containers, the SQLite database becomes read-only, causing 500 errors when trying to update data (like setting active weeks).

**Error:** `SqliteError: attempt to write a readonly database`

## Root Cause
Docker containers create the database file with incorrect permissions for the nodejs user (1001:1001).

## Solution Applied

### 1. Updated Dockerfile
- Enhanced permission handling for database directory and files
- Added startup scripts for runtime permission fixes
- Improved user ownership management

### 2. Database Initialization Improvements
- Added automatic file permission setting in `server/storage.ts`
- Enhanced error logging for debugging permission issues
- Proper directory creation with correct permissions

### 3. Startup Scripts
- `scripts/start-app.sh`: Ensures database permissions on container startup
- `scripts/fix-db-permissions.sh`: Standalone script for permission fixes

### 4. Enhanced Error Logging
- Detailed SQLite error reporting in production
- Console logging for permission operations
- Better debugging information for database operations

## Deployment Instructions

### For Fresh Deployment
1. Rebuild Docker image: `docker-compose build`
2. Start containers: `docker-compose up -d`
3. Database will be created with proper permissions automatically

### For Existing Deployment
1. Stop containers: `docker-compose down`
2. Fix existing database permissions: `sudo chown 1001:1001 database/neta.sqlite && sudo chmod 664 database/neta.sqlite`
3. Rebuild and restart: `docker-compose build && docker-compose up -d`

### Manual Permission Fix (if needed)
```bash
# On the host system
sudo docker exec -it backspace-fm-1 /bin/sh
# Inside container
ls -la /app/database/
chmod 664 /app/database/neta.sqlite
# Exit container
exit
```

## Verification
- Check container logs for "Database file permissions set successfully"
- Test setActive week functionality through admin interface
- Monitor for SQLite READONLY errors in logs

## Files Modified
- `Dockerfile`: Enhanced permission handling
- `server/storage.ts`: Added permission setting and error logging
- `server/routes.ts`: Enhanced error reporting
- `scripts/start-app.sh`: New startup script
- `scripts/fix-db-permissions.sh`: Permission fix utility