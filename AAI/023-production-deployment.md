# Story 23: 生產環境上線部署

## 📋 基本資訊
- **Story ID**: YMP-023
- **Epic**: 系統完善
- **優先級**: Must Have (P0)
- **預估點數**: 12 points
- **預估時間**: 3-4 天
- **依賴關係**: Story 22
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 產品擁有者  
**我希望** 將完整的應用程式部署到生產環境  
**以便** 真實用戶可以使用YouTube音樂播放器

## 📝 詳細需求

### 核心功能需求
1. **生產環境配置**: 安全、可擴展的生產環境
2. **HTTPS配置**: SSL憑證和安全連線
3. **CDN配置**: 靜態資源分發網路
4. **監控系統**: 應用程式和基礎設施監控
5. **備份策略**: 資料備份和災難恢復

### 技術規格

**生產環境架構**:
```yaml
# docker-compose.production.yml
version: '3.8'

services:
  # Nginx反向代理和SSL終止
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
    networks:
      - web_network

  # 前端應用
  frontend:
    image: ghcr.io/13g7895123/music-frontend:latest
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    networks:
      - web_network

  # 後端API
  backend:
    image: ghcr.io/13g7895123/music-backend:latest
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - CORS_ORIGIN=${CORS_ORIGIN}
      - LOG_LEVEL=info
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    networks:
      - web_network
      - backend_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # 主資料庫
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_INITDB_ARGS=--encoding=UTF-8 --lc-collate=C --lc-ctype=C
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
      - ./scripts/postgres-init.sh:/docker-entrypoint-initdb.d/init.sh:ro
    restart: unless-stopped
    networks:
      - backend_network
    command: >
      postgres
      -c shared_preload_libraries=pg_stat_statements
      -c pg_stat_statements.track=all
      -c max_connections=200
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c maintenance_work_mem=64MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100

  # Redis快取
  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --save 900 1
      --save 300 10
      --save 60 10000
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - backend_network

  # 備份服務
  backup:
    image: postgres:15
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - BACKUP_RETENTION_DAYS=30
      - S3_BUCKET=${S3_BACKUP_BUCKET}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
    volumes:
      - ./scripts/backup.sh:/backup.sh:ro
      - ./backups:/backups
    command: sh -c "chmod +x /backup.sh && /backup.sh"
    depends_on:
      - postgres
    restart: unless-stopped
    networks:
      - backend_network

  # 監控 - Prometheus
  prometheus:
    image: prom/prometheus:latest
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=15d'
      - '--web.enable-lifecycle'
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    restart: unless-stopped
    networks:
      - monitoring_network
      - backend_network

  # 監控 - Grafana
  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_SECURITY_ADMIN_USER=admin
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    ports:
      - "3001:3000"
    depends_on:
      - prometheus
    restart: unless-stopped
    networks:
      - monitoring_network

  # 日誌收集 - Loki
  loki:
    image: grafana/loki:latest
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - ./monitoring/loki/config.yml:/etc/loki/local-config.yaml:ro
      - loki_data:/loki
    restart: unless-stopped
    networks:
      - monitoring_network

  # 日誌代理 - Promtail
  promtail:
    image: grafana/promtail:latest
    command: -config.file=/etc/promtail/config.yml
    volumes:
      - ./monitoring/promtail/config.yml:/etc/promtail/config.yml:ro
      - ./logs:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    restart: unless-stopped
    networks:
      - monitoring_network

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
  loki_data:

networks:
  web_network:
    driver: bridge
  backend_network:
    driver: bridge
    internal: true
  monitoring_network:
    driver: bridge
```

**Nginx生產配置**:
```nginx
# nginx/nginx.conf
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 日誌格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # 基本設定
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Gzip壓縮
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # 安全標頭
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 速率限制
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

    # HTTP重導向到HTTPS
    server {
        listen 80;
        server_name your-domain.com www.your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS主伺服器
    server {
        listen 443 ssl http2;
        server_name your-domain.com www.your-domain.com;

        # SSL配置
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # 前端靜態資源
        location / {
            proxy_pass http://frontend:80;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # 快取靜態資源
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # API代理
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://backend:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # 認證API特別限制
        location /api/auth/ {
            limit_req zone=auth burst=5 nodelay;
            
            proxy_pass http://backend:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # 健康檢查
        location /health {
            proxy_pass http://backend:3000/health;
            access_log off;
        }
    }
}
```

