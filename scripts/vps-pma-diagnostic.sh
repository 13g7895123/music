#!/bin/bash

# ========================================
# VPS /pma 502 診斷腳本
# 用法: bash scripts/vps-pma-diagnostic.sh
#   或: PROJECT_DIR="/path/to/project" bash scripts/vps-pma-diagnostic.sh
#
# 診斷 domain/pma 回 502 的原因，涵蓋四種可能：
#   A. 程式碼沒部署到主機（nginx.conf 無 /pma）
#   B. 檔案有更新但 nginx 容器仍掛舊設定（需 restart）
#   C. phpmyadmin 容器未運行 / 不健康
#   D. 以上皆正常 → 502 來自外層 NPM 的舊 /pma 轉發規則
# ========================================

# 注意：不使用 set -e，診斷腳本要跑完所有檢查才有意義

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 期望包含 /pma 修正的 commit
EXPECTED_COMMIT="b07e439"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  VPS /pma 502 診斷${NC}"
echo -e "${BLUE}  開始時間: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ============== 偵測 docker compose 指令 ==============
DC=""
if docker compose version >/dev/null 2>&1; then
    DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    DC="docker-compose"
else
    echo -e "${RED}❌ 找不到 docker compose，後續檢查無法進行${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 使用指令: $DC${NC}"
echo ""

# ============== 尋找專案目錄 ==============
echo -e "${YELLOW}[1] 尋找 music 專案目錄${NC}"
echo ""

PROJECT_DIR="${PROJECT_DIR:-}"

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
    echo '  請手動指定: PROJECT_DIR="/path/to/project" bash scripts/vps-pma-diagnostic.sh'
    exit 1
fi
echo -e "${GREEN}✓ 專案目錄: $PROJECT_DIR${NC}"
echo ""

# ============== 檢查主機 commit ==============
echo -e "${YELLOW}[2] 檢查主機上的 commit${NC}"
echo ""

CODE_HAS_PMA=0
if git -C "$PROJECT_DIR" rev-parse --git-dir >/dev/null 2>&1; then
    echo "目前 commit:"
    git -C "$PROJECT_DIR" log --oneline -3
    echo ""
    if git -C "$PROJECT_DIR" merge-base --is-ancestor "$EXPECTED_COMMIT" HEAD 2>/dev/null; then
        echo -e "${GREEN}✓ 已包含 /pma 修正 ($EXPECTED_COMMIT)${NC}"
    else
        echo -e "${RED}⚠ 尚未包含 $EXPECTED_COMMIT，程式碼可能沒部署到${NC}"
    fi
else
    echo -e "${YELLOW}⚠ 非 git repo，跳過${NC}"
fi
echo ""

# ============== 檢查主機 nginx.conf ==============
echo -e "${YELLOW}[3] 檢查主機上的 nginx.conf${NC}"
echo ""

NGINX_CONF="$PROJECT_DIR/docker/nginx/nginx.conf"
if [ ! -f "$NGINX_CONF" ]; then
    echo -e "${RED}❌ 找不到 $NGINX_CONF${NC}"
else
    if grep -q "location /pma/" "$NGINX_CONF"; then
        CODE_HAS_PMA=1
        echo -e "${GREEN}✓ nginx.conf 已有 /pma 設定${NC}"
        echo ""
        grep -n "pma" "$NGINX_CONF"
    else
        echo -e "${RED}❌ 原因 A：nginx.conf 沒有 /pma，程式碼未更新到主機${NC}"
    fi
fi
echo ""

cd "$PROJECT_DIR/docker" || exit 1

# compose 需要 .env（deploy.sh 會由 envs/.env.production 複製產生）
ENV_ARGS=""
if [ -f ".env" ]; then
    ENV_ARGS="--env-file .env"
else
    echo -e "${YELLOW}⚠ docker/.env 不存在，compose 可能無法解析變數${NC}"
    echo ""
fi

# ============== 容器狀態 ==============
echo -e "${YELLOW}[4] 容器狀態${NC}"
echo ""
$DC $ENV_ARGS -f docker-compose.yml ps 2>&1 | grep -v "level=warning msg=\"The .* variable is not set"
echo ""

PMA_RUNNING=$($DC $ENV_ARGS -f docker-compose.yml ps -q phpmyadmin 2>/dev/null)
if [ -z "$PMA_RUNNING" ]; then
    echo -e "${RED}❌ 原因 C：phpmyadmin 容器未運行${NC}"
