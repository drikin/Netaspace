#!/bin/bash

# Fix database permissions for Docker deployment
set -e

DB_DIR="/app/database"
DB_FILE="/app/database/neta.sqlite"

echo "Fixing database permissions..."

# Ensure database directory exists with proper permissions
mkdir -p "$DB_DIR"
chmod 775 "$DB_DIR"

# If database file exists, fix its permissions
if [ -f "$DB_FILE" ]; then
    echo "Database file exists, fixing permissions..."
    chmod 664 "$DB_FILE"
    echo "Database file permissions updated"
else
    echo "Database file does not exist yet, will be created with proper permissions"
fi

# Ensure ownership is correct
chown -R nodejs:nodejs "$DB_DIR" 2>/dev/null || echo "Note: Could not change ownership (running as non-root)"

echo "Database permissions fixed successfully"