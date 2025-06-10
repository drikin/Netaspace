#!/bin/bash

# Database connection check for PostgreSQL deployment
set -e

echo "Checking PostgreSQL database connection..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "DATABASE_URL environment variable is not set"
    exit 1
fi

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 1
done

echo "PostgreSQL is ready and accessible"
echo "Database connection check completed successfully"