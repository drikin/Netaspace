#!/bin/bash

# Production setup script for Backspace.fm
set -e

echo "Setting up production environment..."

# Install required global packages
npm install -g drizzle-kit tsx

# Install local dependencies
cd /home/ubuntu/backspace-fm-clean
npm install --omit=dev

# Push database schema
npx drizzle-kit push

# Start the application
NODE_ENV=production node dist/index.js