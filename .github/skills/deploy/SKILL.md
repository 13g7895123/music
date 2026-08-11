---
name: deploy
description: "部署、CI/CD、Docker 環境管理、Nginx Proxy Manager（NPM）SSL 設定。Use when: 新增 service、修改部署流程、更新 CI/CD workflow、管理多環境 .env、使用 deploy.sh、設定 GitHub Actions secrets、排查部署問題、NPM 代理設定、Cloudflare SSL 問題。Covers: scripts/deploy.sh、docker/ env 目錄、.github/workflows/deploy.yml、NPM proxy host 設定。"
argument-hint: "操作類型 (deploy | env | cicd | secret | nginx | npm | ssl | phpmyadmin | cloudflare)"
---

# Deploy — 部署系統知識庫

統一的部署腳本架構，多環境 env 集中存放於 `docker/envs/`，`docker-compose.yml` 位於 `docker/`，**Nginx Proxy Manager（NPM）** 作為對外反向代理並負責 SSL 終止，CI/CD 透過 GitHub Actions 自動化。

---

## 完整架構概覽

```
網際網路
    │  HTTPS 443
    ▼
┌─────────────────────────────────────────┐
│        Cloudflare（DNS / CDN）           │
│  - DNS 解析 your-domain.com → 伺服器 IP  │
│  - Proxy 模式（橙色雲）：HTTP/HTTPS 流量 │
└─────────────────┬───────────────────────┘
                  │ HTTPS（Cloudflare → 伺服器）
                  ▼
┌─────────────────────────────────────────┐
│   Nginx Proxy Manager（NPM）             │
│   Host Port: 80, 443                    │
│   - SSL 終止（Let's Encrypt 憑證）       │
│   - 代理目標：127.0.0.1:APP_PORT         │
└─────────────────┬───────────────────────┘
                  │ HTTP（內部）
                  ▼  APP_PORT（預設 80）
┌─────────────────────────────────────────┐
│   Docker 內部 Nginx（docker/nginx/）     │
│   Container: nginx:alpine               │
│   Listen: 80                            │
│   ├── /pma/   → phpmyadmin:80           │
│   ├── /api    → backend:9000 (FastCGI)  │
│   └── /       → frontend:80            │
└─────────────────────────────────────────┘
    │                │              │
    ▼                ▼              ▼
phpmyadmin      backend          frontend
(MariaDB GUI)   (CI4 PHP-FPM)   (Vue.js SPA)
                    │
                    ▼
                 mariadb:3306
```

### SSL 責任分工

| 層級 | 元件 | 職責 |
|------|------|------|
| 最外層 | Cloudflare | DNS 解析、DDoS 防護、CDN 快取 |
| SSL 終止 | NPM | 持有 Let's Encrypt 憑證，處理 HTTPS → HTTP |
| 內部路由 | Docker nginx | 反向代理、FastCGI proxy、路徑分發 |
| 應用層 | CI4 PHP-FPM / Vue.js | 實際業務邏輯 |

> **重點**：NPM 是唯一持有 SSL 憑證的地方，Docker 內部 nginx 只處理 HTTP（不需要憑證）。

---

## 目錄結構

```
project-root/
├── docker/
│   ├── docker-compose.yml         ← 服務定義（build context 用 ../）
│   ├── .env                       ← 由 deploy.sh 自動產生（gitignored）
│   ├── Dockerfile.frontend        ← 前端多階段建置
│   ├── nginx/
│   │   ├── nginx.conf             ← Docker 內部 nginx 反向代理設定
│   │   └── frontend.conf          ← Vue.js SPA 設定
│   └── envs/
│       ├── .env.production        ← 正式環境實際值（gitignored）
│       ├── .env.development       ← 開發環境實際值（gitignored）
│       ├── .env.production.example  ← 正式環境範本（committed）
│       └── .env.development.example ← 開發環境範本（committed）
│
├── scripts/
│   └── deploy.sh                  ← 部署主腳本（chmod +x）
│
├── .github/
│   └── workflows/
│       └── deploy.yml             ← CD：SSH 部署到伺服器
│
├── backend/                       ← CodeIgniter 4 (PHP 8.1+)
│   ├── Dockerfile.prod            ← PHP-FPM alpine
│   ├── app/
│   │   ├── Controllers/           ← HTTP 控制器
│   │   ├── Models/                ← 9 個資料模型
│   │   ├── Config/                ← CI4 設定（Routes、CORS、JWT 等）
│   │   ├── Filters/               ← AuthFilter、CorsFilter
│   │   └── Helpers/               ← JwtHelper、response_helper
│   └── database/
│       └── migrations.sql         ← 初始化 SQL
│
└── frontend/                      ← Vue.js 3 + Vite
    ├── src/
    │   ├── components/            ← 17 個 Vue 組件
    │   ├── views/                 ← 5 個頁面
    │   ├── stores/                ← 4 個 Pinia stores
    │   ├── services/              ← Axios API 服務
    │   └── composables/           ← 7 個組合式函數
    └── vite.config.js
```

