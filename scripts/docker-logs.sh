#!/bin/bash

# Backspace.fm Topic Manager - Docker Logs Script
# This script helps you view and manage application logs

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

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -f, --follow     Follow log output (real-time)"
    echo "  -t, --tail N     Show last N lines (default: 100)"
    echo "  -s, --status     Show container status"
    echo "  -h, --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Show last 100 lines"
    echo "  $0 -f                 # Follow logs in real-time"
    echo "  $0 -t 50              # Show last 50 lines"
    echo "  $0 -s                 # Show container status"
}

show_container_status() {
    print_status "Container status:"
    docker-compose ps
    echo ""
    
    if docker-compose ps | grep -q "Up"; then
        print_success "Application is running"
        echo "Access at: http://localhost:5000"
    else
        print_error "Application is not running"
        echo "Start with: docker-compose up -d"
    fi
}

show_logs() {
    local follow=false
    local tail_lines=100
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--follow)
                follow=true
                shift
                ;;
            -t|--tail)
                tail_lines="$2"
                shift 2
                ;;
            -s|--status)
                show_container_status
                exit 0
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Check if containers are running
    if ! docker-compose ps | grep -q "backspace-fm"; then
        print_error "Application containers are not running"
        echo "Start with: docker-compose up -d"
        exit 1
    fi
    
    # Show logs
    if [ "$follow" = true ]; then
        print_status "Following logs (Ctrl+C to stop)..."
        docker-compose logs -f --tail="$tail_lines"
    else
        print_status "Showing last $tail_lines lines of logs..."
        docker-compose logs --tail="$tail_lines"
    fi
}

# Main execution
show_logs "$@"