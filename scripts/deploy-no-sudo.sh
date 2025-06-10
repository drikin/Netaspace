#!/bin/bash

# No-sudo deployment script for neta.backspace.fm
# This version works without sudo privileges

set -e

# Configuration
SERVER_IP="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"
DOMAIN="neta.backspace.fm"
APP_DIR="/home/ubuntu/backspace-fm-app"

# Colors
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

# Deploy without sudo
deploy_application() {
    print_status "Deploying application without sudo privileges..."
    
    # Create server deployment script that doesn't require sudo
    cat > /tmp/server_deploy_no_sudo.sh << 'EOF'
#!/bin/bash
set -e

APP_DIR="/home/ubuntu/backspace-fm-app"
DOMAIN="neta.backspace.fm"

# Create application directory
mkdir -p $APP_DIR
cd $APP_DIR

# Clone or update repository
if [ ! -d ".git" ]; then
    git clone https://github.com/drikin/Netaspace.git .
else
    git fetch origin
    git reset --hard origin/main
fi

# Create production Docker Compose configuration
cat > docker-compose.prod.yml << 'DOCKER_EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: backspace-postgres
    environment:
      POSTGRES_DB: backspace_fm
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-secure_postgres_password_2024}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "127.0.0.1:5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d backspace_fm"]
      interval: 30s
      timeout: 10s
      retries: 3

  backspace-fm:
    build: .
    container_name: backspace-app
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD:-secure_postgres_password_2024}@postgres:5432/backspace_fm
      SESSION_SECRET: ${SESSION_SECRET:-secure_session_secret_2024_backspace_fm}
      PORT: 5000
    ports:
      - "0.0.0.0:5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    volumes:
      - ./data:/app/data

volumes:
  postgres_data:
DOCKER_EOF

# Create environment file
cat > .env.production << 'ENV_EOF'
NODE_ENV=production
DATABASE_URL=postgresql://postgres:secure_postgres_password_2024@postgres:5432/backspace_fm
POSTGRES_PASSWORD=secure_postgres_password_2024
SESSION_SECRET=secure_session_secret_2024_backspace_fm
DOMAIN=neta.backspace.fm
ENV_EOF

# Stop any existing containers
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# Build and start services
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Initialize database
docker compose -f docker-compose.prod.yml exec -T backspace-fm npm run db:push 2>/dev/null || true

# Create admin user
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d backspace_fm << 'SQL_EOF'
INSERT INTO users (username, password, is_admin, email) 
VALUES ('admin', 'fmbackspace55', true, 'admin@backspace.fm')
ON CONFLICT (username) DO UPDATE SET 
  password = EXCLUDED.password,
  is_admin = EXCLUDED.is_admin,
  email = EXCLUDED.email;

INSERT INTO weeks (title, start_date, end_date, is_active)
VALUES ('Week 1', '2025-01-06', '2025-01-12', true)
ON CONFLICT DO NOTHING;
SQL_EOF

# Verify deployment
echo "Verifying deployment..."
sleep 10

if curl -f http://localhost:5000/api/version > /dev/null 2>&1; then
    echo "✅ Deployment successful! Application is running at:"
    echo "   http://neta.backspace.fm:5000"
    echo "   http://153.125.147.133:5000"
    echo "🔐 Admin login: admin / fmbackspace55"
    echo ""
    echo "⚠️  Note: This deployment runs on port 5000 without SSL."
    echo "   For HTTPS setup, please configure nginx and SSL certificates manually."
else
    echo "⚠️  Deployment completed but verification failed. Check logs:"
    echo "   docker compose -f docker-compose.prod.yml logs"
fi

# Show running containers
echo ""
echo "Running services:"
docker compose -f docker-compose.prod.yml ps

EOF

    # Copy and execute deployment script on server
    print_status "Copying deployment script to server..."
    scp -i $SSH_KEY /tmp/server_deploy_no_sudo.sh $SERVER_USER@$SERVER_IP:/tmp/

    print_status "Executing deployment on server..."
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "chmod +x /tmp/server_deploy_no_sudo.sh && /tmp/server_deploy_no_sudo.sh"
}

# Monitor deployment
monitor_deployment() {
    print_status "Monitoring deployment status..."
    
    # Wait for services to be ready
    sleep 30
    
    print_status "Testing application endpoint..."
    if ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "curl -f http://localhost:5000/api/version" > /dev/null 2>&1; then
        print_success "Application is responding at http://$DOMAIN:5000"
    else
        print_warning "Application may still be starting up"
    fi
    
    # Show application status
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "cd $APP_DIR && docker compose -f docker-compose.prod.yml ps"
}

# Main deployment process
main() {
    echo "================================================"
    echo "  Backspace.fm - No-Sudo Deployment"
    echo "================================================"
    echo ""
    echo "Target: http://$DOMAIN:5000"
    echo "Server: $SERVER_IP"
    echo ""
    
    deploy_application
    monitor_deployment
    
    print_success "Deployment completed!"
    echo ""
    echo "🌐 Application URL: http://$DOMAIN:5000"
    echo "🌐 Direct IP: http://$SERVER_IP:5000"
    echo "🔐 Admin Panel: http://$DOMAIN:5000/admin"
    echo "👤 Admin Login: admin / fmbackspace55"
    echo ""
    echo "📊 Monitor logs:"
    echo "  ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose -f docker-compose.prod.yml logs -f'"
    echo ""
    echo "⚠️  Note: This deployment runs without SSL."
    echo "   For HTTPS setup, server administrator needs to configure nginx and SSL certificates."
}

# Run deployment
main "$@"