#!/bin/bash

# Create deployment bundle for direct upload to server
# This avoids GitHub authentication issues

echo "Creating deployment bundle..."

# Create temporary directory
mkdir -p /tmp/neta-deploy
cd /tmp/neta-deploy

# Copy all necessary files
cp -r /path/to/your/project/* .

# Remove development files
rm -rf .git node_modules .replit* *.tar.gz

# Create the bundle
tar -czf neta-backspace-deploy.tar.gz *

echo "Deployment bundle created: neta-backspace-deploy.tar.gz"
echo ""
echo "Upload this file to your server and run:"
echo "tar -xzf neta-backspace-deploy.tar.gz"
echo "./quick-deploy-from-bundle.sh"