---

## 服務架構（Port 路由）

```
外部請求
    │
    ▼  APP_PORT（預設 80）
 nginx
    ├── /pgadmin/     →  pgadmin:5050      (PostgreSQL 用 pgAdmin 4)
    └── /             →  frontend:3000     (Nuxt，/api/ 由 Nuxt server 內部代理到 backend:8080)

NPM 子域名代理
    pma.domain.com   →  127.0.0.1:PMA_PORT → phpmyadmin:80

直接存取（DBA 工具）
    DB_PORT_EXPOSED（預設 127.0.0.1:3307）→  mariadb:3306
```

| 服務 | 容器 Port | 對外方式 |
|------|-----------|----------|
| nginx | 80 | `APP_PORT`（host 唯一入口） |
| frontend (Nuxt) | 3000 | 只透過 nginx |
| backend (Go) | 8080 | 只透過 Nuxt/nginx，不直接對外 |
| pgadmin *(PostgreSQL)* | 5050 | 只透過 nginx `/pgadmin/` |
| phpmyadmin *(MySQL)* | 80 | `PMA_PORT`（綁 127.0.0.1，透過 NPM 子域名反向代理） |
| postgres | 5432 | `DB_PORT_EXPOSED`（DBA 工具用） |
| mysql / mariadb | 3306 | `DB_PORT_EXPOSED`（DBA 工具用） |

---

## 快速部署

```bash
# 1. 從範本建立環境設定（每個環境只需一次）
cp docker/envs/.env.production.example docker/envs/.env.production
# 編輯 docker/envs/.env.production，填入正式值

# 2. 部署（自動產生隨機密碼、啟動所有容器）
./scripts/deploy.sh production

# 開發環境
cp docker/envs/.env.development.example docker/envs/.env.development
./scripts/deploy.sh development
```

### 存取地址

| 功能 | URL |
|------|-----|
| 主應用程式（透過 NPM HTTPS） | `https://your-domain.com/` |
| phpMyAdmin | `https://your-domain.com/pma/` |
| API | `https://your-domain.com/api/...` |
| 資料庫（直接，僅本機） | `127.0.0.1:3307` |

---

## deploy.sh 運作原理

腳本分為 `scripts/deploy.sh`（流程與旗標解析）與 `scripts/_common.sh`（共用函式），架構對齊 `07_coupang-analysis`。

```
docker/envs/.env.<env>
        │
        │  ① prepare_env_file：每次部署強制複製（來源為單一真實來源）
        ▼
    docker/.env  ◄── docker compose 從此讀取（env_file + 變數插值）
        │
        │  ② handle_weak_secrets：偵測弱密鑰，輪替時同步寫回上游 .env.<env>
        │
        └── ③ sync_backend_env → backend/.env  ◄── CI4 PHP-FPM 使用
```

### 步驟說明

