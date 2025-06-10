#!/bin/bash

# One-click deployment script for neta.backspace.fm
# Run from Replit Shell: ./scripts/deploy-to-server.sh

set -e

# Configuration
SERVER_IP="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"
DOMAIN="neta.backspace.fm"
APP_DIR="/home/ubuntu/backspace-fm-app"
REPO_URL="https://github.com/drikin/Netaspace.git"

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

# Test SSH connection
test_ssh_connection() {
    print_status "Testing SSH connection to $SERVER_IP..."
    if ssh -o ConnectTimeout=10 -i $SSH_KEY $SERVER_USER@$SERVER_IP "echo 'SSH connection successful'" > /dev/null 2>&1; then
        print_success "SSH connection established"
    else
        print_error "Failed to connect to server. Please check SSH key and server status."
        exit 1
    fi
}

# Deploy application to server
deploy_application() {
    print_status "Deploying application to $DOMAIN..."
    
    # Create deployment script for server
    cat > /tmp/server_deploy.sh << 'EOF'
#!/bin/bash
set -e

APP_DIR="/home/ubuntu/backspace-fm-app"
DOMAIN="neta.backspace.fm"

# Update system packages
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx git curl

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

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
      - "127.0.0.1:5000:5000"
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

# Create nginx configuration
sudo tee /etc/nginx/sites-available/backspace-fm << 'NGINX_EOF'
server {
    listen 80;
    server_name neta.backspace.fm;
    
    # Redirect HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name neta.backspace.fm;
    
    # SSL configuration will be added by certbot
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;
    
    # Main application
    location / {
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # API rate limiting
    location /api/ {
        limit_req zone=api burst=5 nodelay;
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://127.0.0.1:5000;
    }
}
NGINX_EOF

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/backspace-fm /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

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

# Restart nginx
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d neta.backspace.fm --non-interactive --agree-tos --email admin@backspace.fm --redirect

# Reload nginx with SSL
sudo systemctl reload nginx

# Verify deployment
echo "Verifying deployment..."
sleep 10

if curl -f https://neta.backspace.fm/api/version > /dev/null 2>&1; then
    echo "✅ Deployment successful! Application is running at https://neta.backspace.fm"
    echo "🔐 Admin login: https://neta.backspace.fm/admin (admin / fmbackspace55)"
else
    echo "⚠️  Deployment completed but verification failed. Check logs:"
    echo "   docker compose -f docker-compose.prod.yml logs"
    echo "   sudo nginx -t"
    echo "   sudo systemctl status nginx"
fi

EOF

    # Copy and execute deployment script on server
    print_status "Copying deployment script to server..."
    scp -i $SSH_KEY /tmp/server_deploy.sh $SERVER_USER@$SERVER_IP:/tmp/

    print_status "Executing deployment on server..."
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "chmod +x /tmp/server_deploy.sh && /tmp/server_deploy.sh"
}

# Monitor deployment
monitor_deployment() {
    print_status "Monitoring deployment status..."
    
    # Wait for services to be ready
    sleep 30
    
    print_status "Testing application endpoint..."
    if ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "curl -f https://$DOMAIN/api/version" > /dev/null 2>&1; then
        print_success "Application is responding at https://$DOMAIN"
    else
        print_warning "Application may still be starting up"
    fi
    
    # Show application status
    ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP "cd $APP_DIR && docker compose -f docker-compose.prod.yml ps"
}

# Main deployment process
main() {
    echo "================================================"
    echo "  Backspace.fm - One-Click Server Deployment"
    echo "================================================"
    echo ""
    echo "Target: https://$DOMAIN"
    echo "Server: $SERVER_IP"
    echo ""
    
    test_ssh_connection
    deploy_application
    monitor_deployment
    
    print_success "Deployment completed!"
    echo ""
    echo "🌐 Application URL: https://$DOMAIN"
    echo "🔐 Admin Panel: https://$DOMAIN/admin"
    echo "👤 Admin Login: admin / fmbackspace55"
    echo ""
    echo "📊 Monitor logs:"
    echo "  ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose -f docker-compose.prod.yml logs -f'"
    echo ""
    echo "🔧 Server management:"
    echo "  ssh -i $SSH_KEY $SERVER_USER@$SERVER_IP"
}

# Run deployment
main "$@"