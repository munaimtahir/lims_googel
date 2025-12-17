# MediLab Pro LIMS - VPS Deployment Guide

This guide explains how to deploy the MediLab Pro LIMS application on a VPS using Docker.

**VPS IP:** 139.162.9.224

## Architecture

The deployment uses Docker Compose with the following services:

- **Nginx** - Reverse proxy and static file server (Port 80)
- **React Frontend** - Static build served by Nginx
- **Django Backend** - API server running with Gunicorn (Port 8000 internal)
- **PostgreSQL** - Database server

## Prerequisites

1. **VPS with Docker installed**
   ```bash
   # Install Docker (Ubuntu/Debian)
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Install Docker Compose (if not included)
   sudo apt-get update
   sudo apt-get install docker-compose-plugin
   ```

2. **Required ports open**
   - Port 80 (HTTP)
   - Port 443 (HTTPS, optional for future SSL setup)

3. **Domain or IP access**
   - The application is configured for IP: 139.162.9.224
   - You can later add a domain name if needed

## Quick Deployment

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd lims_googel
```

### Step 2: Set Up Environment Variables

1. **Backend Environment Variables**

   ```bash
   cp backend/env.production.example backend/.env.production
   ```

   Edit `backend/.env.production` and update:
   - `SECRET_KEY` - Generate a secure Django secret key (min 50 characters)
   - `DB_PASSWORD` - Set a strong PostgreSQL password
   - `GEMINI_API_KEY` - Your Google Gemini API key (if using AI features)
   - Verify `ALLOWED_HOSTS` includes `139.162.9.224`
   - Verify `CORS_ALLOWED_ORIGINS` includes `http://139.162.9.224`

2. **Frontend Environment Variables** (optional)

   ```bash
   cp env.production.example .env.production
   ```

   Edit `.env.production` if you need to customize:
   - `VITE_API_BASE_URL` - Defaults to `http://139.162.9.224/api`

### Step 3: Run Automated Deployment Script

```bash
chmod +x deploy.sh
./deploy.sh
```

The script will:
- Check Docker installation
- Create environment files if missing
- Generate SECRET_KEY if needed
- Build Docker images
- Start all services
- Run database migrations
- Collect static files
- Perform health checks

### Step 4: Verify Deployment

1. **Check service status:**
   ```bash
   docker compose ps
   ```

2. **View logs:**
   ```bash
   docker compose logs -f
   ```

3. **Access the application:**
   - Frontend: http://139.162.9.224
   - API: http://139.162.9.224/api
   - Admin: http://139.162.9.224/admin

## Manual Deployment Steps

If you prefer to deploy manually:

### 1. Build Images

```bash
docker compose build
```

### 2. Start Services

```bash
docker compose up -d
```

### 3. Run Migrations

```bash
docker compose exec backend python manage.py migrate
```

### 4. Collect Static Files

```bash
docker compose exec backend python manage.py collectstatic --noinput
```

### 5. Create Superuser (Optional)

```bash
docker compose exec backend python manage.py createsuperuser
```

## Configuration Files

### Docker Compose (`docker-compose.yml`)

Defines all services, networks, and volumes. Key settings:
- PostgreSQL database with persistent volume
- Backend with Gunicorn (3 workers)
- Frontend static build
- Nginx reverse proxy

### Nginx Configuration (`nginx/nginx.conf`)

- Serves frontend static files
- Proxies `/api` requests to Django backend
- Serves Django static files from `/static/`
- Handles admin panel routing

### Backend Settings (`backend/medilab_proj/settings.py`)

- PostgreSQL database configuration
- ALLOWED_HOSTS includes VPS IP
- CORS configured for frontend
- Production-ready settings

## Environment Variables Reference

### Backend (.env.production)

