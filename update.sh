#!/bin/bash

# Quick update script for neta.backspace.fm
# Usage: ./update.sh

set -e

PROJECT_DIR="$HOME/Netaspace"

echo "Updating neta.backspace.fm..."

cd "$PROJECT_DIR"

# Pull latest changes
git pull origin main

# Run deployment
./deploy.sh

echo "Update completed!"