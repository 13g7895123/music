---
name: project-architecture
description: "專案完整架構、技術棧、目錄責任、Docker/Nginx/Nginx Proxy Manager（NPM）代理流向、Cloudflare 與 SSL 終止位置。Use when: 需要快速理解整體系統、釐清服務之間的責任、分析請求路徑、確認對外 port、理解 NPM 代理 IP:PORT 與 SSL 的關係。Covers: frontend/、backend/、docker/docker-compose.yml、docker/nginx/*.conf、scripts/deploy.sh、.github/workflows/deploy.yml、Cloudflare -> NPM -> Docker nginx 架構。"
argument-hint: "主題 (overview | frontend | backend | docker | nginx | npm | cloudflare | ssl | cicd | env)"
---

# Project Architecture — 專案完整架構知識庫

本專案是一套「YouTube 播放清單管理系統」，前端使用 Vue 3 + Vite，後端使用 CodeIgniter 4 + PHP-FPM，資料庫為 MariaDB，部署時以 Docker Compose 編排服務，並由 **Nginx Proxy Manager（NPM）對外代理固定 IP:PORT，且 SSL 也由 NPM 終止處理**。

---

## 核心結論

1. **Cloudflare 只負責 DNS / CDN / Proxy。**
2. **NPM 是對外入口，監聽主機的 80/443。**
3. **NPM 將網域流量轉發到主機上的 `127.0.0.1:APP_PORT`。**
4. **Docker 內部 nginx 再把路由分流到 frontend / backend / phpMyAdmin。**
5. **SSL 憑證不在應用容器內，而是在 NPM 管理。**

---

## 完整請求流向

```text
使用者瀏覽器
    │
    │ HTTPS 443
    ▼
Cloudflare
    │
    │ HTTPS 443（Cloudflare -> 主機）
    ▼
Nginx Proxy Manager（NPM）
    │
    │ HTTP -> 127.0.0.1:APP_PORT
    ▼
Docker nginx
    ├── /        -> frontend:80
    ├── /api     -> backend:9000 (FastCGI)
    └── /pma/    -> phpmyadmin:80
                    │
                    ▼
                 mariadb:3306
```

### SSL 責任分工

| 層級 | 元件 | 職責 |
|------|------|------|
| 最外層 | Cloudflare | DNS、CDN、WAF、Proxy |
| SSL 終止 | NPM | 持有網域憑證、處理 HTTPS 握手 |
| 內部路由 | Docker nginx | 分流 `/`、`/api`、`/pma/` |
| 應用層 | frontend / backend | 業務邏輯與畫面 |

> 重點：如果 Cloudflare 出現 `SSL handshake failed`，通常不是前端 Vue 或後端 CI4 的問題，而是 **Cloudflare 到 NPM 這一段** 的網路、憑證、DNS、port、或防火牆問題。

---

## 目錄與責任

```text
.
├── .github/
│   ├── workflows/
│   │   └── deploy.yml
│   └── skills/
│       ├── deploy/SKILL.md
│       └── project-architecture/SKILL.md
├── backend/
│   ├── app/
│   │   ├── Config/
│   │   ├── Controllers/
│   │   ├── Models/
│   │   ├── Filters/
│   │   ├── Helpers/
│   │   └── Entities/
│   ├── database/
│   ├── public/
│   ├── Dockerfile.prod
│   └── composer.json
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.frontend
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── frontend.conf
│   └── envs/
│       ├── .env.production.example
│       └── .env.development.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── views/
│   │   ├── stores/
│   │   ├── services/
│   │   ├── composables/
│   │   └── router/
│   ├── package.json
│   └── vite.config.js
├── docs/
└── scripts/
    └── deploy.sh
```

### 主要檔案說明

| 路徑 | 職責 |
|------|------|
| `docker/docker-compose.yml` | 定義 nginx、frontend、backend、mariadb、phpmyadmin 五個主要服務 |
| `docker/nginx/nginx.conf` | Docker 入口 nginx，負責把路徑分發到各容器 |
| `docker/nginx/frontend.conf` | Vue SPA 的 nginx 設定與快取策略 |
| `scripts/deploy.sh` | 正式/開發部署、env 同步、密碼輪替、port 衝突檢查 |
| `.github/workflows/deploy.yml` | GitHub Actions 經 SSH 執行 `scripts/deploy.sh production` |
| `backend/composer.json` | CodeIgniter 4 / PHP 8.1 / firebase php-jwt 依賴 |
| `frontend/package.json` | Vue 3 / Vite / Pinia / Vue Router / Vitest / Playwright 工具鏈 |

---

## 各層技術棧

### 前端

- Vue 3
- Vue Router 4
- Pinia
- Axios
- Vite
- Vitest
- Playwright

前端打包後不是直接暴露在公網，而是先進入 `frontend` 容器，再由 Docker 內部 nginx 轉發。

### 後端

- PHP 8.1+
- CodeIgniter 4
- Firebase PHP-JWT
- LINE Login
- PHP-FPM

後端不直接監聽公網 HTTP，而是以 `backend:9000` 提供 FastCGI，交由 Docker nginx 的 `/api` 路徑代理。

### 資料庫

- MariaDB 10.6
- 初始化 SQL 來自 `backend/database/migrations.sql`
- 對外直連 port 預設綁定 `127.0.0.1:3307`

---

## Docker 服務架構

`docker/docker-compose.yml` 中的主要服務如下：

| 服務 | 容器用途 | 對外方式 |
|------|----------|----------|
| `nginx` | Docker 入口代理 | 對應主機 `${APP_PORT}:80` |
| `frontend` | Vue SPA 靜態站台 | 僅內部被 nginx 存取 |
| `backend` | CI4 PHP-FPM | 僅內部以 FastCGI 存取 |
| `mariadb` | 資料庫 | 對主機暴露 `${DB_PORT_EXPOSED}:3306` |
| `phpmyadmin` | DB 管理介面 | 僅內部被 nginx 的 `/pma/` 存取 |