else
    PMA_STATE=$(docker inspect -f '{{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$PMA_RUNNING" 2>/dev/null)
    echo -e "phpmyadmin 狀態: ${GREEN}$PMA_STATE${NC}"
fi
echo ""

# ============== nginx 容器內實際設定 ==============
echo -e "${YELLOW}[5] nginx 容器內實際掛載的設定${NC}"
echo ""

NGINX_RUNNING=$($DC $ENV_ARGS -f docker-compose.yml ps -q nginx 2>/dev/null)
if [ -z "$NGINX_RUNNING" ]; then
    echo -e "${RED}❌ nginx 容器未運行${NC}"
else
    IN_CONTAINER=$($DC $ENV_ARGS -f docker-compose.yml exec -T nginx grep -c "location /pma/" /etc/nginx/conf.d/default.conf 2>/dev/null | tr -d '\r')
    [ -z "$IN_CONTAINER" ] && IN_CONTAINER=0
    if [ "$IN_CONTAINER" -gt 0 ] 2>/dev/null; then
        echo -e "${GREEN}✓ 容器內設定已含 /pma${NC}"
    else
        if [ "$CODE_HAS_PMA" -eq 1 ]; then
            echo -e "${RED}❌ 原因 B：檔案已更新但容器仍掛舊設定，需 restart nginx${NC}"
        else
            echo -e "${RED}❌ 容器內無 /pma（主機檔案本來就沒有）${NC}"
        fi
    fi
fi
echo ""

# ============== nginx → phpmyadmin 連通性 ==============
echo -e "${YELLOW}[6] nginx 能否連到 phpmyadmin${NC}"
echo ""

if [ -n "$NGINX_RUNNING" ]; then
    $DC $ENV_ARGS -f docker-compose.yml exec -T nginx \
        wget -S -O /dev/null http://phpmyadmin:80/ 2>&1 | head -15
    if [ "${PIPESTATUS[0]}" -ne 0 ]; then
        echo -e "${RED}⚠ nginx 連不到 phpmyadmin（原因 C）${NC}"
    else
        echo -e "${GREEN}✓ 內部連線正常${NC}"
    fi
fi
echo ""

# ============== 從 nginx 實際打 /pma/ ==============
echo -e "${YELLOW}[7] 實際請求 /pma/（繞過外層 NPM，直打容器）${NC}"
echo ""

if [ -n "$NGINX_RUNNING" ]; then
    echo "--- GET /pma/ ---"
    $DC $ENV_ARGS -f docker-compose.yml exec -T nginx \
        wget -S -O /dev/null "http://localhost:80/pma/" 2>&1 | grep -E "HTTP/|Location:" | head -5
    echo ""
    echo "--- GET /pma （無尾斜線，預期 301）---"
    $DC $ENV_ARGS -f docker-compose.yml exec -T nginx \
        wget -S -O /dev/null "http://localhost:80/pma" 2>&1 | grep -E "HTTP/|Location:" | head -5
fi
echo ""

# ============== 對外 port 檢查 ==============
echo -e "${YELLOW}[8] 對外 port 狀況（8081 應已不再對外）${NC}"
echo ""

if command -v ss >/dev/null 2>&1; then
    ss -tlnp 2>/dev/null | grep -E ":8081|:80 |:443" || echo "(8081 未監聽，符合預期)"
else
    netstat -tlnp 2>/dev/null | grep -E ":8081|:80 |:443" || echo "(8081 未監聽，符合預期)"
fi
echo ""

# ============== nginx 錯誤日誌 ==============
echo -e "${YELLOW}[9] nginx 錯誤日誌（最後 30 行）${NC}"
echo ""
$DC $ENV_ARGS -f docker-compose.yml logs --tail=30 nginx 2>&1 | grep -iE "error|emerg|\[warn\]" || echo "(無 error)"
echo ""

# ============== phpmyadmin 日誌 ==============
echo -e "${YELLOW}[10] phpmyadmin 日誌（最後 20 行）${NC}"
echo ""
$DC $ENV_ARGS -f docker-compose.yml logs --tail=20 phpmyadmin 2>&1 \
    | grep -v "level=warning msg=\"The .* variable is not set" | tail -20
echo ""

# ============== PMA_ABSOLUTE_URI ==============
echo -e "${YELLOW}[11] PMA_ABSOLUTE_URI 設定${NC}"
echo ""

PROD_ENV="$PROJECT_DIR/docker/envs/.env.production"
if [ -f "$PROD_ENV" ]; then
    grep -E "^PMA_|^APP_PORT|^APP_BASEURL" "$PROD_ENV" || echo "(未設定 PMA_ABSOLUTE_URI)"
else
    echo -e "${YELLOW}⚠ $PROD_ENV 不存在${NC}"
fi
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  診斷完成 $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "判讀方式："
echo "  [3] 沒有 /pma        → 原因 A：修 deploy-manager 的 music.json 後重新部署"
echo "  [3] 有但 [5] 沒有    → 原因 B：$DC restart nginx"
echo "  [4]/[6] 連不到       → 原因 C：$DC up -d --remove-orphans（移除 ports 需重建容器）"
echo "  [7] 直打容器正常     → 原因 D：502 來自外層 NPM，刪掉 NPM 上舊的 /pma Custom Location"
