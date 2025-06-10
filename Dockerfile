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

# Create database directory
RUN mkdir -p database

# Build the application
RUN npm run build

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/version || exit 1

# Start the application
CMD ["npm", "run", "dev"]