| 步驟 | 操作 | 說明 |
|------|------|------|
| 1 | 解析旗標 | 見下方旗標表；非 TTY 且未指定模式 → 自動降為 `--fail-on-weak` |
| 2 | 驗證環境 | `require_env`：環境名須在 `VALID_ENVS`（`development` / `production`） |
| 3 | 套用 env | `prepare_env_file`：`docker/envs/.env.<env>` → `docker/.env`（**每次強制覆寫**）。來源不存在則報錯並提示 `cp` 指令 |
| 4 | **密鑰偵測** | `handle_weak_secrets`：依模式中止／輪替／跳過 |
| 5 | 同步 backend/.env | `sync_backend_env`（在輪替**之後**，確保帶入新密鑰） |
| 6 | Port 預檢查 | `APP_PORT` / `DB_PORT_EXPOSED`：本專案容器 → 允許繼續；其他程序 → `kill -9` 後確認釋放（最多等 5 秒） |
| 7 | docker compose | `pull` → `build` → `up -d --remove-orphans` |

> **改為「每次強制覆寫 docker/.env」**：舊版「存在則不複製」會讓 `.env.<env>` 的變更永遠不生效。現在 `docker/envs/.env.<env>` 是唯一真實來源，要改設定就改它。

### 旗標

| 旗標 | 說明 |
|------|------|
| `--auto-secrets` | 偵測到弱密鑰自動產生（無互動） |
| `--skip-secrets` | 跳過密鑰偵測（production 需配合 `--i-know-what-im-doing`） |
| `--fail-on-weak` | 偵測到弱密鑰直接 exit 1（CI gate 用） |
| `--i-know-what-im-doing` | 允許在 production 使用 `--skip-secrets` |
| `--skip-port-check` | 跳過 port 佔用預檢查 |

> 同時傳入 `--auto-secrets` 與 `--fail-on-weak` 時**後者生效**（依序解析，後者覆寫）。deploy-manager 預設傳入兩者，故 CI 部署實際為 gate，不會自動輪替 production 密鑰。

---

## 密碼自動輪替

### 觸發條件

不再是硬編碼的 3 個 key，而是**依變數名分類 + 弱值樣式比對**：

| 分類 | 名稱樣式 | 產生內容 |
|------|----------|----------|
| `password` | `*_PASSWORD` / `*_PASS` / `*_PWD` | 24 字 url-safe |
| `hex` | `*_SECRET` / `*_SIGNING_KEY` / `JWT_*` | 64 hex（256-bit） |
| `token` | `*_TOKEN` / `*_API_KEY` | 48 字 base64url |
| `base64` | `*_ENCRYPTION_KEY` / `*_AES_KEY` | 44 字 base64 |

弱值樣式包含 `changeme`、`REPLACE_WITH_*`、`your_*_here`、`password`、`admin`、**空值**等。因此 `LINE_LOGIN_CHANNEL_SECRET=your_channel_secret_here` 這類舊版漏掉的值現在會被偵測到。

### 行為

- 同時寫入 `docker/.env` 與 `docker/envs/.env.<env>`，確保下次部署不會重複輪替
- 寫入前備份為 `.bak`（含明文密鑰，已納入 `.gitignore`）
- 終端只顯示新值**前 8 碼**（`secret_preview`）

### ⚠️ 資料庫已初始化時勿輪替 DB 密碼

MariaDB 只在初始化**空 volume** 時套用 `MYSQL_PASSWORD` / `MYSQL_ROOT_PASSWORD`。若 volume 已存在，輪替 `DB_PASS` / `MYSQL_ROOT_PASSWORD` 只會改到 `.env`，實際 DB 密碼不變 → 後端連線失敗。

腳本以 `db_volume_exists` 偵測既有 volume 並警告。處理方式擇一：

```bash
# (a) 手動在 DB 內更新密碼以對齊 .env
docker compose exec mariadb mariadb -uroot -p -e \
  "ALTER USER 'app_user'@'%' IDENTIFIED BY '<新密碼>'; FLUSH PRIVILEGES;"

# (b) 保留原密碼：直接把強密碼寫進 .env.<env>，別讓腳本自動輪替
```

---

## 環境變數清單

