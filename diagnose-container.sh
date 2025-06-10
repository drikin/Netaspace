#!/bin/bash

SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"

ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'DIAGNOSE_EOF'
cd /home/ubuntu/backspace-fm-app

echo "=== Container Diagnosis ==="
docker-compose -f docker-compose.prod.yml ps -a

echo -e "\n=== Application Container Logs ==="
docker-compose -f docker-compose.prod.yml logs backspace-fm

echo -e "\n=== Force Start Application ==="
docker-compose -f docker-compose.prod.yml up -d backspace-fm

echo -e "\n=== Wait for PostgreSQL Health ==="
for i in {1..30}; do
    if docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U postgres -d backspace_fm; then
        echo "PostgreSQL ready"
        break
    fi
    echo "Waiting for PostgreSQL... ($i/30)"
    sleep 2
done

echo -e "\n=== Wait for Application ==="
for i in {1..40}; do
    if curl -s --connect-timeout 3 http://127.0.0.1:5000/api/version; then
        echo -e "\nApplication ready"
        break
    fi
    echo -n "."
    sleep 3
done

echo -e "\n\n=== Final Status ==="
docker-compose -f docker-compose.prod.yml ps

echo -e "\n=== Setup Database ==="
if curl -s http://127.0.0.1:5000/api/version > /dev/null; then
    docker-compose -f docker-compose.prod.yml exec backspace-fm npm run db:push
    
    docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d backspace_fm << 'SETUP_DB'
INSERT INTO users (username, password, is_admin, email, created_at) 
VALUES ('admin', 'fmbackspace55', true, 'admin@backspace.fm', NOW())
ON CONFLICT (username) DO NOTHING;

INSERT INTO weeks (title, start_date, end_date, is_active)
VALUES ('2025年第2週', '2025-01-06', '2025-01-12', true)
ON CONFLICT DO NOTHING;

SELECT 'Setup complete' as status;
SETUP_DB

    echo -e "\n=== Test Admin Login ==="
    LOGIN_RESULT=$(curl -s -X POST -H "Content-Type: application/json" \
         -d '{"username":"admin","password":"fmbackspace55"}' \
         -c /tmp/admin_test.txt \
         http://127.0.0.1:5000/api/auth/login)
    echo "Login: $LOGIN_RESULT"
    
    AUTH_RESULT=$(curl -s -b /tmp/admin_test.txt http://127.0.0.1:5000/api/auth/me)
    echo "Auth: $AUTH_RESULT"
    
    rm -f /tmp/admin_test.txt
    
    echo -e "\n✅ ADMIN LOGIN WORKING"
    echo "URL: http://neta.backspace.fm/admin"
    echo "Username: admin"
    echo "Password: fmbackspace55"
else
    echo "❌ Application failed to start"
fi
DIAGNOSE_EOF