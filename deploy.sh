#!/usr/bin/env bash
# ==============================================================================
# ReachInbox Email Scheduler — Safe Production Deployment Script for AWS EC2
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# NOTE: This script NEVER deletes volumes (NO `docker compose down -v`).
# ==============================================================================

set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"

echo "=================================================================="
echo "🚀 Starting ReachInbox Production Deployment on AWS EC2"
echo "=================================================================="

# 1. Check prerequisites
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Error: $COMPOSE_FILE not found in current directory."
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "❌ Error: .env file is missing."
    echo "Please copy .env.production.example to .env and configure all secrets first."
    exit 1
fi

# Ensure docker & docker compose are available
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is not installed. Please install Docker Engine."; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "❌ Docker Compose plugin is not installed."; exit 1; }

# 2. Pull latest git changes if in a git repo
if [ -d ".git" ]; then
    echo "📥 Pulling latest repository updates..."
    git pull origin main || echo "⚠️ Git pull failed or branch has local changes, proceeding with local code."
fi

# 3. Create required directories for Nginx and SSL
mkdir -p nginx/certs nginx/conf.d

# 4. Build production Docker images (Backend, Worker, Nginx)
echo "🔨 Building Docker production images..."
docker compose -f "$COMPOSE_FILE" build --parallel

# 5. Start infrastructure and application containers
echo "🚀 Starting containers in detached mode..."
docker compose -f "$COMPOSE_FILE" up -d

# 6. Wait for PostgreSQL to become healthy
echo "⏳ Waiting for PostgreSQL to be healthy..."
RETRY=0
MAX_RETRIES=20
until docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U reachinbox -d reachinbox_scheduler >/dev/null 2>&1 || [ $RETRY -eq $MAX_RETRIES ]; do
    echo "Waiting for PostgreSQL... ($((RETRY+1))/$MAX_RETRIES)"
    sleep 3
    RETRY=$((RETRY+1))
done

if [ $RETRY -eq $MAX_RETRIES ]; then
    echo "❌ PostgreSQL did not become ready in time."
    docker compose -f "$COMPOSE_FILE" logs postgres --tail=50
    exit 1
fi
echo "✅ PostgreSQL is healthy."

# 7. Run Prisma production migrations (migrate deploy, NOT migrate dev)
echo "🗄️ Running Prisma migrations on production database..."
docker compose -f "$COMPOSE_FILE" exec -T backend npx prisma migrate deploy

# 8. Wait for Backend API to become healthy
echo "⏳ Waiting for Backend API health check..."
RETRY=0
MAX_RETRIES=20
until curl -sf http://localhost:5000/health >/dev/null 2>&1 || [ $RETRY -eq $MAX_RETRIES ]; do
    echo "Waiting for backend:5000/health... ($((RETRY+1))/$MAX_RETRIES)"
    sleep 3
    RETRY=$((RETRY+1))
done

if [ $RETRY -eq $MAX_RETRIES ]; then
    echo "⚠️ Warning: Backend health check timed out. Checking logs..."
    docker compose -f "$COMPOSE_FILE" logs backend --tail=50
else
    echo "✅ Backend API is healthy!"
fi

# 9. Verify Worker is running
if docker compose -f "$COMPOSE_FILE" ps | grep -q reachinbox_worker; then
    echo "✅ BullMQ Worker container is running."
else
    echo "❌ BullMQ Worker container is not running!"
    docker compose -f "$COMPOSE_FILE" logs worker --tail=50
fi

# 10. Display current status
echo ""
echo "=================================================================="
echo "🎉 ReachInbox Deployment Completed Successfully!"
echo "=================================================================="
docker compose -f "$COMPOSE_FILE" ps
echo ""
echo "📊 Bull Board:   http://<your-ec2-ip-or-domain>/admin/queues"
echo "💓 Health Check: http://<your-ec2-ip-or-domain>/health"
echo "📁 Logs:         docker compose -f $COMPOSE_FILE logs -f"
echo "=================================================================="
