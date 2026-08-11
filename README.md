# Free YouTube 播放清單管理系統

## 專案結構

```
free_youtube/
├── backend/                    # CodeIgniter 4 後端 API
│   ├── app/
│   │   ├── Config/
│   │   ├── Controllers/
│   │   ├── Models/
│   │   ├── Entities/
│   │   └── Database/
│   ├── public/
│   └── tests/
├── frontend/                   # Vue.js 3 前端應用
│   ├── src/
│   │   ├── components/
│   │   ├── views/
│   │   ├── stores/
│   │   ├── services/
│   │   └── router/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── vitest.config.js
├── docker/                     # Docker / Compose 部署設定（單一來源）
│   ├── docker-compose.yml
│   ├── envs/                   # .env.<env>.example（入庫）與 .env.<env>（不入庫）
│   └── nginx/
├── scripts/                    # 部署腳本（皆吃 <env> 參數）
│   ├── deploy.sh
│   └── _common.sh              # 共用函式：環境檢查、密鑰偵測、compose 包裝
├── .gitignore
└── README.md

```

## 服務端口

對外只開 `APP_PORT`（Docker 內部 nginx 為唯一入口），其餘服務僅在內部網路互通。

| 服務 | 對外方式 |
|------|----------|
| nginx | `APP_PORT`（預設 80） |
| frontend / backend | 只透過 nginx |
| phpMyAdmin | `PMA_PORT`（預設 8081，綁 127.0.0.1） |
| MariaDB | `DB_PORT_EXPOSED`（預設 `127.0.0.1:3307`） |

## 快速開始

### 前提條件
- Node.js 18+
- Docker & Docker Compose v2
- Composer (for backend)

### 快速部署

所有環境啟動一律走 `scripts/deploy.sh`，由腳本統一處理「從 `docker/envs/.env.<env>` 複製到 `docker/.env`」的步驟。

```bash
# 1. 從範本建立環境設定（每個環境只需一次，此檔不入庫）
cp docker/envs/.env.development.example docker/envs/.env.development

# 2. 部署
./scripts/deploy.sh development
```

合法環境名：`development` / `production`（白名單定義於 `scripts/_common.sh` 的 `VALID_ENVS`）。

#### 旗標

| 旗標 | 說明 |
| --- | --- |
| `--auto-secrets` | 偵測到弱密鑰自動產生（無互動） |
| `--skip-secrets` | 跳過密鑰偵測（production 需配合 `--i-know-what-im-doing`） |
| `--fail-on-weak` | 偵測到弱密鑰直接 exit 1（CI gate 用） |
| `--skip-port-check` | 跳過 port 佔用預檢查 |
| `-h, --help` | 顯示說明 |

未指定時為互動模式；**非 TTY 環境會自動降為 `--fail-on-weak`**，避免 CI 卡在提示。

#### 密鑰偵測

`deploy.sh` 會掃描 `docker/.env`，依變數名分類（`*_PASS*` / `*_SECRET*` / `JWT_*` / `*_TOKEN` 等），比對弱值樣式（`changeme`、`your_*_here`、空值⋯⋯）。自動產生時會同步寫回 `docker/envs/.env.<env>`，並在終端只顯示前 8 碼。

> ⚠️ **資料庫已初始化時勿輪替 DB 密碼**：MariaDB 只在初始化空 volume 時套用密碼環境變數。若 volume 已存在，輪替 `DB_PASS` / `MYSQL_ROOT_PASSWORD` 不會生效，後端會因密碼不符而連不上。腳本偵測到既有 volume 時會提出警告。

### 本機開發（不走 Docker）

```bash
# 前端
cd frontend && npm install && npm run dev

# 後端（需先執行過 deploy.sh 以產生 backend/.env）
cd backend && composer install && php spark serve
```

### 資料庫管理

phpMyAdmin：`http://localhost:${APP_PORT}/pma/`

