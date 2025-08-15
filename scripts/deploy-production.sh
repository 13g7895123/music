#!/bin/bash
# scripts/deploy-production.sh

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 日誌功能
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

echo -e "${GREEN}🚀 開始生產環境部署...${NC}"

# 檢查必要的環境變數
required_vars=(
    "DATABASE_URL"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "REDIS_PASSWORD"
    "GRAFANA_PASSWORD"
)

log "檢查必要的環境變數..."
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        error "缺少必要的環境變數: $var"
        exit 1
    fi
done

# 檢查 Docker 是否可用
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker 未安裝"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        error "Docker 未運行"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose 未安裝"
        exit 1
    fi
}

check_docker

# 載入環境變數
if [[ -f "$PROJECT_DIR/.env.production" ]]; then
    log "載入生產環境變數..."
    set -o allexport
    source "$PROJECT_DIR/.env.production"
    set +o allexport
else
    warning "未找到 .env.production 檔案"
fi

# 建立必要目錄
log "建立必要目錄..."
mkdir -p "$PROJECT_DIR/backups"
mkdir -p "$PROJECT_DIR/logs/nginx"
mkdir -p "$PROJECT_DIR/nginx/ssl"

# 備份當前資料庫（如果存在的話）
backup_database() {
    log "檢查是否需要資料庫備份..."
    if docker-compose -f "$PROJECT_DIR/docker-compose.production.yml" ps postgres | grep -q "Up"; then
        log "建立資料庫備份..."
        local backup_file="$PROJECT_DIR/backups/pre-deploy-$(date +%Y%m%d_%H%M%S).sql"
        
        if docker-compose -f "$PROJECT_DIR/docker-compose.production.yml" exec -T postgres pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-musicplayer}" > "$backup_file"; then
            success "資料庫備份完成: $backup_file"
            gzip "$backup_file"
            success "備份已壓縮: $backup_file.gz"
        else
            warning "資料庫備份失敗，但將繼續部署"
        fi
    else
        log "沒有運行中的資料庫服務，跳過備份"
    fi
}

backup_database

# 拉取最新映像
log "拉取最新Docker映像..."
if docker-compose -f "$PROJECT_DIR/docker-compose.production.yml" pull; then
    success "Docker映像拉取成功"
else
    error "Docker映像拉取失敗"
    exit 1
fi

# 啟動或更新服務
log "啟動生產環境服務..."
if docker-compose -f "$PROJECT_DIR/docker-compose.production.yml" up -d; then
    success "服務啟動成功"
else
    error "服務啟動失敗"
    exit 1
fi

# 等待服務啟動
log "等待服務啟動..."
sleep 30

# 健康檢查
health_check() {
    log "執行健康檢查..."
    local health_check_url="http://localhost:${BACKEND_PORT:-3000}/health"
    local max_attempts=10
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$health_check_url" > /dev/null; then
            success "後端健康檢查通過"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            error "健康檢查失敗，請檢查服務狀態"
            docker-compose -f "$PROJECT_DIR/docker-compose.production.yml" logs --tail=50
            exit 1
        fi
        
        log "嘗試 $attempt/$max_attempts 失敗，等待10秒後重試..."
        sleep 10
        ((attempt++))
    done

    # 前端健康檢查（如果適用）
    local frontend_url="http://localhost:${FRONTEND_PORT:-80}/health"
    if curl -f -s "$frontend_url" > /dev/null; then
        success "前端健康檢查通過"
    else
        warning "前端健康檢查失敗，但將繼續..."
    fi
}

health_check

# 清理舊映像
log "清理舊Docker映像..."
docker image prune -f

# 顯示服務狀態
log "檢查服務狀態..."
docker-compose -f "$PROJECT_DIR/docker-compose.production.yml" ps

# 發送部署通知（如果配置了 Slack webhook）
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    log "發送部署通知..."
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚀 生產環境部署成功完成！"}' \
        "$SLACK_WEBHOOK_URL" || warning "Slack通知發送失敗"
fi

success "🎉 生產環境部署完成！"
echo -e "${GREEN}🌐 應用程式網址: https://your-domain.com${NC}"
echo -e "${GREEN}📊 監控面板: http://localhost:${GRAFANA_PORT:-3001}${NC}"
echo -e "${GREEN}📈 Prometheus: http://localhost:${PROMETHEUS_PORT:-9090}${NC}"

# 顯示有用的管理命令
echo -e "\n${YELLOW}🔧 管理命令:${NC}"
echo -e "  檢查狀態: docker-compose -f docker-compose.production.yml ps"
echo -e "  查看日誌: docker-compose -f docker-compose.production.yml logs -f"
echo -e "  停止服務: docker-compose -f docker-compose.production.yml down"
echo -e "  重啟服務: docker-compose -f docker-compose.production.yml restart"