| Variable | Description | Example |
|----------|-------------|---------|
| `DEBUG` | Django debug mode | `False` |
| `SECRET_KEY` | Django secret key | Auto-generated |
| `ALLOWED_HOSTS` | Allowed hostnames | `139.162.9.224,localhost` |
| `DB_NAME` | Database name | `medilab_db` |
| `DB_USER` | Database user | `medilab_user` |
| `DB_PASSWORD` | Database password | Set a strong password |
| `DB_HOST` | Database host | `postgres` |
| `DB_PORT` | Database port | `5432` |
| `CORS_ALLOWED_ORIGINS` | CORS origins | `http://139.162.9.224` |
| `GEMINI_API_KEY` | Gemini API key | Your API key |

### Frontend (.env.production)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | API base URL | `http://139.162.9.224/api` |
| `GEMINI_API_KEY` | Gemini API key (optional) | Your API key |

## Managing the Deployment

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx
docker compose logs -f postgres
```

### Restart Services

```bash
# All services
docker compose restart

# Specific service
docker compose restart backend
```

### Stop Services

```bash
docker compose down
```

### Stop and Remove Volumes (⚠️ Deletes Database)

```bash
docker compose down -v
```

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose build
docker compose up -d

# Run migrations if needed
docker compose exec backend python manage.py migrate
```

### Backup Database

```bash
# Create backup
docker compose exec postgres pg_dump -U medilab_user medilab_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker compose exec -T postgres psql -U medilab_user medilab_db < backup_file.sql
```

## Troubleshooting

### Services Won't Start

1. Check logs: `docker compose logs`
2. Verify environment files exist
3. Check port 80 is not in use: `sudo netstat -tulpn | grep :80`
4. Verify Docker has enough resources

### Database Connection Errors

1. Ensure PostgreSQL container is healthy: `docker compose ps`
2. Check database credentials in `backend/.env.production`
3. Verify database container started before backend

### Frontend Not Loading

1. Check Nginx logs: `docker compose logs nginx`
2. Verify frontend container built successfully
3. Check Nginx configuration syntax

### API Calls Failing

1. Check CORS settings in `backend/.env.production`
2. Verify `ALLOWED_HOSTS` includes VPS IP
3. Check backend logs: `docker compose logs backend`

### Static Files Not Loading

1. Ensure static files collected: `docker compose exec backend python manage.py collectstatic --noinput`
2. Check static files volume is mounted correctly
3. Verify Nginx can access static files directory

## Security Recommendations

1. **Change Default Passwords**
   - Update `DB_PASSWORD` in `backend/.env.production`
   - Use a strong, unique password

2. **Generate Strong SECRET_KEY**
   - The deployment script generates one automatically
   - Or generate manually: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`

3. **Keep Environment Files Secure**
   - Never commit `.env.production` to git
   - Set proper file permissions: `chmod 600 backend/.env.production`

4. **Enable SSL/TLS** (Recommended for production)
   - Install Certbot: `sudo apt-get install certbot python3-certbot-nginx`
   - Configure Let's Encrypt certificate
   - Update Nginx config for HTTPS

5. **Firewall Configuration**
   ```bash
   # Allow only necessary ports
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp  # SSH
   sudo ufw enable
   ```

6. **Regular Updates**
   - Keep Docker images updated
   - Update system packages regularly
   - Monitor security advisories

## Monitoring

### Check Service Health

```bash
docker compose ps
```

### Monitor Resource Usage

```bash
docker stats
```

### Database Size

```bash
docker compose exec postgres psql -U medilab_user -d medilab_db -c "SELECT pg_size_pretty(pg_database_size('medilab_db'));"
```

## Support

For issues or questions:
1. Check logs: `docker compose logs -f`
2. Review this documentation
3. Check application logs in Django admin

## Next Steps

After successful deployment:

1. Create admin superuser for Django admin access
2. Seed initial data (lab tests, etc.)
3. Configure backup strategy
4. Set up SSL/TLS certificates
5. Configure monitoring and alerts
6. Set up automated backups

---

**Deployment Date:** Generated automatically  
**VPS IP:** 139.162.9.224  
**Last Updated:** See git commit history