帳號密碼為 `docker/envs/.env.<env>` 中的 `DB_USER` / `DB_PASS`（或 `root` / `MYSQL_ROOT_PASSWORD`）。

## CI / CD

GitHub Actions 有兩條 pipeline：

| Workflow | 觸發 | 動作 |
| --- | --- | --- |
| `.github/workflows/ci.yml` | PR、push `master` | backend / frontend 檢查與建置 |
| `.github/workflows/deploy.yml` | `CI` 成功後自動觸發、手動 `workflow_dispatch` | SSH 進主機呼叫 deploy-manager，部署 production |

部署由 **deploy-manager** 統一管理：workflow 只 SSH 進主機跑 `deploy-router.sh <project>`，router 會 `git pull` → 寫入 `.env` → 執行本專案的 `scripts/deploy.sh production --auto-secrets --fail-on-weak`（參數由 deploy-manager `configs/music.json` 的 `deploy_args` 控制）。

> 同時傳入 `--auto-secrets` 與 `--fail-on-weak` 時，**後者生效**（旗標依序解析，`--fail-on-weak` 覆寫在後）。亦即 CI 部署為「偵測到弱密鑰即中止」的 gate，不會自動輪替 production 密鑰。

### 主機端準備

1. 在 `repo_path` 先 `git clone` 本專案。
2. 建立 `docker/envs/.env.production`（或讓 GitHub `ENV_PROD` secret 寫入）：
   ```bash
   cp docker/envs/.env.production.example docker/envs/.env.production
   ```
   填入**強密鑰**與真實 LINE 憑證——`--fail-on-weak` 會擋下任何 `changeme` / `your_*_here` 殘留。
3. 在 deploy-manager `configs/music.json` 設定：
   ```json
   {
     "name": "music",
     "repo_path": "/home/<user>/project/music",
     "branch": "master",
     "deploy_args": ["production", "--auto-secrets", "--fail-on-weak"]
   }
   ```

### GitHub Repo 設定

**Variables**

| 名稱 | 必填 | 內容 |
| --- | :---: | --- |
| `PROJECT_NAME` | ✅ | `music`（對應 `deploy-manager/configs/music.json`） |
| `DEPLOY_MANAGER_ROOT` | ❌ | 主機上的 deploy-manager 路徑，未設定 = `$HOME/deploy-manager` |
| `PROJECTS_ROOT` | ❌ | 被部署專案根目錄白名單，未設定 = `$HOME/project` |

**Secrets**

| 名稱 | 必填 | 內容 |
| --- | :---: | --- |
| `SSH_HOST` | ✅ | 部署主機 IP / Hostname |
| `SSH_USER` | ✅ | SSH 帳號 |
| `SSH_PRIVATE_KEY` | ✅ | SSH 私鑰 |
| `SSH_PORT` | ❌ | 非 22 才填 |
| `ENV_PROD` | ❌ | `docker/envs/.env.production` 完整內容。設定 → 部署時覆寫主機 `.env`；未設定 → 保留主機現有 `.env` |

> 建議走 `ENV_PROD` secret 路線：把 `.env.production` 視為 GitHub 唯一真實來源，主機端不保留正式密鑰。

## 技術棧

- **後端**: CodeIgniter 4 + MariaDB
- **前端**: Vue.js 3 + Composition API + Vite
- **容器化**: Docker + Docker Compose
- **API**: RESTful

## 功能特性

- ✅ YouTube 影片儲存與管理
- ✅ 播放清單建立與組織
- ✅ 自動順序播放
- ✅ 拖曳排序
- ✅ 搜尋與篩選
- ✅ 響應式設計

## 開發指南

詳見 `/specs/002-playlist-database/` 中的規劃文件：
- `spec.md` - 功能規格書
- `plan.md` - 技術實作計畫
- `tasks.md` - 實作任務列表
- `data-model.md` - 資料庫設計
