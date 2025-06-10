#!/bin/bash

# Backspace.fm Topic Manager - Docker Backup Script
# Creates backup of database and application data

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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
create_backup_dir() {
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    echo "$backup_dir"
}

# Backup PostgreSQL database
backup_database() {
    local backup_dir="$1"
    
    print_status "Backing up PostgreSQL database..."
    
    # Check if PostgreSQL container is running
    if docker-compose ps postgres | grep -q "Up"; then
        if docker-compose exec -T postgres pg_dump -U backspace_user backspace_fm > "$backup_dir/backspace_fm.sql"; then
            print_success "PostgreSQL database backed up to $backup_dir/backspace_fm.sql"
        else
            print_error "Failed to backup PostgreSQL database"
            return 1
        fi
    else
        print_error "PostgreSQL container is not running"
        return 1
    fi
}

# Backup configuration
backup_config() {
    local backup_dir="$1"
    
    print_status "Backing up configuration..."
    
    # Copy Docker configuration
    cp docker-compose.yml "$backup_dir/"
    cp Dockerfile "$backup_dir/"
    
    # Copy environment files if they exist
    if [ -f ".env" ]; then
        cp .env "$backup_dir/"
    fi
    
    print_success "Configuration backed up"
}

# Create backup archive
create_archive() {
    local backup_dir="$1"
    local archive_name="backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    print_status "Creating backup archive..."
    
    tar -czf "$archive_name" -C "$(dirname "$backup_dir")" "$(basename "$backup_dir")"
    
    # Remove temporary backup directory
    rm -rf "$backup_dir"
    
    print_success "Backup archive created: $archive_name"
    echo "Archive size: $(du -h "$archive_name" | cut -f1)"
}

# Main execution
main() {
    echo "================================================"
    echo "  Backspace.fm Topic Manager - Docker Backup"
    echo "================================================"
    echo ""
    
    local backup_dir
    backup_dir=$(create_backup_dir)
    
    backup_database "$backup_dir"
    backup_config "$backup_dir"
    create_archive "$backup_dir"
    
    print_success "Backup completed successfully!"
    echo ""
    echo "To restore from backup:"
    echo "  1. Extract: tar -xzf backup_YYYYMMDD_HHMMSS.tar.gz"
    echo "  2. Restore database: cat backup_*/backspace_fm.sql | docker-compose exec -T postgres psql -U backspace_user backspace_fm"
    echo "  3. Restart: docker-compose restart"
}

# Run main function
main "$@"