定義位置：`docker/envs/.env.<environment>`

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `APP_ENV` | 環境名稱 | `production` |
| `APP_PORT` | Docker nginx 對外 port（NPM 代理目標） | `80` |
| `APP_BASEURL` | CI4 Base URL | `https://your-domain.com/` |
| `APP_FORCE_HTTPS` | 強制 HTTPS 重導（正式環境） | `true` |
| `DB_NAME` | MariaDB 資料庫名稱 | `free_youtube` |
| `DB_USER` | MariaDB 使用者 | `app_user` |
| `DB_PASS` | MariaDB 使用者密碼 | **deploy.sh 自動產生** |
| `MYSQL_ROOT_PASSWORD` | MariaDB root 密碼 | **deploy.sh 自動產生** |
| `DB_PORT_EXPOSED` | MariaDB 對外 port | `127.0.0.1:3307` |
| `AUTH_MODE` | 認證模式（`line` / `mock`） | `line` |
| `LINE_LOGIN_CHANNEL_ID` | LINE Login Channel ID | 必填 |
| `LINE_LOGIN_CHANNEL_SECRET` | LINE Login Channel Secret | 必填 |
| `LINE_LOGIN_CALLBACK_URL` | LINE OAuth Callback URL | `https://your-domain.com/api/auth/line/callback` |
| `JWT_SECRET_KEY` | JWT 簽名金鑰 | **deploy.sh 自動產生** |
| `JWT_ACCESS_TOKEN_EXPIRE` | Access Token 有效期（秒） | `3600` |
| `JWT_REFRESH_TOKEN_EXPIRE` | Refresh Token 有效期（秒） | `2592000` |
| `COOKIE_DOMAIN` | Cookie 作用域 | `.your-domain.com` |
| `PMA_ABSOLUTE_URI` | phpMyAdmin 完整 URI | `https://your-domain.com/pma/` |
| `TZ` | 時區 | `Asia/Taipei` |

---

## nginx 設定（docker/nginx/nginx.conf）

### 路由規則

| location | proxy_pass | 適用DB | 說明 |
|----------|------------|--------|------|
| `/pgadmin/` | `http://pgadmin/` | PostgreSQL | 加 `X-Script-Name: /pgadmin` header，供 pgadmin 產生正確 URL |
| *(已移除)* | — | MySQL / MariaDB | phpMyAdmin 改為獨立 port + NPM 子域名，不再經由 nginx subpath |
| `/` | `http://frontend` | — | Nuxt SSR（含 `/api/` 代理） |

### upstream block 與 proxy_pass 的規則

**重要**：nginx `upstream {}` block 已定義了 server 位址與 port，`proxy_pass` 引用 upstream 名稱時**不可再附加 port**，否則報錯 `upstream "xxx" may not have port`。

```nginx
# ✅ 正確
upstream backend {
    server backend:8000;
}
location /api {
    proxy_pass http://backend;   # ← 只寫 upstream 名稱，不帶 port
}

# ❌ 錯誤（nginx 啟動失敗）
location /api {
    proxy_pass http://backend:8000;   # ← upstream 已定義 port，這裡不能再寫
}
```

### phpMyAdmin 存取方式

phpMyAdmin **不經由 nginx subpath**，改為獨立 port 綁定 `127.0.0.1`，透過 NPM（Nginx Proxy Manager）子域名反向代理存取：

```
NPM Proxy Host:
  Domain:  pma.your-domain.com
  Forward: 127.0.0.1:PMA_PORT (預設 8081)
  SSL:     啟用（Let's Encrypt）
```

> subpath 方式（`/pma/`）因 phpMyAdmin 靜態資源路徑問題，在多層反向代理下無法穩定運作，故改用子域名。

### SSE / WebSocket 設定

`location /` 區塊已啟用：
- `proxy_buffering off` — SSE 即時串流
- `proxy_http_version 1.1` + `Upgrade` / `Connection` headers — WebSocket 支援
- `proxy_read_timeout 3600s` — 長連線不中斷

### 修改 nginx 設定後重新載入

```bash
cd docker
docker compose exec nginx nginx -s reload
```

---

## 資料庫管理工具（phpMyAdmin）

**存取位址**：`https://your-domain.com/pma/`

| 欄位 | 值 |
|------|----||
| Host | `postgres` |
| Port | `5432` |
| Database | `DB_NAME` |
| Username | `DB_USER` |
| Password | `DB_PASS` |

**密碼輪替 key**：`PGADMIN_PASSWORD`

---

