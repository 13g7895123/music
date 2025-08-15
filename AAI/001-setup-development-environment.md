# Story 1: 開發環境完整建置

## 📋 基本資訊
- **Story ID**: YMP-001
- **Epic**: 基礎設施建置
- **優先級**: Must Have (P0)
- **預估點數**: 8 points
- **預估時間**: 1-2 天
- **依賴關係**: 無 (起始任務)
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 開發團隊成員  
**我希望** 有完整且一致的開發環境設置  
**以便** 所有團隊成員能在相同環境下進行開發，避免環境差異造成的問題

## 📝 詳細需求

### 核心功能需求
1. **Node.js環境**: 安裝Node.js 18.x LTS版本
2. **容器化環境**: 配置Docker和Docker Compose
3. **版本控制**: 設置Git和GitHub整合
4. **開發工具**: 配置VS Code和必要擴展
5. **專案結構**: 建立標準化的專案目錄結構

### 技術規格

**環境需求**:
```yaml
# 開發環境規格
node_version: "18.x LTS"
docker_version: ">=20.10"
docker_compose_version: ">=2.0"
git_version: ">=2.30"
vscode_extensions:
  - Vue.volar
  - ms-vscode.vscode-typescript-next
  - bradlc.vscode-tailwindcss
  - esbenp.prettier-vscode
  - ms-vscode-remote.remote-containers
  - prisma.prisma
```

**專案結構**:
```
youtube-music-player/
├── .github/
│   └── workflows/
├── frontend/
│   ├── public/
│   ├── src/
│   ├── tests/
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── backend/
│   ├── src/
│   ├── tests/
│   ├── prisma/
│   ├── package.json
│   └── tsconfig.json
├── database/
│   ├── migrations/
│   └── seeds/
├── docs/
├── scripts/
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── .gitignore
├── README.md
└── package.json (root)
```

### 設定檔案

**VS Code 設定** (`.vscode/settings.json`):
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.vue": "vue"
  },
  "vetur.validation.template": false
}
```

**ESLint 設定** (`.eslintrc.js`):
```javascript
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true
  },
  extends: [
    '@vue/typescript/recommended',
    '@vue/prettier',
    '@vue/prettier/@typescript-eslint'
  ],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
  }
}
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `README.md` - 專案說明和開發指南
- `.gitignore` - Git忽略檔案規則
- `.env.example` - 環境變數範本
- `package.json` (root) - 工作區配置
- `.vscode/settings.json` - VS Code設定
- `.vscode/extensions.json` - 推薦擴展清單
- `scripts/setup.sh` - 自動化設置腳本

**環境變數範本** (`.env.example`):
```env
# 資料庫配置
DATABASE_URL="postgresql://user:password@localhost:5432/musicplayer"
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=musicplayer

# Redis配置
REDIS_URL="redis://localhost:6379"

# JWT配置
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# 前端配置
VITE_API_URL=http://localhost:3000
VITE_APP_NAME="YouTube Music Player"

# 開發配置
NODE_ENV=development
PORT=3000
```

## 🔗 相關Story依賴

**前置條件**: 無

**後續Story**:
- Story 2 (資料庫架構設計) - 需要Docker環境
- Story 3 (API基礎架構) - 需要Node.js和專案結構

## ✅ 驗收條件

### 功能驗收
- [ ] Node.js 18.x 成功安裝且 `node --version` 顯示正確版本
- [ ] `npm --version` 可正常執行
- [ ] `docker --version` 和 `docker-compose --version` 顯示正確版本
- [ ] Docker可成功運行 `docker run hello-world`
- [ ] Git配置完成且可推送到GitHub倉庫
- [ ] VS Code安裝所有必要擴展
- [ ] 專案目錄結構按規格建立
- [ ] 所有設定檔案正確放置

### 技術驗收
- [ ] ESLint檢查通過: `npm run lint`
- [ ] TypeScript編譯無錯誤: `npm run type-check`
- [ ] Prettier格式化正常運作
- [ ] Git hooks設置正確 (pre-commit檢查)

### 文檔驗收
- [ ] README.md包含完整的環境設置說明
- [ ] .env.example包含所有必要的環境變數
- [ ] 開發指南清楚且可執行

## 🧪 測試要求

### 環境測試腳本
```bash
#!/bin/bash
# scripts/test-environment.sh

echo "Testing development environment setup..."

# Test Node.js
node_version=$(node --version)
echo "Node.js version: $node_version"
[[ $node_version == v18* ]] || { echo "Node.js 18.x required"; exit 1; }

# Test npm
npm --version || { echo "npm not found"; exit 1; }

# Test Docker
docker --version || { echo "Docker not installed"; exit 1; }
docker-compose --version || { echo "Docker Compose not installed"; exit 1; }

# Test Git
git --version || { echo "Git not installed"; exit 1; }

echo "Environment setup test passed!"
```

## 🚀 實作指引

### Step 1: 基礎工具安裝
```bash
# 安裝Node.js (使用nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# 驗證安裝
node --version  # 應顯示 v18.x.x
npm --version
```

### Step 2: Docker安裝
```bash
# Windows: 下載Docker Desktop
# macOS: 下載Docker Desktop  
# Linux: 
sudo apt-get update
sudo apt-get install docker.io docker-compose

# 驗證安裝
docker --version
docker-compose --version
docker run hello-world
```

### Step 3: 專案初始化
```bash
# 複製專案
git clone https://github.com/13g7895123/music.git
cd music

# 建立目錄結構
mkdir -p frontend/{public,src,tests}
mkdir -p backend/{src,tests,prisma}
mkdir -p database/{migrations,seeds}
mkdir -p docs scripts .github/workflows

# 建立初始檔案
touch README.md .gitignore .env.example
```

### Step 4: VS Code設置
```bash
# 安裝推薦擴展
code --install-extension Vue.volar
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode-remote.remote-containers
code --install-extension prisma.prisma
```

## 📊 預期成果

完成此Story後，開發團隊將擁有：
- ✅ 統一的開發環境
- ✅ 完整的專案結構
- ✅ 標準化的工具配置
- ✅ 版本控制系統整合
- ✅ 自動化測試腳本

這為後續所有開發工作奠定了堅實的基礎。