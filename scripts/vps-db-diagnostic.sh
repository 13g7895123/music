#!/bin/bash

# ========================================
# VPS 正式站 DB 診斷腳本
# 用法: bash vps-db-diagnostic.sh
# ========================================

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  VPS 正式站 DB 連線診斷${NC}"
echo -e "${BLUE}  開始時間: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ============== 檢查基本環境 ==============
echo -e "${YELLOW}[1] 檢查系統基本資訊${NC}"
echo ""
echo "主機名: $(hostname)"
echo "IP 地址: $(hostname -I)"
echo "OS: $(lsb_release -ds 2>/dev/null || uname -s)"
echo "日期時間: $(date)"
echo ""

# ============== 檢查磁碟空間 ==============
echo -e "${YELLOW}[2] 檢查磁碟空間${NC}"
echo ""
df -h | head -10
echo ""

# ============== 檢查 Docker ==============
echo -e "${YELLOW}[3] 檢查 Docker 狀態${NC}"
echo ""

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安裝${NC}"
else
    echo -e "${GREEN}✓ Docker 已安裝${NC}"
    echo "版本: $(docker --version)"
    echo ""
    echo "運行中的容器:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
fi

# ============== 檢查 Docker Compose ==============
echo -e "${YELLOW}[4] 檢查 Docker Compose${NC}"
echo ""

# 相容 v1 獨立指令 (docker-compose) 與 v2 plugin (docker compose)
DC=""
if command -v docker-compose &> /dev/null; then
    DC="docker-compose"
elif docker compose version &> /dev/null; then
    DC="docker compose"
fi

if [ -z "$DC" ]; then
    echo -e "${RED}❌ Docker Compose 未安裝${NC}"
else
    echo -e "${GREEN}✓ Docker Compose 已安裝 (使用: $DC)${NC}"
    echo "版本: $($DC version 2>&1 | head -1)"
    echo ""
fi

# ============== 尋找專案目錄 ==============
echo -e "${YELLOW}[5] 尋找 music 專案目錄${NC}"
echo ""

# 允許手動指定，優先使用
PROJECT_DIR="${PROJECT_DIR:-}"

# 動態搜尋：找含有 docker/docker-compose.yml 且內容有 mariadb + free_youtube 服務特徵的專案
# 搜尋範圍：常見專案存放位置，避免全機掃描太慢
if [ -z "$PROJECT_DIR" ]; then
    SEARCH_ROOTS=("/home" "/var/www" "/opt" "/srv")

    for root in "${SEARCH_ROOTS[@]}"; do
        [ -d "$root" ] || continue
        while IFS= read -r compose_file; do
            candidate="$(dirname "$(dirname "$compose_file")")"
            if grep -q "free_youtube\|mariadb" "$compose_file" 2>/dev/null; then
                PROJECT_DIR="$candidate"
                break 2
            fi
        done < <(find "$root" -maxdepth 6 -path "*/docker/docker-compose.yml" 2>/dev/null)
    done
fi

if [ -z "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ 找不到 music 專案${NC}"
    echo "請手動指定 PROJECT_DIR 後重新執行:"
    echo '  PROJECT_DIR="/path/to/project" bash scripts/vps-db-diagnostic.sh'
    exit 1
else
    echo -e "${GREEN}✓ 找到專案目錄: $PROJECT_DIR${NC}"
    echo ""
fi

cd "$PROJECT_DIR"

# ============== 檢查環境變數 ==============
echo -e "${YELLOW}[6] 檢查環境變數設定${NC}"
echo ""

ENV_FILE="docker/envs/.env.production"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}⚠ $ENV_FILE 不存在${NC}"
    echo "可用的 env 檔案:"
    ls -la docker/envs/
    echo ""
else
    echo -e "${GREEN}✓ $ENV_FILE 存在${NC}"
    echo ""
    echo "DB 相關設定:"
    grep -E "^DB_|^MYSQL_" "$ENV_FILE" 2>/dev/null | sed 's/=.*/=***/' || echo "無 DB 相關設定"
    echo ""
fi

# ============== 檢查 Docker Compose 狀態 ==============
echo -e "${YELLOW}[7] 檢查 Docker Compose 容器狀態${NC}"
echo ""

cd "$PROJECT_DIR/docker"

if [ -f "docker-compose.yml" ]; then
    echo "容器列表:"
    if [ -n "$DC" ]; then
        $DC ps
    else
        echo -e "${RED}⚠ 無可用的 compose 指令，略過${NC}"
    fi
    echo ""
else
    echo -e "${RED}❌ docker-compose.yml 不存在${NC}"
fi

# ============== 檢查 MariaDB 容器 ==============
echo -e "${YELLOW}[8] 檢查 MariaDB 容器詳情${NC}"
echo ""

MARIADB_CONTAINER=$(docker ps --filter "name=mariadb" --format "{{.Names}}" | head -1)

