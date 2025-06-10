#!/bin/bash

SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"

ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'COMPLETE_SETUP'
cd /home/ubuntu/backspace-fm-app

echo "=== Wait for Application Ready ==="
for i in {1..30}; do
    if curl -s http://127.0.0.1:5000/api/version > /dev/null; then
        echo "Application is ready"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 5
done

echo -e "\n=== Initialize Database Schema ==="
docker-compose -f docker-compose.prod.yml exec backspace-fm npm run db:push

echo -e "\n=== Setup Admin User and Data ==="
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d backspace_fm << 'ADMIN_SETUP'
-- Create admin user
INSERT INTO users (username, password, is_admin, email, created_at) 
VALUES ('admin', 'fmbackspace55', true, 'admin@backspace.fm', NOW())
ON CONFLICT (username) DO UPDATE SET 
  password = EXCLUDED.password,
  is_admin = EXCLUDED.is_admin,
  email = EXCLUDED.email;

-- Create active week
INSERT INTO weeks (title, start_date, end_date, is_active)
VALUES ('2025年第2週', '2025-01-06', '2025-01-12', true)
ON CONFLICT DO NOTHING;

-- Verify setup
SELECT username, is_admin FROM users WHERE username = 'admin';
SELECT title, is_active FROM weeks WHERE is_active = true;
ADMIN_SETUP

echo -e "\n=== Test Complete Admin Login Flow ==="

# Test login
echo "Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"fmbackspace55"}' \
    -c /tmp/admin_cookies.txt \
    -w "%{http_code}" \
    http://127.0.0.1:5000/api/auth/login)

echo "Login Status: $LOGIN_RESPONSE"

# Test authentication
echo "Testing authentication..."
AUTH_RESPONSE=$(curl -s -b /tmp/admin_cookies.txt \
    -w "Status: %{http_code}" \
    http://127.0.0.1:5000/api/auth/me)

echo "Auth Response: $AUTH_RESPONSE"

# Test admin page access
echo "Testing admin page..."
ADMIN_PAGE=$(curl -s -o /dev/null -w "%{http_code}" \
    -b /tmp/admin_cookies.txt \
    http://127.0.0.1:5000/admin)

echo "Admin Page Status: $ADMIN_PAGE"

# Test weeks API
echo "Testing weeks API..."
WEEKS_API=$(curl -s -b /tmp/admin_cookies.txt \
    http://127.0.0.1:5000/api/weeks/active)

echo "Weeks API: $WEEKS_API"

rm -f /tmp/admin_cookies.txt

echo -e "\n=== Final System Status ==="
docker-compose -f docker-compose.prod.yml ps

echo -e "\n=== Admin Login Information ==="
echo "URL: http://neta.backspace.fm/admin"
echo "Username: admin"
echo "Password: fmbackspace55"

if [[ "$LOGIN_RESPONSE" == *"200" ]] && [[ "$ADMIN_PAGE" == "200" ]]; then
    echo -e "\n✅ ADMIN LOGIN FULLY OPERATIONAL"
else
    echo -e "\n❌ Admin login issues detected"
    echo "Login Status: $LOGIN_RESPONSE"
    echo "Admin Page Status: $ADMIN_PAGE"
fi
COMPLETE_SETUP