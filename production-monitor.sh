#!/bin/bash

# Production monitoring script for neta.backspace.fm
# This script monitors the Node.js application and restarts it if needed

LOG_FILE="/home/ubuntu/monitor.log"
APP_LOG="/home/ubuntu/production.log"
PID_FILE="/home/ubuntu/app.pid"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

check_process() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    else
        return 1
    fi
}

start_app() {
    cd /home/ubuntu
    nohup node production-server.mjs > "$APP_LOG" 2>&1 &
    echo $! > "$PID_FILE"
    log_message "Application started with PID: $(cat $PID_FILE)"
}

stop_app() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        kill "$PID" 2>/dev/null
        rm -f "$PID_FILE"
        log_message "Application stopped"
    fi
}

check_health() {
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health 2>/dev/null)
    if [ "$response" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# Main monitoring logic
case "$1" in
    start)
        if check_process; then
            log_message "Application is already running"
        else
            start_app
        fi
        ;;
    stop)
        stop_app
        ;;
    restart)
        stop_app
        sleep 2
        start_app
        ;;
    status)
        if check_process && check_health; then
            echo "Application is running and healthy"
            exit 0
        else
            echo "Application is not running or unhealthy"
            exit 1
        fi
        ;;
    monitor)
        if ! check_process; then
            log_message "Process not found, starting application"
            start_app
        elif ! check_health; then
            log_message "Health check failed, restarting application"
            stop_app
            sleep 2
            start_app
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|monitor}"
        exit 1
        ;;
esac