if [ -z "$MARIADB_CONTAINER" ]; then
    echo -e "${RED}❌ MariaDB 容器未運行${NC}"
    echo ""
    if [ -n "$DC" ]; then
        echo "嘗試啟動..."
        $DC up -d mariadb
        sleep 5
        MARIADB_CONTAINER=$(docker ps --filter "name=mariadb" --format "{{.Names}}" | head -1)
    else
        echo -e "${RED}⚠ 無可用的 compose 指令，無法自動啟動${NC}"
    fi
fi

if [ -n "$MARIADB_CONTAINER" ]; then
    echo -e "${GREEN}✓ MariaDB 容器: $MARIADB_CONTAINER${NC}"
    echo ""
    echo "容器詳情:"
    docker inspect "$MARIADB_CONTAINER" | grep -E "IPAddress|Hostname|State" | head -5
    echo ""
else
    echo -e "${RED}❌ MariaDB 容器啟動失敗${NC}"
fi

# ============== 測試 DB 連線 ==============
echo -e "${YELLOW}[9] 測試 DB 連線${NC}"
echo ""

if [ -n "$MARIADB_CONTAINER" ]; then
    # 從 .env 或 docker-compose 讀取 DB 認證
    DB_USER=${DB_USER:-root}
    DB_PASS=${DB_PASS:-secret}
    DB_NAME=${DB_NAME:-free_youtube}

    echo "嘗試連接 MariaDB..."
    TEST_RESULT=$(docker exec "$MARIADB_CONTAINER" mysqladmin ping -u"$DB_USER" -p"$DB_PASS" 2>&1 || echo "FAILED")

    if [[ "$TEST_RESULT" == *"mysqld is alive"* ]]; then
        echo -e "${GREEN}✓ DB 連線成功${NC}"
        echo ""

        # 列出資料庫
        echo "資料庫列表:"
        docker exec "$MARIADB_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" -e "SHOW DATABASES;" 2>&1 | grep -v "^Warning" || echo "無法列出"
        echo ""

        # 檢查目標資料庫
        echo "檢查資料庫 '$DB_NAME'..."
        DB_EXISTS=$(docker exec "$MARIADB_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" -e "SHOW DATABASES LIKE '$DB_NAME';" 2>&1 | grep -c "$DB_NAME" || echo "0")

        if [ "$DB_EXISTS" -gt 0 ]; then
            echo -e "${GREEN}✓ 資料庫存在${NC}"
            echo ""
            echo "表列表:"
            docker exec "$MARIADB_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SHOW TABLES;" 2>&1 | tail -n +2
            echo ""
            echo "表計數:"
            docker exec "$MARIADB_CONTAINER" mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT COUNT(*) as 'Table Count' FROM information_schema.tables WHERE table_schema='$DB_NAME';" 2>&1
        else
            echo -e "${RED}❌ 資料庫不存在${NC}"
        fi
    else
        echo -e "${RED}❌ DB 連線失敗${NC}"
        echo "錯誤: $TEST_RESULT"
    fi
    echo ""
else
    echo -e "${RED}❌ MariaDB 容器未運行，無法測試連線${NC}"
fi

# ============== 檢查應用程式容器 ==============
echo -e "${YELLOW}[10] 檢查應用程式容器${NC}"
echo ""

BACKEND_CONTAINER=$(docker ps --filter "name=backend" --format "{{.Names}}" | head -1)

if [ -n "$BACKEND_CONTAINER" ]; then
    echo -e "${GREEN}✓ Backend 容器運行中: $BACKEND_CONTAINER${NC}"
    echo ""
    echo "最近的 Log (最後 30 行):"
    docker logs "$BACKEND_CONTAINER" 2>&1 | tail -30
else
    echo -e "${RED}❌ Backend 容器未運行${NC}"
fi

echo ""

# ============== 檢查網路連線 ==============
echo -e "${YELLOW}[11] 檢查網路連線${NC}"
echo ""

NETWORKS=$(docker network ls --filter "name=music" --format "{{.Name}}")

if [ -z "$NETWORKS" ]; then
    echo -e "${YELLOW}⚠ 找不到 'music' network${NC}"
else
    echo -e "${GREEN}✓ Network: $NETWORKS${NC}"
fi

echo ""

# ============== 檢查端口監聽 ==============
echo -e "${YELLOW}[12] 檢查端口監聽${NC}"
echo ""

echo "監聽中的端口:"
netstat -tuln 2>/dev/null | grep LISTEN | grep -E "80|443|3306|8080|8081" || echo "無相關端口"

echo ""

# ============== 完結 ==============
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  診斷完成 - $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "建議檢查項目:"
echo "1. 確認所有容器都在運行: ${DC:-docker compose} ps"
echo "2. 檢查容器 log: ${DC:-docker compose} logs -f <service-name>"
echo "3. 測試 API: curl http://localhost:8080/api/health"
echo "4. 檢查應用程式錯誤: docker exec <backend-container> tail -f writable/logs/log-*.log"
echo ""