### phpMyAdmin（MySQL / MariaDB）

**docker-compose service：**
```yaml
phpmyadmin:
  image: phpmyadmin:latest
  container_name: stock_phpmyadmin
  environment:
    PMA_HOST: mysql
    PMA_PORT: 3306
    PMA_ABSOLUTE_URI: ${PMA_ABSOLUTE_URI:-http://localhost:8081/}
  ports:
    - "127.0.0.1:${PMA_PORT:-8081}:80"
  depends_on:
    - mysql
  networks:
    - stock-net
```

> `PMA_ABSOLUTE_URI` 必須對應 NPM 子域名（如 `https://pma.your-domain.com/`），確保內部連結正確。

**登入**：
- URL：`https://pma.your-domain.com/`（透過 NPM 子域名）
- Username：`DB_USER` 或 `root`
- Password：`DB_PASS` 或 `MYSQL_ROOT_PASSWORD`

**env 變數（phpMyAdmin 對應 MySQL）**：

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `DB_USER` | MySQL 使用者 | `app` |
| `DB_PASS` | MySQL 使用者密碼 | **必須修改** |
| `MYSQL_ROOT_PASSWORD` | MySQL root 密碼 | **必須修改** |
| `DB_NAME` | 資料庫名稱 | `appdb` |

**密碼輪替 key**：`DB_PASS`、`MYSQL_ROOT_PASSWORD`

---

## docker/docker-compose.yml 注意事項

- **build context** 使用 `../backend`、`../frontend`（相對於 `docker/` 目錄）
- 執行方式：`cd docker && docker compose ...`
- `frontend` 和 `backend` **不暴露** host port，只透過 nginx 存取
- `pgadmin` **不暴露** host port，只透過 nginx `/pgadmin/` 存取
- `phpmyadmin` 綁定 `127.0.0.1:PMA_PORT`，透過 NPM 子域名反向代理存取（不經由 nginx subpath）
- **禁用 `container_name`**：不在 service 上設定 `container_name`。固定名稱會導致同一台主機部署多個專案時命名衝突，且阻礙 `docker compose scale`。讓 Docker Compose 以 `<project>_<service>_<n>` 格式自動命名即可。

---

## GitHub Actions — CI

**檔案**：`.github/workflows/ci.yml`  
**觸發**：所有 push / PR

| Job | 說明 |
|-----|------|
| `backend` | `go vet` + `go build` + `go test` |
| `frontend` | `bun install` + `nuxi typecheck` + `bun run build` |
| `docker-build` | 用 development example 建立 `docker/.env`，進 `docker/` 執行 `docker compose build` |

---

## GitHub Actions — CD

**檔案**：`.github/workflows/deploy.yml`  
**觸發**：`CI` workflow 成功後自動觸發，或手動 `workflow_dispatch`

部署由 **deploy-manager** 統一管理，workflow 本身不含部署邏輯：

```
GitHub Actions ──SSH──▶ deploy-router.sh <project>
                              │
                              ├── git pull
                              ├── 寫入 .env（若設定 ENV_PROD secret）
                              └── scripts/deploy.sh production --auto-secrets --fail-on-weak
                                    （參數來自 configs/music.json 的 deploy_args）
```

### GitHub Variables / Secrets

| 類型 | 名稱 | 必填 | 說明 |
|------|------|:---:|------|
| Variable | `PROJECT_NAME` | ✅ | 對應 `deploy-manager/configs/<name>.json`（建議 `music`） |
| Variable | `DEPLOY_MANAGER_ROOT` | ❌ | 預設 `$HOME/deploy-manager` |
| Variable | `PROJECTS_ROOT` | ❌ | 專案根目錄白名單，預設 `$HOME/project` |
| Secret | `SSH_HOST` | ✅ | 部署主機 IP / Hostname |
| Secret | `SSH_USER` | ✅ | SSH 帳號 |
| Secret | `SSH_PRIVATE_KEY` | ✅ | SSH 私鑰 |
| Secret | `SSH_PORT` | ❌ | 非 22 才填 |
| Secret | `ENV_PROD` | ❌ | `.env.production` 完整內容；設定後由 deploy-manager 覆寫主機 `.env` |

