# Node.js 20 Alpine image
FROM node:20-alpine

# Install required system dependencies
RUN apk add --no-cache sqlite

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production=false

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create database directory with proper permissions
RUN mkdir -p database && chmod 755 database

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of app directory including database
RUN chown -R nodejs:nodejs /app
RUN chmod -R 755 /app/database

USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/version || exit 1

# Start the application
CMD ["npm", "run", "start"]