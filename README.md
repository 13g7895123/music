# YouTube Music Player

個人YouTube音樂播放器應用程式，採用現代化技術棧，提供流暢的音樂播放體驗和播放清單管理功能。

## 🌟 功能特色

- 🎵 YouTube音樂播放（使用iframe播放器）
- 📝 播放清單管理和編輯
- 👤 用戶註冊和身份驗證
- 🔄 播放歷史記錄
- 🎨 響應式現代化界面設計
- 🚀 高效能和安全性

## 🛠️ 技術棧

### 前端
- **Vue.js 3** - 漸進式JavaScript框架
- **TypeScript** - 類型安全的JavaScript
- **Vite** - 快速的建構工具
- **Tailwind CSS** - 實用優先的CSS框架
- **Pinia** - Vue狀態管理
- **Vue Router** - 路由管理

### 後端
- **Node.js 18+** - JavaScript運行時
- **Express.js** - Web應用框架
- **TypeScript** - 類型安全的JavaScript
- **Prisma** - 現代化ORM
- **PostgreSQL** - 關聯式資料庫
- **Redis** - 快取和會話儲存
- **JWT** - 身份驗證

### 開發工具
- **Docker** - 容器化部署
- **ESLint** - 程式碼品質檢查
- **Prettier** - 程式碼格式化
- **Vitest/Jest** - 測試框架
- **Husky** - Git hooks

## 📋 系統需求

- **Node.js**: 18.x LTS 或更高版本
- **npm**: 8.0.0 或更高版本
- **Docker**: 20.10 或更高版本
- **Docker Compose**: 2.0 或更高版本
- **Git**: 2.30 或更高版本

## 🚀 快速開始

### 1. 克隆專案
```bash
git clone https://github.com/13g7895123/music.git
cd music
```

### 2. 環境檢查
```bash
# 檢查所有必要工具是否已安裝
bash scripts/test-environment.sh
```

### 3. 自動化設置
```bash
# 運行自動化設置腳本
npm run setup
```

### 4. 配置環境變數
```bash
# 複製環境變數範本
cp .env.example .env

# 編輯 .env 檔案，設置您的配置
nano .env
```

### 5. 啟動服務
```bash
# 啟動資料庫和Redis服務
npm run docker:up

# 運行資料庫遷移
cd backend
npm run db:migrate

# 啟動開發伺服器（前端和後端）
cd ..
npm run dev
```

## 📂 專案結構

```
youtube-music-player/
├── .github/                 # GitHub工作流程和模板
│   └── workflows/           # CI/CD自動化
├── frontend/                # Vue.js前端應用
│   ├── public/              # 靜態資源
│   ├── src/                 # 源代碼
│   │   ├── components/      # Vue組件
│   │   ├── views/           # 頁面視圖
│   │   ├── stores/          # Pinia狀態管理
│   │   ├── router/          # 路由配置
│   │   ├── composables/     # 組合式函數
│   │   ├── types/           # TypeScript類型定義
│   │   └── utils/           # 工具函數
│   ├── tests/               # 前端測試
│   ├── package.json         # 前端依賴
│   ├── vite.config.ts       # Vite配置
│   └── tsconfig.json        # TypeScript配置
├── backend/                 # Node.js後端API
│   ├── src/                 # 源代碼
│   │   ├── controllers/     # 控制器
│   │   ├── services/        # 業務邏輯服務
│   │   ├── middleware/      # 中間件
│   │   ├── routes/          # API路由
│   │   ├── schemas/         # 驗證模式
│   │   ├── types/           # TypeScript類型
│   │   └── utils/           # 工具函數
│   ├── prisma/              # 資料庫模式和遷移
│   ├── tests/               # 後端測試
│   ├── package.json         # 後端依賴
│   └── tsconfig.json        # TypeScript配置
├── database/                # 資料庫相關檔案
│   ├── migrations/          # 遷移腳本
│   └── seeds/               # 種子資料
├── docs/                    # 專案文檔
├── scripts/                 # 自動化腳本
├── .vscode/                 # VS Code配置
├── docker-compose.dev.yml   # 開發環境Docker配置
├── .env.example             # 環境變數範本
├── .gitignore               # Git忽略檔案
├── .eslintrc.js             # ESLint配置
├── .prettierrc              # Prettier配置
└── package.json             # 根目錄工作區配置
```

## 🏃‍♂️ 開發指令

### 根目錄指令
```bash
# 同時啟動前端和後端開發伺服器
npm run dev

# 建構整個專案
npm run build

# 運行所有測試
npm run test

# 代碼檢查和修復
npm run lint

# TypeScript類型檢查
npm run type-check

# Docker服務管理
npm run docker:up      # 啟動服務
npm run docker:down    # 停止服務
npm run docker:logs    # 查看日誌
```

