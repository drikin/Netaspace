#!/bin/bash

# Create systemd service for neta-app as backup to PM2
# This ensures the app starts on boot even if PM2 fails

sudo tee /etc/systemd/system/neta-app.service > /dev/null <<EOF
[Unit]
Description=Neta Backspace FM Topic Manager
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/Netaspace
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=5000
EnvironmentFile=/home/ubuntu/Netaspace/.env

# Output to journal
StandardOutput=journal
StandardError=journal
SyslogIdentifier=neta-app

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable neta-app

echo "Systemd service created and enabled"
echo "Start with: sudo systemctl start neta-app"
echo "Status: sudo systemctl status neta-app"