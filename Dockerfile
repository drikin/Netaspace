# Production Dockerfile for Sakura Cloud
FROM node:20-alpine

# Install build dependencies
RUN apk add --no-cache python3 make g++ curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Build production server
RUN npx esbuild server/production.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Create data directories with proper permissions
RUN mkdir -p /app/data/persistent /app/data/backups \
    && chmod -R 755 /app/data

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:5000/api/version || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PERSISTENT_DB_PATH=/app/data/persistent/production.sqlite
ENV BACKUP_DIR=/app/data/backups

# Start application
CMD ["node", "dist/production.js"]