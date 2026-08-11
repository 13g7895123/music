# GitHub Actions CI/CD Workflows

本目錄包含專案的 CI/CD 自動化配置，與 `07_coupang-analysis` 採用相同架構。

## 架構

```
PR / push to master
        │
        ▼
    ci.yml（守門）
    ├── backend   composer validate + install + php -l
    ├── frontend  bun install + lint + build
    └── compose   docker compose config 驗證
        │
        │ CI 成功且分支為 master
        ▼
   deploy.yml（部署）
        │  SSH
        ▼
   主機上的 deploy-manager
   └── deploy-router.sh <PROJECT_NAME>
       └── scripts/deploy.sh production
```

CI 不接觸 production，也完全不需要 secrets。部署一律由 CI 成功後透過
`workflow_run` 觸發，或手動 `workflow_dispatch`。

## 工作流程文件

### ci.yml
PR 與 master push 的守門機制，確保 master 永遠可部署。三個 job 平行執行：

| Job | 內容 |
| --- | --- |
| `backend` | PHP 8.1、composer validate/install、對 `app` `database` `public` 跑 `php -l` |
| `frontend` | bun 1.3.2、`bun install --frozen-lockfile`、`bun run lint`、`bun run build` |
| `compose` | 以 `.env.production.example` 驗證 `docker compose config` 可解析 |

> **Lint 說明**：專案已於 CI 導入時從 ESLint 8 + `.eslintrc.cjs` 遷移到
> ESLint 9 + flat config（`frontend/eslint.config.js`），lint 目前是**阻斷性**的。
>
> 既有程式碼仍有約 650 筆 `vue3-recommended` 的排版類警告（屬性換行、
> 標籤內容換行、超長行等），這些設為 `warn` 不擋 CI。可用 `bun run lint:fix`
> 自動修正其中大部分；整理乾淨後可考慮把 `vue/max-len` 調回 `error`。

### deploy.yml
正式環境部署，由 deploy-manager 統一管理。Pipeline 本身不含部署邏輯，
只負責 SSH 進主機呼叫 `deploy-router.sh`。

**觸發條件**
- `workflow_run`：CI 在 `master` 上成功完成後自動觸發
- `workflow_dispatch`：手動觸發

## 設定

在 Repository Settings → Secrets and variables → Actions 中設定。

### Variables

| 名稱 | 必填 | 說明 |
| --- | --- | --- |
| `PROJECT_NAME` | ✅ | 對應 `deploy-manager/configs/<PROJECT_NAME>.json`，建議 `music` |
| `DEPLOY_MANAGER_ROOT` | | Deploy Manager 安裝路徑，預設 `$HOME/deploy-manager` |
| `PROJECTS_ROOT` | | 專案根目錄白名單，預設 `$HOME/project` |

### Secrets

| 名稱 | 必填 | 說明 |
| --- | --- | --- |
| `SSH_HOST` | ✅ | 部署主機 IP / Hostname |
| `SSH_USER` | ✅ | SSH 帳號 |
| `SSH_PRIVATE_KEY` | ✅ | SSH 私鑰 |
| `SSH_PORT` | | SSH Port，預設 `22` |
| `ENV_PROD` | | `docker/envs/.env.production` 完整內容；未設定則保留主機現有 `.env` |

> 舊版使用的 `DEPLOY_HOST` / `DEPLOY_PORT` / `DEPLOY_USER` / `DEPLOY_PATH` /
> `DEPLOY_SSH_KEY` 已不再使用，可自 Repo 設定中移除。

## 部署前置需求

主機上必須已安裝 deploy-manager，且存在 `configs/<PROJECT_NAME>.json`，
並在其中將 `deploy_args` 指向本專案的 `scripts/deploy.sh production`。

## 觸發部署

```bash
git checkout master
git push origin master   # CI 通過後自動部署
```

或在 Actions 頁面手動執行 **Deploy** workflow。

## 查看部署日誌

1. 進入 GitHub Repository
2. 點擊 "Actions" 標籤
3. 選擇最近的 workflow run
4. 查看 `CI` 或 `Deploy` job
