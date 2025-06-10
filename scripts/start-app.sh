#!/bin/bash

# Application startup script for PostgreSQL
set -e

echo "Starting application with PostgreSQL..."

# Wait for PostgreSQL to be ready if DATABASE_URL is provided
if [ ! -z "$DATABASE_URL" ]; then
    echo "Waiting for PostgreSQL to be ready..."
    until pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; do
        echo "PostgreSQL is unavailable - sleeping"
        sleep 1
    done
    echo "PostgreSQL is ready!"
    
    # Run database migrations
    echo "Running database migrations..."
    npm run db:push
fi

# Start the Node.js application
echo "Starting Node.js server..."
exec npm run start