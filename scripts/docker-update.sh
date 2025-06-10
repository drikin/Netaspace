#!/bin/bash

# Backspace.fm Topic Manager - Docker Update Script
# This script updates the application to the latest version

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Backup PostgreSQL database
backup_database() {
    print_status "Creating PostgreSQL database backup..."
    
    # Check if PostgreSQL container is running for backup
    if docker-compose ps postgres | grep -q "Up"; then
        BACKUP_NAME="backspace_fm_backup_$(date +%Y%m%d_%H%M%S).sql"
        
        if docker-compose exec -T postgres pg_dump -U backspace_user backspace_fm > "$BACKUP_NAME" 2>/dev/null; then
            print_success "PostgreSQL database backed up to $BACKUP_NAME"
        else
            print_warning "Could not create PostgreSQL backup, continuing without backup..."
        fi
    else
        print_warning "PostgreSQL container not running, skipping backup"
    fi
}

# Update application
update_application() {
    print_status "Pulling latest changes from git..."
    git pull origin main
    
    print_status "Stopping current application..."
    docker-compose down
    
    print_status "Rebuilding Docker images..."
    docker-compose build --no-cache
    
    print_status "Starting updated application with PostgreSQL..."
    docker-compose up -d
    
    print_status "Waiting for PostgreSQL to be ready..."
    sleep 10
    
    print_status "Running database migrations..."
    docker-compose exec backspace-fm npm run db:push
    
    print_success "Application updated successfully with PostgreSQL!"
}

# Wait for application to be ready
wait_for_app() {
    print_status "Waiting for application to be ready..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:5000/api/version > /dev/null 2>&1; then
            print_success "Application is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_warning "Application may still be starting up. Check logs with: docker-compose logs -f"
    return 1
}

# Main execution
main() {
    echo "================================================"
    echo "  Backspace.fm Topic Manager - Docker Update"
    echo "================================================"
    echo ""
    
    backup_database
    update_application
    wait_for_app
    
    print_success "Update complete! The application is accessible at http://localhost:5000"
    echo ""
    echo "Check application version:"
    echo "  curl http://localhost:5000/api/version"
}

# Run main function
main "$@"