#!/bin/bash

# Deploy corrected application without archive/deleted tabs
echo "Deploying corrected Backspace.fm application..."

# SSH into production server and deploy
ssh -i ~/.ssh/id_ed25519 ubuntu@153.125.147.133 << 'EOF'
cd /home/ubuntu/backspace-fm-app

# Stop any running containers
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

# Create a minimal Dockerfile for production
cat > Dockerfile.minimal << 'DOCKER_EOF'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --no-optional --ignore-scripts
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
DOCKER_EOF

# Build and run the corrected application
docker build -f Dockerfile.minimal -t backspace-fm-corrected .
docker run -d --name backspace-fm-app -p 5000:5000 --env-file .env --restart unless-stopped backspace-fm-corrected

echo "Deployment completed. Application should be running on port 5000."
docker ps
EOF

echo "Deployment script executed."