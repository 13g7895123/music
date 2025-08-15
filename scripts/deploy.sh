#!/bin/bash

# YouTube Music Player Deployment Script
# Usage: ./scripts/deploy.sh [environment] [action]
# Example: ./scripts/deploy.sh production deploy

set -e

ENVIRONMENT=${1:-staging}
ACTION=${2:-deploy}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Docker is installed and running
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        error "Docker is not running. Please start Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Load environment variables
load_env() {
    local env_file="$PROJECT_DIR/.env.$ENVIRONMENT"
    
    if [[ -f "$env_file" ]]; then
        log "Loading environment variables from $env_file"
        set -o allexport
        source "$env_file"
        set +o allexport
    else
        warning "Environment file $env_file not found. Using default values."
    fi
}

# Backup database
backup_database() {
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log "Creating database backup before deployment..."
        
        local backup_dir="$PROJECT_DIR/backups"
        local backup_file="$backup_dir/pre_deploy_backup_$(date +%Y%m%d_%H%M%S).sql"
        
        mkdir -p "$backup_dir"
        
        if docker-compose -f "$PROJECT_DIR/docker-compose.$ENVIRONMENT.yml" exec -T postgres pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-musicplayer}" > "$backup_file"; then
            success "Database backup created: $backup_file"
            gzip "$backup_file"
            success "Backup compressed: $backup_file.gz"
        else
            error "Database backup failed!"
            exit 1
        fi
    fi
}

# Pull latest images
pull_images() {
    log "Pulling latest Docker images..."
    
    if docker-compose -f "$PROJECT_DIR/docker-compose.$ENVIRONMENT.yml" pull; then
        success "Docker images pulled successfully"
    else
        error "Failed to pull Docker images"
        exit 1
    fi
}

# Deploy services
deploy_services() {
    log "Deploying services to $ENVIRONMENT environment..."
    
    local compose_file="$PROJECT_DIR/docker-compose.$ENVIRONMENT.yml"
    
    if [[ ! -f "$compose_file" ]]; then
        error "Docker compose file not found: $compose_file"
        exit 1
    fi
    
    # Start services
    if docker-compose -f "$compose_file" up -d; then
        success "Services deployed successfully"
    else
        error "Deployment failed!"
        exit 1
    fi
}

# Health check
health_check() {
    log "Performing health check..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "http://localhost:${BACKEND_PORT:-3000}/health" > /dev/null; then
            success "Backend health check passed"
            break
        else
            if [[ $attempt -eq $max_attempts ]]; then
                error "Backend health check failed after $max_attempts attempts"
                show_logs
                exit 1
            fi
            log "Health check attempt $attempt/$max_attempts failed. Retrying in 10 seconds..."
            sleep 10
            ((attempt++))
        fi
    done
    
    # Frontend health check
    if curl -f -s "http://localhost:${FRONTEND_PORT:-80}/health" > /dev/null; then
        success "Frontend health check passed"
    else
        warning "Frontend health check failed, but continuing..."
    fi
}

# Show logs
show_logs() {
    log "Showing recent logs..."
    docker-compose -f "$PROJECT_DIR/docker-compose.$ENVIRONMENT.yml" logs --tail=50
}

# Rollback
rollback() {
    error "Rolling back deployment..."
    
    local backup_dir="$PROJECT_DIR/backups"
    local latest_backup=$(ls -t "$backup_dir"/pre_deploy_backup_*.sql.gz 2>/dev/null | head -n1)
    
    if [[ -n "$latest_backup" ]]; then
        log "Restoring database from backup: $latest_backup"
        
        # Stop services
        docker-compose -f "$PROJECT_DIR/docker-compose.$ENVIRONMENT.yml" stop backend
        
        # Restore database
        gunzip -c "$latest_backup" | docker-compose -f "$PROJECT_DIR/docker-compose.$ENVIRONMENT.yml" exec -T postgres psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-musicplayer}"
        
        # Restart services with previous version
        docker-compose -f "$PROJECT_DIR/docker-compose.$ENVIRONMENT.yml" up -d
        
        success "Rollback completed"
    else
        warning "No backup found for rollback"
    fi
}

# Cleanup old images and containers
cleanup() {
    log "Cleaning up old Docker images and containers..."
    
    docker system prune -f
    docker image prune -f
    
    success "Cleanup completed"
}

# Show status
show_status() {
    log "Service status:"
    docker-compose -f "$PROJECT_DIR/docker-compose.$ENVIRONMENT.yml" ps
    
    log "Resource usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
}

# Main deployment function
deploy() {
    log "Starting deployment to $ENVIRONMENT environment..."
    
    check_docker
    load_env
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        backup_database
    fi
    
    pull_images
    deploy_services
    
    sleep 10
    health_check
    
    cleanup
    
    success "Deployment to $ENVIRONMENT completed successfully!"
    show_status
}

# Main script logic
case $ACTION in
    deploy)
        deploy
        ;;
    rollback)
        rollback
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    backup)
        backup_database
        ;;
    cleanup)
        cleanup
        ;;
    health)
        health_check
        ;;
    *)
        echo "Usage: $0 [environment] [action]"
        echo "Environments: staging, production"
        echo "Actions: deploy, rollback, status, logs, backup, cleanup, health"
        exit 1
        ;;
esac