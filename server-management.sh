#!/bin/bash

SERVER_HOST="153.125.147.133"
SERVER_USER="ubuntu"
SSH_KEY="~/.ssh/id_ed25519"

case "$1" in
    status)
        echo "[INFO] Checking production server status..."
        ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'STATUS_EOF'
            cd /home/ubuntu/backspace-fm-app
            echo "=== Container Status ==="
            docker-compose ps
            echo "=== API Health ==="
            curl -s http://127.0.0.1:5000/api/version || echo "API not responding"
STATUS_EOF
        echo ""
        echo "=== External API Test ==="
        curl -s https://neta.backspace.fm/api/version
        ;;
        
    logs)
        echo "[INFO] Showing application logs..."
        ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'LOGS_EOF'
            cd /home/ubuntu/backspace-fm-app
            echo "=== Recent Application Logs (50 lines) ==="
            docker-compose logs --tail=50 backspace-fm
LOGS_EOF
        ;;
        
    restart)
        echo "[INFO] Restarting production application..."
        ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST << 'RESTART_EOF'
            cd /home/ubuntu/backspace-fm-app
            docker-compose down
            docker-compose up -d
            sleep 20
            docker-compose ps
            curl -s http://127.0.0.1:5000/api/version
RESTART_EOF
        ;;
        
    verify)
        echo "[INFO] Verifying latest code deployment..."
        response=$(curl -s https://neta.backspace.fm/api/version)
        if [[ $response == *"app"* ]]; then
            echo "[SUCCESS] API responding: $response"
            
            # Check home page for archive functionality removal
            home_page=$(curl -s https://neta.backspace.fm/)
            if [[ $home_page != *"Archive"* ]] && [[ $home_page != *"archive"* ]]; then
                echo "[SUCCESS] Latest code confirmed - Archive functionality removed"
                
                # Check admin page
                admin_response=$(curl -s https://neta.backspace.fm/admin)
                if [[ $admin_response != *"502"* ]] && [[ $admin_response != *"404"* ]]; then
                    echo "[SUCCESS] Admin interface accessible"
                else
                    echo "[WARNING] Admin interface may have issues"
                fi
            else
                echo "[WARNING] Archive functionality still present - may be old code"
            fi
        else
            echo "[ERROR] API not responding: $response"
        fi
        ;;
        
    *)
        echo "Usage: $0 {status|logs|restart|verify}"
        echo ""
        echo "Commands:"
        echo "  status  - Check server and container status"
        echo "  logs    - Show recent application logs"
        echo "  restart - Restart the application containers"
        echo "  verify  - Verify latest code deployment"
        ;;
esac