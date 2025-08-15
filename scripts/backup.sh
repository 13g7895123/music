#!/bin/bash
# scripts/backup.sh - Database backup script

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
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

# 預設值
POSTGRES_USER=${POSTGRES_USER:-postgres}
POSTGRES_DB=${POSTGRES_DB:-musicplayer}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
BACKUP_DIR="/backups"

log "開始資料庫備份..."

# 檢查必要變數
if [ -z "$POSTGRES_PASSWORD" ]; then
    error "POSTGRES_PASSWORD 環境變數未設置"
    exit 1
fi

# 建立備份目錄
mkdir -p "$BACKUP_DIR"

# 備份檔案名稱
BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d_%H%M%S).sql"
BACKUP_FILE_GZ="$BACKUP_FILE.gz"

# 執行備份
log "備份資料庫 $POSTGRES_DB..."
export PGPASSWORD="$POSTGRES_PASSWORD"

if pg_dump -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    --no-password \
    --verbose \
    --clean \
    --if-exists \
    --create \
    --format=plain > "$BACKUP_FILE"; then
    
    success "資料庫備份完成: $BACKUP_FILE"
    
    # 壓縮備份檔案
    if gzip "$BACKUP_FILE"; then
        success "備份檔案已壓縮: $BACKUP_FILE_GZ"
    else
        warning "備份檔案壓縮失敗"
    fi
    
else
    error "資料庫備份失敗"
    exit 1
fi

# 清理舊備份
log "清理 $BACKUP_RETENTION_DAYS 天前的舊備份..."
find "$BACKUP_DIR" -name "backup-*.sql.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete

# 統計備份檔案
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup-*.sql.gz" -type f | wc -l)
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

success "備份完成統計:"
success "  檔案數量: $BACKUP_COUNT"
success "  總大小: $BACKUP_SIZE"

# AWS S3 備份（如果配置了）
if [ -n "$S3_BUCKET" ] && [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
    log "上傳備份到 S3..."
    
    # 檢查 AWS CLI 是否可用
    if command -v aws &> /dev/null; then
        S3_KEY="database-backups/$(basename "$BACKUP_FILE_GZ")"
        
        if aws s3 cp "$BACKUP_FILE_GZ" "s3://$S3_BUCKET/$S3_KEY"; then
            success "備份已上傳到 S3: s3://$S3_BUCKET/$S3_KEY"
        else
            error "S3 上傳失敗"
        fi
    else
        warning "AWS CLI 未安裝，跳過 S3 備份"
    fi
fi

log "備份程序完成"