### 前端開發
```bash
cd frontend

# 啟動開發伺服器
npm run dev

# 建構生產版本
npm run build

# 預覽建構結果
npm run preview

# 運行測試
npm run test
```

### 後端開發
```bash
cd backend

# 啟動開發伺服器
npm run dev

# 建構TypeScript
npm run build

# 資料庫管理
npm run db:migrate     # 運行遷移
npm run db:seed        # 載入種子資料
npm run db:studio      # 開啟Prisma Studio
npm run db:reset       # 重置資料庫
```

## 🔧 環境變數配置

複製 `.env.example` 到 `.env` 並配置以下變數：

```env
# Docker 服務連接埠設定 (可自定義調整)
POSTGRES_PORT=5432
REDIS_PORT=6379
BACKEND_PORT=3000
FRONTEND_PORT=5173
ADMINER_PORT=8080

# 資料庫配置
DATABASE_URL="postgresql://user:password@localhost:5432/musicplayer"

# Redis配置
REDIS_URL="redis://localhost:6379"

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars

# API配置
VITE_API_URL=http://localhost:3000
PORT=3000

# 開發配置
NODE_ENV=development
```

### 🔧 自定義連接埠
您可以透過修改 `.env` 檔案中的連接埠設定來避免衝突：
- `POSTGRES_PORT`: PostgreSQL 資料庫連接埠 (預設: 5432)
- `REDIS_PORT`: Redis 快取連接埠 (預設: 6379)
- `BACKEND_PORT`: 後端 API 連接埠 (預設: 3000)
- `FRONTEND_PORT`: 前端應用連接埠 (預設: 5173)
- `ADMINER_PORT`: 資料庫管理界面連接埠 (預設: 8080)

## 🧪 測試

### 運行測試
```bash
# 運行所有測試
npm run test

# 前端測試
cd frontend && npm run test

# 後端測試
cd backend && npm run test

# 測試覆蓋率
npm run test:coverage
```

## 📝 API文檔

啟動後端服務後，可在以下網址查看API文檔：
- Swagger UI: http://localhost:3000/api-docs

## 🐳 Docker開發

### 啟動開發環境
```bash
# 啟動所有服務
npm run docker:up

# 查看服務狀態
docker-compose -f docker-compose.dev.yml ps

# 查看日誌
npm run docker:logs
```

### 資料庫管理
- **PostgreSQL**: localhost:5432
- **Adminer**: http://localhost:8080 (資料庫管理界面)
- **Redis**: localhost:6379

## 🔍 程式碼品質

專案使用以下工具確保程式碼品質：

- **ESLint**: 程式碼靜態分析
- **Prettier**: 程式碼格式化
- **Husky**: Git commit hooks
- **TypeScript**: 類型安全

### 程式碼規範
```bash
# 檢查程式碼風格
npm run lint

# 自動修復程式碼風格問題
npm run lint -- --fix

# 格式化程式碼
npx prettier --write .
```

## 🚀 部署

### 生產建構
```bash
# 建構前端和後端
npm run build

# 檢查建構結果
ls frontend/dist
ls backend/dist
```

## 🤝 開發流程

1. **分支管理**: 使用Git Flow工作流程
2. **提交規範**: 遵循Conventional Commits
3. **程式碼審查**: 所有PR需要審查
4. **測試覆蓋**: 維持80%以上的測試覆蓋率

## 📚 相關資源

- [Vue.js 3 文檔](https://vuejs.org/)
- [Express.js 文檔](https://expressjs.com/)
- [Prisma 文檔](https://www.prisma.io/docs/)
- [TypeScript 文檔](https://www.typescriptlang.org/docs/)

## 🐛 問題排除

### 常見問題

1. **Node.js版本問題**
   ```bash
   # 檢查版本
   node --version
   
   # 使用nvm切換版本
   nvm use 18
   ```

2. **Port被佔用**
   ```bash
   # 檢查Port使用情況
   lsof -i :3000
   lsof -i :5173
   ```

3. **Docker服務無法啟動**
   ```bash
   # 檢查Docker狀態
   docker ps -a
   
   # 重新啟動服務
   npm run docker:down
   npm run docker:up
   ```

## 📄 授權

本專案採用 MIT 授權條款。

## 👥 開發團隊

- **專案維護者**: Development Team
- **Repository**: https://github.com/13g7895123/music.git

---

*最後更新: 2025-08-15*