> 建議走 `ENV_PROD` secret 路線：`.env.production` 以 GitHub 為唯一真實來源，主機端不保留正式密鑰。

### 伺服器首次設定

```bash
cd <repo_path>
cp docker/envs/.env.production.example docker/envs/.env.production
nano docker/envs/.env.production   # 填入強密鑰與真實 LINE 憑證
./scripts/deploy.sh production
```

> CI 帶 `--fail-on-weak`，任何 `changeme` / `your_*_here` 殘留都會讓部署中止。正式密鑰必須人工設定，不可依賴自動輪替。

---

## 新增環境（如 staging）

1. `cp docker/envs/.env.production.example docker/envs/.env.staging.example`
2. 調整 `APP_PORT` / `DB_PORT_EXPOSED` 避免衝突
3. `deploy.yml` 的 `workflow_dispatch.inputs.options` 加入 `staging`
4. 伺服器建立 `docker/envs/.env.staging`
5. `./scripts/deploy.sh staging`

---

## 新增 Docker Service

1. 在 `docker/docker-compose.yml` 新增 service（build context 用 `../service-name`）
2. 若需新對外 port，加入 `APP_PORT` 類型變數（不要直接在 compose 硬編碼）
3. 更新 `docker/envs/.env.*.example` 加入新變數
4. 若需 nginx 路由，在 `docker/nginx/nginx.conf` 新增 location 區塊
5. 更新本 SKILL.md 的「環境變數清單」與「nginx 路由規則」

---

## 排查問題

### deploy.sh 找不到環境檔
```
❌ 找不到環境檔：…/docker/envs/.env.production
```
→ `cp docker/envs/.env.production.example docker/envs/.env.production` 並填值

### 部署因弱密鑰中止
```
❌ 發現弱密鑰（--fail-on-weak / 非 TTY 環境）
```
→ 輸出會列出每個弱密鑰的名稱與現值，逐一改為強值後重試
→ 本機要快速產生：`./scripts/deploy.sh <env> --auto-secrets`

### 想強制重新套用 env
→ 直接改 `docker/envs/.env.<env>` 後重跑即可，`docker/.env` 每次都會被覆寫（不需再 `rm`）

### backend/.env 未同步
症狀：CI4 連不到 DB  
→ 再次執行 `./scripts/deploy.sh <env>` 重新同步

### 輪替密碼後後端連不上 DB
症狀：`Access denied for user`，但 `.env` 內密碼看起來是對的  
→ MariaDB volume 已初始化，新密碼未套用。見上方「資料庫已初始化時勿輪替 DB 密碼」

### phpMyAdmin 無法開啟 / 內部連結錯誤
症狀：phpMyAdmin 登入後頁面連結不含 `/pma/` 前綴  
→ 確認 `PMA_ABSOLUTE_URI` 環境變數已設定為完整 HTTPS URL（含 `/pma/` trailing slash）  
→ 確認 `docker/.env` 中 `PMA_ABSOLUTE_URI=https://your-domain.com/pma/`

### Port 被佔用（強制停止失敗）
症狀：`❌  無法停止 PID xxx`
→ 程序可能由 root 啟動，需以 `sudo ./scripts/deploy.sh production` 執行
→ 或手動 `sudo kill -9 <PID>` 後再重跑

### Port 遲遲未釋放
症狀：`❌  Port xxx 仍未釋放，請手動處理`
→ 程序可能正在 TIME_WAIT 狀態，稍等數秒後重試
→ `ss -tlnp | grep :<PORT>` 確認目前佔用狀況

### docker compose 啟動失敗
```bash
cd docker
docker compose logs nginx       # Docker 內部 nginx log
docker compose logs backend     # CI4 PHP-FPM log
docker compose logs frontend    # Vue.js SPA log
docker compose logs mariadb     # MariaDB log
docker compose logs phpmyadmin  # phpMyAdmin log
docker compose ps               # 確認所有 container 狀態
```

### Cloudflare SSL handshake failed
→ 參閱 [docs/cloudflare-npm-ssl-troubleshooting.md](../../docs/cloudflare-npm-ssl-troubleshooting.md)