**部署腳本**:
```bash
#!/bin/bash
# scripts/deploy-production.sh

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 開始生產環境部署...${NC}"

# 檢查必要的環境變數
required_vars=(
    "DATABASE_URL"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "REDIS_PASSWORD"
    "GRAFANA_PASSWORD"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ 缺少必要的環境變數: $var${NC}"
        exit 1
    fi
done

# 備份當前資料庫
echo -e "${YELLOW}📦 建立資料庫備份...${NC}"
docker-compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > "backups/pre-deploy-$(date +%Y%m%d_%H%M%S).sql"

# 拉取最新映像
echo -e "${YELLOW}📥 拉取最新Docker映像...${NC}"
docker-compose -f docker-compose.production.yml pull

# 更新服務
echo -e "${YELLOW}🔄 更新應用服務...${NC}"
docker-compose -f docker-compose.production.yml up -d --no-deps backend frontend

# 等待服務啟動
echo -e "${YELLOW}⏳ 等待服務啟動...${NC}"
sleep 30

# 健康檢查
echo -e "${YELLOW}🏥 執行健康檢查...${NC}"
health_check_url="https://your-domain.com/health"
max_attempts=10
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -f -s $health_check_url > /dev/null; then
        echo -e "${GREEN}✅ 健康檢查通過${NC}"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}❌ 健康檢查失敗，正在回滾...${NC}"
        docker-compose -f docker-compose.production.yml rollback
        exit 1
    fi
    
    echo "嘗試 $attempt/$max_attempts 失敗，等待10秒後重試..."
    sleep 10
    ((attempt++))
done

# 清理舊映像
echo -e "${YELLOW}🧹 清理舊Docker映像...${NC}"
docker image prune -f

# 發送部署通知
echo -e "${YELLOW}📢 發送部署通知...${NC}"
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚀 生產環境部署成功完成！"}' \
        $SLACK_WEBHOOK_URL
fi

echo -e "${GREEN}🎉 生產環境部署完成！${NC}"
echo -e "${GREEN}🌐 應用程式網址: https://your-domain.com${NC}"
echo -e "${GREEN}📊 監控面板: https://your-domain.com:3001${NC}"
```

**監控配置**:
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `docker-compose.production.yml` - 生產環境配置
- `nginx/nginx.conf` - Nginx生產配置
- `scripts/deploy-production.sh` - 部署腳本
- `monitoring/` - 監控配置檔案
- `ssl/` - SSL憑證檔案
- `.env.production` - 生產環境變數

**更新檔案**:
- `README.md` - 添加部署說明
- `package.json` - 添加部署命令

## ✅ 驗收條件

### 部署驗收
- [ ] 應用程式在生產環境正常運行
- [ ] HTTPS配置正確且安全
- [ ] 所有API端點正常回應
- [ ] 資料庫連線穩定
- [ ] 靜態資源正確載入

### 效能驗收
- [ ] 頁面載入時間 < 3秒
- [ ] API回應時間 < 1秒
- [ ] 系統資源使用合理
- [ ] 併發用戶處理能力足夠

### 安全性驗收
- [ ] SSL憑證有效且評級A+
- [ ] 安全標頭正確設置
- [ ] 速率限制生效
- [ ] 敏感資訊不洩露

### 監控驗收
- [ ] 應用程式監控正常
- [ ] 日誌收集完整
- [ ] 告警機制正常
- [ ] 備份策略運作

## 🚀 實作指引

### Step 1: 準備生產環境
設置伺服器和網域名稱

### Step 2: 配置SSL憑證
使用Let's Encrypt或購買SSL憑證

### Step 3: 設置監控系統
配置Prometheus、Grafana和日誌收集

### Step 4: 執行部署
運行部署腳本並驗證功能

## 📊 預期成果
- ✅ 穩定的生產環境運行
- ✅ 高效能的用戶體驗
- ✅ 完整的安全保護
- ✅ 全面的監控覆蓋
- ✅ 可靠的備份機制