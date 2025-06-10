#!/bin/bash

# Backspace.fm Topic Manager - Docker Setup Script
# This script helps you quickly set up and run the application using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first:"
        echo "  Ubuntu/Debian: sudo apt-get install docker.io"
        echo "  CentOS/RHEL: sudo yum install docker"
        echo "  macOS: Install Docker Desktop"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first:"
        echo "  https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    print_success "Docker and Docker Compose are available"
}

# Check if Docker daemon is running
check_docker_daemon() {
    print_status "Checking Docker daemon..."
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker service:"
        echo "  Linux: sudo systemctl start docker"
        echo "  macOS: Start Docker Desktop"
        exit 1
    fi
    print_success "Docker daemon is running"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    mkdir -p database
    mkdir -p data
    print_success "Directories created"
}

# Build and start the application
start_application() {
    print_status "Building Docker image..."
    docker-compose build
    
    print_status "Starting application..."
    docker-compose up -d
    
    print_success "Application started successfully!"
    echo ""
    echo "Backspace.fm Topic Manager is now running!"
    echo ""
    echo "Access the application:"
    echo "   Web Interface: http://localhost:5000"
    echo "   API Health:    http://localhost:5000/api/version"
    echo ""
    echo "Useful commands:"
    echo "   View logs:     docker-compose logs -f"
    echo "   Stop app:      docker-compose down"
    echo "   Restart:       docker-compose restart"
    echo "   Update:        ./scripts/docker-update.sh"
    echo ""
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
    echo "  Backspace.fm Topic Manager - Docker Setup"
    echo "================================================"
    echo ""
    
    check_docker
    check_docker_daemon
    create_directories
    start_application
    wait_for_app
    
    print_success "Setup complete! The application should be accessible at http://localhost:5000"
}

# Run main function
main "$@"