### 內部路由規則

`docker/nginx/nginx.conf` 的責任很單純：

- `/` -> `frontend`
- `/api` -> `backend:9000`
- `/pma/` -> `phpmyadmin`

這表示：

- 前端與後端都不應直接暴露給 Cloudflare。
- Cloudflare 也不應直接指向 Docker 容器 port。
- Cloudflare 應只看到 **NPM 的 80/443**。

---

## NPM 代理模式

本專案採用的是：

```text
NPM Proxy Host
  Domain: your-domain.com
  Scheme: http
  Forward Hostname / IP: 127.0.0.1
  Forward Port: APP_PORT
```

也就是說，NPM 不是去代理容器名稱，而是代理到**主機本機 IP:PORT**。這個 port 對應的是 Docker `nginx` 服務映射出來的 `${APP_PORT}`。

### 標準配置

| 欄位 | 建議值 |
|------|--------|
| Domain Names | `your-domain.com` |
| Scheme | `http` |
| Forward Hostname / IP | `127.0.0.1` |
| Forward Port | `80` 或 `.env` 中的 `APP_PORT` |
| Block Common Exploits | 開啟 |
| Websockets Support | 開啟 |
| SSL Certificate | 由 NPM 管理 |
| Force SSL | 開啟 |
| HTTP/2 Support | 開啟 |

---

## SSL 由誰處理

**SSL 是由 NPM 處理，不是由 Docker nginx、frontend、backend 處理。**

實際含義：

1. `docker/nginx/nginx.conf` 只監聽 `listen 80;`
2. frontend 容器不需要掛載 TLS 憑證
3. backend 是 PHP-FPM，也不處理 HTTPS
4. Cloudflare 會直接和 NPM 的 443 建立 TLS

因此只要看到以下情況，就該優先檢查 NPM：

- Cloudflare 525 / `SSL handshake failed`
- Cloudflare 526 / invalid SSL certificate
- 瀏覽器直接打 origin IP:443 連不上
- NPM 無法簽發或續簽憑證

---

## 環境變數與部署

### 正式環境關鍵變數

`docker/envs/.env.production.example` 顯示正式環境預期如下：

| 變數 | 用途 |
|------|------|
| `APP_PORT` | Docker nginx 暴露到主機的 port，NPM 代理目標 |
| `APP_BASEURL` | 應用程式外部網址 |
| `APP_FORCE_HTTPS` | 是否強制 HTTPS |
| `DB_PORT_EXPOSED` | MariaDB 對主機暴露 port |
| `PMA_ABSOLUTE_URI` | phpMyAdmin 外部 URL |
| `COOKIE_DOMAIN` | Cookie 網域 |

### deploy.sh 的職責

部署腳本會：

1. 讀取 `docker/envs/.env.<environment>`
2. 若密碼仍是預設值，則自動產生隨機密碼
3. 建立 `docker/.env`
4. 同步 `backend/.env`
5. 檢查 `APP_PORT` 與 `DB_PORT_EXPOSED` 是否衝突
6. 執行 `docker compose up -d --build --remove-orphans`

這代表 NPM 的 Forward Port 必須和目前有效的 `APP_PORT` 一致，否則 NPM 會連錯地方。

---

## CI/CD 流程

`.github/workflows/deploy.yml` 的流程是：

1. GitHub Actions checkout 程式碼
2. 用 `docker/envs/.env.production.example` 驗證 compose 設定
3. SSH 到正式主機
4. `git fetch origin`
5. `git reset --hard origin/master`
6. 執行 `bash scripts/deploy.sh production`

因此正式站行為的關鍵，不只在程式碼，也包括：

- 主機上的 `docker/envs/.env.production`
- NPM Proxy Host 設定
- Cloudflare DNS 與 SSL/TLS 模式

---

## 常見誤解

### 誤解 1：Cloudflare 是直接連 Docker 容器

不是。Cloudflare 應只連到主機對外的 80/443，也就是 NPM。

### 誤解 2：SSL 憑證要掛到 frontend 或 backend 容器

不是。本專案的 SSL 終止點在 NPM。

### 誤解 3：NPM 應該 proxy 到 `frontend:80`

不是。本專案 NPM 的正確目標是主機 `127.0.0.1:APP_PORT`，因為 Docker 內部 nginx 已經負責整體分流。

### 誤解 4：Cloudflare 525 是應用程式錯誤

通常不是。525 幾乎都發生在 Cloudflare 和 NPM 建立 TLS 失敗時。

---

## 問題定位順序

若站台無法從外部 HTTPS 正常連線，建議依序排查：

1. Cloudflare DNS 是否指向正確主機 IP
2. 主機 80/443 是否真的到達 NPM
3. NPM 是否有對應網域的有效憑證
4. NPM Proxy Host 是否轉發到正確 `127.0.0.1:APP_PORT`
5. Docker `nginx` 服務是否正常監聽 `APP_PORT`
6. backend / frontend / database 是否健康

---

## 與本專案最相關的檔案

- `docker/docker-compose.yml`
- `docker/nginx/nginx.conf`
- `docker/nginx/frontend.conf`
- `docker/envs/.env.production.example`
- `scripts/deploy.sh`
- `.github/workflows/deploy.yml`
- `.github/skills/deploy/SKILL.md`

當需求是「快速了解整體架構」時，先看這份 skill；當需求是「實際部署與 SSL/NPM 操作」時，再搭配 `deploy` skill 與部署文件一起使用。