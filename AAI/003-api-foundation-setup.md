# Story 3: API基礎架構建立

## 📋 基本資訊
- **Story ID**: YMP-003
- **Epic**: 基礎設施建置
- **優先級**: Must Have (P0)
- **預估點數**: 8 points
- **預估時間**: 1-2 天
- **依賴關係**: Story 1, Story 2
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 後端開發者  
**我希望** 有穩固的API基礎架構  
**以便** 建立安全、可維護且高效能的RESTful API服務

## 📝 詳細需求

### 核心功能需求
1. **Express.js設置**: 建立TypeScript Express應用程式
2. **中介軟體配置**: CORS、helmet、compression等安全性和效能中介軟體
3. **路由架構**: 模組化的路由設計
4. **錯誤處理**: 全域錯誤處理和日誌記錄
5. **API文檔**: Swagger/OpenAPI文檔自動生成

### 技術規格

**Express應用程式設定**:
```typescript
// backend/src/app.ts
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { PrismaClient } from '@prisma/client'
import swaggerUi from 'swagger-ui-express'
import swaggerJsdoc from 'swagger-jsdoc'

const app = express()
const prisma = new PrismaClient()

// 安全性中介軟體
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}))

// CORS設定
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// 一般中介軟體
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分鐘
  max: 100, // 每個IP最多100次請求
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
})
app.use('/api/', limiter)

// 健康檢查端點
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString()
    })
  }
})

export { app, prisma }
```

**錯誤處理中介軟體**:
```typescript
// backend/src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export class AppError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
  }
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500
  let message = 'Internal server error'

  if (error instanceof AppError) {
    statusCode = error.statusCode
    message = error.message
  }

  logger.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  })

  res.status(statusCode).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  })
}
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `backend/src/app.ts` - Express應用程式設定
- `backend/src/server.ts` - 伺服器啟動
- `backend/src/middleware/error.middleware.ts` - 錯誤處理
- `backend/src/utils/logger.ts` - 日誌系統
- `backend/src/routes/index.ts` - 路由類型定義

## ✅ 驗收條件

### 功能驗收
- [ ] Express伺服器成功在指定PORT啟動
- [ ] 健康檢查端點 `/health` 正常回應
- [ ] CORS設定允許前端網域存取
- [ ] Rate limiting正確限制請求頻率
- [ ] 全域錯誤處理正常運作

### 安全性驗收
- [ ] Helmet安全標頭正確設定
- [ ] CORS僅允許指定來源
- [ ] 請求大小限制生效
- [ ] 敏感資訊不會在錯誤回應中洩露

## 🚀 實作指引

### Step 1: 安裝依賴
```bash
cd backend
npm install express cors helmet compression morgan express-rate-limit winston swagger-jsdoc swagger-ui-express
npm install -D @types/express @types/cors @types/compression @types/morgan
```

### Step 2: 建立基礎檔案結構
```bash
mkdir -p src/{middleware,routes,controllers,services,utils,types}
mkdir -p logs tests/{api,middleware,unit}
```

### Step 3: 啟動開發伺服器
```bash
npm run dev
```

## 📊 預期成果
- ✅ 安全的API基礎架構
- ✅ 標準化的錯誤處理
- ✅ 完整的日誌記錄
- ✅ API文檔自動生成
- ✅ 效能和安全中介軟體