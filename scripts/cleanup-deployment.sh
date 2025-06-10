#!/bin/bash

# Deployment Cleanup Script for Disk Space Issues
# This script cleans up disk space and fixes PostgreSQL container issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check disk space
check_disk_space() {
    print_status "Checking disk space..."
    df -h /
    echo ""
}

# Clean up Git lock files
cleanup_git() {
    print_status "Cleaning up Git lock files..."
    
    if [ -f ".git/index.lock" ]; then
        rm -f .git/index.lock
        print_success "Removed Git index lock file"
    fi
    
    if [ -f ".git/refs/heads/main.lock" ]; then
        rm -f .git/refs/heads/main.lock
        print_success "Removed Git ref lock file"
    fi
    
    # Reset git status
    git reset --hard HEAD 2>/dev/null || true
    print_success "Git repository cleaned"
}

# Clean up Docker resources
cleanup_docker() {
    print_status "Cleaning up Docker resources..."
    
    # Stop all containers
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # Clean up unused Docker resources
    docker system prune -f --volumes 2>/dev/null || true
    docker image prune -f 2>/dev/null || true
    docker container prune -f 2>/dev/null || true
    docker volume prune -f 2>/dev/null || true
    
    print_success "Docker cleanup completed"
}

# Clean up old SQLite files and logs
cleanup_old_files() {
    print_status "Cleaning up old files..."
    
    # Remove old SQLite files if they exist
    find . -name "*.sqlite*" -type f -delete 2>/dev/null || true
    
    # Remove old log files
    find . -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
    
    # Remove old backup files
    find . -name "*backup*" -type f -mtime +7 -delete 2>/dev/null || true
    
    # Clean up node_modules cache
    if [ -d "node_modules" ]; then
        rm -rf node_modules/.cache 2>/dev/null || true
    fi
    
    print_success "Old files cleaned up"
}

# Clean up system files
cleanup_system() {
    print_status "Cleaning up system temporary files..."
    
    # Clean apt cache
    sudo apt-get clean 2>/dev/null || true
    
    # Clean tmp directories
    sudo rm -rf /tmp/* 2>/dev/null || true
    sudo rm -rf /var/tmp/* 2>/dev/null || true
    
    # Clean journal logs older than 3 days
    sudo journalctl --vacuum-time=3d 2>/dev/null || true
    
    print_success "System cleanup completed"
}

# Rebuild application with minimal resources
rebuild_application() {
    print_status "Rebuilding application with PostgreSQL..."
    
    # Pull latest changes
    git pull origin main 2>/dev/null || {
        print_warning "Git pull failed, continuing with local version"
    }
    
    # Build and start with PostgreSQL
    docker-compose up -d --build postgres
    
    print_status "Waiting for PostgreSQL to be ready..."
    sleep 15
    
    # Start the application
    docker-compose up -d backspace-fm
    
    print_status "Waiting for application to start..."
    sleep 10
    
    print_success "Application rebuilt successfully"
}

# Verify application health
verify_application() {
    print_status "Verifying application health..."
    
    local max_attempts=15
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:5000/api/version > /dev/null 2>&1; then
            print_success "Application is healthy and responding"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_warning "Application may still be starting. Check logs: docker-compose logs -f"
    return 1
}

# Main execution
main() {
    echo "================================================"
    echo "  Deployment Cleanup & Recovery Script"
    echo "================================================"
    echo ""
    
    check_disk_space
    cleanup_git
    cleanup_docker
    cleanup_old_files
    cleanup_system
    
    echo ""
    print_status "Disk space after cleanup:"
    df -h /
    echo ""
    
    rebuild_application
    verify_application
    
    print_success "Deployment cleanup and recovery complete!"
    echo ""
    echo "Application should be available at: http://localhost:5000"
    echo "Admin login: admin / fmbackspace55"
    echo ""
    echo "To monitor: docker-compose logs -f"
}

# Run main function
main "$@"