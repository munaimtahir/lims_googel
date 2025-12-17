---
name: VPS Docker deployment
overview: Complete Docker-based deployment plan for LIMS application on VPS (139.162.9.224) including multi-container setup with PostgreSQL, Django backend, React frontend, and Nginx reverse proxy, along with automated deployment scripts.
todos:
  - id: "1"
    content: Create Dockerfile for React frontend - multi-stage build (build + nginx serve)
    status: in_progress
  - id: "2"
    content: Create Dockerfile for Django backend - install dependencies, collect static files, run with Gunicorn
    status: pending
  - id: "3"
    content: Update backend/medilab_proj/settings.py - add PostgreSQL config, update ALLOWED_HOSTS with 139.162.9.224, update CORS settings
    status: pending
  - id: "4"
    content: Update services/api.ts - make API_BASE_URL use environment variable (default to VPS IP)
    status: pending
  - id: "5"
    content: Create docker-compose.yml - define services (frontend, backend, postgres, nginx) with proper networking and volumes
    status: pending
    dependencies:
      - "1"
      - "2"
  - id: "6"
    content: Create nginx/nginx.conf - configure reverse proxy for backend API and static file serving for frontend
    status: pending
  - id: "7"
    content: Create .env.production.example and backend/.env.production.example - template files with VPS IP and required variables
    status: pending
  - id: "8"
    content: Update backend/requirements.txt - add psycopg2-binary for PostgreSQL support and gunicorn for production server
    status: pending
  - id: "9"
    content: Create deploy.sh script - automated deployment script with Docker commands, environment setup, and health checks
    status: pending
    dependencies:
      - "5"
      - "6"
  - id: "10"
    content: Create .dockerignore files - optimize Docker builds by excluding unnecessary files
    status: pending
  - id: "11"
    content: Update vite.config.ts - add production build optimizations and environment variable support
    status: pending
  - id: "12"
    content: Create README_DEPLOYMENT.md - deployment documentation with step-by-step instructions
    status: pending
    dependencies:
      - "9"
---

# VPS Docker Deployment Plan

## Overview

Deploy the MediLab Pro LIMS application on VPS (IP: 139.162.9.224) using Docker containers with PostgreSQL database, Django backend, React frontend, and Nginx as reverse proxy.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Nginx (Port 80)                   │
│           Reverse Proxy & Static Files              │
└──────────────┬───────────────────┬──────────────────┘
               │                   │
       ┌───────┴───────┐   ┌──────┴──────────┐
       │  React Frontend│   │  Django Backend │
       │  (Static Build)│   │  (Gunicorn)     │
       │  Container     │   │  Container      │
       └───────────────┘   └────────┬────────┘
                                    │
                           ┌────────┴────────┐
                           │   PostgreSQL    │
                           │   Container     │
                           └─────────────────┘
```

## Files to Create/Modify

### New Files

- `Dockerfile` - Frontend React build container
- `backend/Dockerfile` - Django backend container
- `docker-compose.yml` - Multi-container orchestration
- `nginx/nginx.conf` - Nginx reverse proxy configuration
- `deploy.sh` - Automated deployment script
- `.env.production` - Production environment variables
- `backend/.env.production` - Backend production environment variables
- `.dockerignore` - Docker ignore files

### Files to Modify

- `backend/medilab_proj/settings.py` - Update ALLOWED_HOSTS and database config
- `services/api.ts` - Make API_BASE_URL environment-aware
- `vite.config.ts` - Production build configuration
- `.gitignore` - Add deployment-related ignores

## Implementation Details

### Database

- Use PostgreSQL in Docker container
- Persistent volume for data
- Environment-based configuration

### Backend (Django)

- Gunicorn as WSGI server
- Production settings with VPS IP in ALLOWED_HOSTS
- CORS configured for frontend domain
- Static files collected and served via Nginx
- Environment variables for secrets

### Frontend (React)

- Build static files in Docker
- Serve via Nginx
- Environment variable for API URL

### Nginx

- Reverse proxy to backend (port 8000)
- Serve frontend static files
- Handle CORS headers if needed
- Configured for IP 139.162.9.224

## Security Considerations

- Environment variables for sensitive data (SECRET_KEY, DB credentials, API keys)
- DEBUG=False in production
- Proper ALLOWED_HOSTS configuration
- Database password protection
- SSL/TLS ready (can be added later with Let's Encrypt)