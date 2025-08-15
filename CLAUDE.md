# Claude Code 專案設定

## Git Commit 規則

### 🚫 禁止事項
- **不要在 Git commit 訊息中加入 Claude Code 協作資訊**
- 不要使用 "🤖 Generated with Claude Code" 標籤
- 不要使用 "Co-Authored-By: Claude" 標籤

### ✅ 推薦的 Commit 格式
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**類型 (type):**
- `feat`: 新功能
- `fix`: 修復bug
- `docs`: 文檔更新
- `style`: 代碼格式調整
- `refactor`: 重構代碼
- `test`: 測試相關
- `chore`: 建構工具或輔助工具的變動

**範例:**
```
feat(auth): add JWT authentication system

Implement JWT token generation and validation
- Add login/logout endpoints
- Create authentication middleware
- Set up Redis session storage
```

## 開發指引

### 專案結構
- 前端: Vue.js 3 + TypeScript + Vite
- 後端: Node.js + Express + TypeScript + Prisma
- 資料庫: PostgreSQL + Redis
- 容器化: Docker + Docker Compose

### 環境設定
- 所有連接埠設定請參考 `.env` 檔案
- Docker 服務請使用 `docker-compose.dev.yml`
- 開發環境請先執行 `npm run setup`

### 代碼品質
- 使用 ESLint 進行程式碼檢查
- 使用 Prettier 進行程式碼格式化
- 提交前會自動執行 pre-commit hooks

---
*最後更新: 2025-08-15*