#!/bin/bash

# MediLab Pro LIMS - Automated Deployment Script
# VPS IP: 139.162.9.224

set -e  # Exit on error

echo "=========================================="
echo "MediLab Pro LIMS - Deployment Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Use 'docker compose' (v2) if available, otherwise 'docker-compose' (v1)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"

# Check for environment files
if [ ! -f "backend/.env.production" ]; then
    echo -e "${YELLOW}Warning: backend/.env.production not found${NC}"
    if [ -f "backend/env.production.example" ]; then
        echo -e "${YELLOW}Creating backend/.env.production from example...${NC}"
        cp backend/env.production.example backend/.env.production
        echo -e "${RED}⚠️  Please edit backend/.env.production with your actual values before continuing!${NC}"
        echo -e "${YELLOW}Press Enter to continue after updating the file, or Ctrl+C to abort...${NC}"
        read
    else
        echo -e "${RED}Error: backend/env.production.example not found. Cannot create .env.production${NC}"
        exit 1
    fi
fi

if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}Warning: .env.production not found${NC}"
    if [ -f "env.production.example" ]; then
        echo -e "${YELLOW}Creating .env.production from example...${NC}"
        cp env.production.example .env.production
    fi
fi

echo -e "${GREEN}✓ Environment files are ready${NC}"

# Generate secret key if not set
if ! grep -q "SECRET_KEY=" backend/.env.production || grep -q "SECRET_KEY=your-secret-key" backend/.env.production; then
    echo -e "${YELLOW}Generating Django SECRET_KEY...${NC}"
    SECRET_KEY=$(python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())" 2>/dev/null || openssl rand -base64 50)
    if grep -q "SECRET_KEY=" backend/.env.production; then
        sed -i.bak "s|SECRET_KEY=.*|SECRET_KEY=$SECRET_KEY|" backend/.env.production
    else
        echo "SECRET_KEY=$SECRET_KEY" >> backend/.env.production
    fi
    echo -e "${GREEN}✓ SECRET_KEY generated${NC}"
fi

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
$DOCKER_COMPOSE down || true

# Remove old images (optional, comment out if you want to keep them)
# echo "Removing old images..."
# docker rmi medilab_backend medilab_frontend || true

# Build images
echo -e "${YELLOW}Building Docker images...${NC}"
$DOCKER_COMPOSE build --no-cache

# Start services
echo -e "${YELLOW}Starting services...${NC}"
$DOCKER_COMPOSE up -d

# Wait for database to be ready
echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
sleep 10

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
$DOCKER_COMPOSE exec -T backend python manage.py migrate || {
    echo -e "${YELLOW}Migration failed, retrying after backend is fully up...${NC}"
    sleep 5
    $DOCKER_COMPOSE exec -T backend python manage.py migrate
}

# Create superuser (optional, commented out by default)
# echo "Creating superuser..."
# $DOCKER_COMPOSE exec -T backend python manage.py createsuperuser || true

# Collect static files
echo -e "${YELLOW}Collecting static files...${NC}"
$DOCKER_COMPOSE exec -T backend python manage.py collectstatic --noinput

# Health check
echo -e "${YELLOW}Performing health checks...${NC}"
sleep 5

# Check if services are running
if $DOCKER_COMPOSE ps | grep -q "Up"; then
    echo -e "${GREEN}✓ Services are running${NC}"
else
    echo -e "${RED}Error: Some services failed to start${NC}"
    $DOCKER_COMPOSE ps
    exit 1
fi

# Display status
echo ""
echo -e "${GREEN}=========================================="
echo "Deployment completed successfully!"
echo "==========================================${NC}"
echo ""
echo "Application is available at:"
echo -e "  ${GREEN}http://139.162.9.224${NC}"
echo ""
echo "Services status:"
$DOCKER_COMPOSE ps
echo ""
echo "To view logs:"
echo "  $DOCKER_COMPOSE logs -f"
echo ""
echo "To stop services:"
echo "  $DOCKER_COMPOSE down"
echo ""
echo "To restart services:"
echo "  $DOCKER_COMPOSE restart"
echo ""

