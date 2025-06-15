#!/bin/bash

# Environment setup script for production
# Creates .env file with correct settings for neta.backspace.fm

cat > .env << 'EOF'
# Production Environment Variables for neta.backspace.fm
NODE_ENV=production
PORT=5000

# Database - Neon PostgreSQL
DATABASE_URL=postgresql://neondb_owner:npg_GFeXV6cr7anp@ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech/neondb?sslmode=require

# Session Secret
SESSION_SECRET=neta-backspace-fm-super-secret-session-key-2025

# Domain and Server
DOMAIN=neta.backspace.fm
PROTOCOL=https
HOST=0.0.0.0
SERVER_IP=153.125.147.133

# Security
TRUSTED_PROXIES=127.0.0.1,153.125.147.133

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

echo "Environment file created successfully!"
echo "Database URL configured for existing Neon PostgreSQL instance"