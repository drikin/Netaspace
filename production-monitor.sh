#!/bin/bash

SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"

echo "Monitoring production deployment status..."

while true; do
    timestamp=$(date '+%H:%M:%S')
    
    # Check external API
    response=$(curl -s https://neta.backspace.fm/api/version)
    
    if [[ $response == *"app"* ]]; then
        echo "[$timestamp] ✓ Production API active: $response"
        
        # Verify latest code by checking for removed archive functionality
        home_page=$(curl -s https://neta.backspace.fm/)
        if [[ $home_page != *"Archive"* ]] && [[ $home_page != *"archive"* ]]; then
            echo "[$timestamp] ✓ Latest code confirmed - Archive functionality removed"
            echo "[$timestamp] ✓ Production deployment completed successfully!"
            echo ""
            echo "🌐 Website: https://neta.backspace.fm"
            echo "🔧 Admin Panel: https://neta.backspace.fm/admin"
            break
        else
            echo "[$timestamp] ⚠ Old code detected - Archive functionality still present"
        fi
    else
        echo "[$timestamp] ⏳ Production not ready yet..."
    fi
    
    sleep 30
done