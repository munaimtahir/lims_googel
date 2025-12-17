# Multi-stage build for React frontend
# Build stage: Create static files
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY package-lock.json* ./

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_BASE_URL=http://139.162.9.224/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the application
RUN npm run build

# Final stage: Simple container that copies files to volume
FROM alpine:latest

RUN apk add --no-cache bash

WORKDIR /app

# Copy built assets from builder stage
COPY --from=builder /app/dist /app/dist

# Create entrypoint script to copy files to mounted volume
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'echo "Copying frontend build files to volume..."' >> /entrypoint.sh && \
    echo 'mkdir -p /usr/share/nginx/html' >> /entrypoint.sh && \
    echo 'cp -rf /app/dist/* /usr/share/nginx/html/ 2>/dev/null || true' >> /entrypoint.sh && \
    echo 'echo "Frontend files copied successfully"' >> /entrypoint.sh && \
    echo 'exec "$@"' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

# Keep container running to maintain volume mount
CMD ["tail", "-f", "/dev/null"]

