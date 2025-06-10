#!/bin/bash

# Fix database permissions for Docker deployment

echo "Fixing database permissions..."

# Stop containers
docker-compose down

# Fix host directory permissions
sudo chown -R 1001:1001 database/ 2>/dev/null || chown -R 1001:1001 database/ 2>/dev/null || echo "Note: Could not change ownership, trying chmod..."
chmod -R 755 database/

# If database exists, make it writable
if [ -f "database/neta.sqlite" ]; then
    chmod 664 database/neta.sqlite
    echo "Database file permissions updated"
fi

# Restart containers
docker-compose up -d

echo "Permissions fixed and containers restarted"