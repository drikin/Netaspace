#!/bin/bash

# Fix Docker container permissions for PostgreSQL deployment

echo "Fixing Docker container permissions..."

# Stop containers
docker-compose down

# Clean up old SQLite directories if they exist
if [ -d "database" ]; then
    echo "Removing old SQLite database directory..."
    rm -rf database/
fi

# Create data directory for PostgreSQL persistence
mkdir -p data/backups
chmod -R 755 data/

# Fix host directory permissions  
sudo chown -R 1001:1001 data/ 2>/dev/null || chown -R 1001:1001 data/ 2>/dev/null || echo "Note: Could not change ownership"

# Restart containers with PostgreSQL
docker-compose up -d

echo "Container permissions fixed and PostgreSQL deployment restarted"