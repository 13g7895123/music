# Story 4: JWT認證系統建立

## 📋 基本資訊
- **Story ID**: YMP-004
- **Epic**: 身份驗證系統
- **優先級**: Must Have (P0)
- **預估點數**: 13 points
- **預估時間**: 2-3 天
- **依賴關係**: Story 1, Story 2, Story 3
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 系統開發者  
**我希望** 有安全且可靠的JWT認證機制  
**以便** 保護API端點並管理用戶會話狀態

## 📝 詳細需求

### 核心功能需求
1. **JWT Token生成**: 生成Access Token和Refresh Token
2. **Token驗證**: 驗證Token有效性和過期時間
3. **Token刷新**: 安全的Token更新機制
4. **會話管理**: Redis儲存會話資料
5. **安全中介軟體**: 保護需要認證的API端點

### 技術規格

**JWT服務實作**:
```typescript
// backend/src/services/jwt.service.ts
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import { redis } from '../config/redis'

export interface JWTPayload {
  sub: string           // 用戶ID
  email: string         // 用戶郵箱
  nickname: string      // 用戶暱稱
  iat: number          // 發行時間
  exp: number          // 過期時間
  jti: string          // Token ID
  type: 'access' | 'refresh'
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export class JWTService {
  private prisma: PrismaClient
  private accessTokenSecret: string
  private refreshTokenSecret: string

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.accessTokenSecret = process.env.JWT_SECRET!
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET!
  }

  async generateTokens(userId: number, email: string, nickname: string): Promise<TokenPair> {
    const tokenId = crypto.randomUUID()
    
    const payload = {
      sub: userId.toString(),
      email,
      nickname,
      jti: tokenId
    }

    // 生成Access Token
    const accessToken = jwt.sign(
      { ...payload, type: 'access' },
      this.accessTokenSecret,
      { expiresIn: '15m' }
    )

    // 生成Refresh Token
    const refreshToken = jwt.sign(
      { ...payload, type: 'refresh' },
      this.refreshTokenSecret,
      { expiresIn: '7d' }
    )

    // 儲存會話資料到Redis
    const sessionData = {
      userId,
      email,
      nickname,
      tokenId,
      createdAt: new Date().toISOString()
    }

    await redis.setex(
      `session:${tokenId}`,
      7 * 24 * 60 * 60, // 7天
      JSON.stringify(sessionData)
    )

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15分鐘
    }
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret) as JWTPayload
      
      // 檢查會話是否仍然有效
      const sessionExists = await redis.exists(`session:${payload.jti}`)
      if (!sessionExists) {
        throw new Error('Session has expired')
      }

      return payload
    } catch (error) {
      throw error
    }
  }

  async revokeSession(tokenId: string): Promise<void> {
    await redis.del(`session:${tokenId}`)
  }
}
```

**認證中介軟體**:
```typescript
// backend/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express'
import { JWTService } from '../services/jwt.service'
import { prisma } from '../app'

export interface AuthRequest extends Request {
  user?: {
    id: number
    email: string
    nickname: string
    jti: string
  }
}

const jwtService = new JWTService(prisma)

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token required'
      })
    }

    const token = authHeader.substring(7)
    const payload = await jwtService.verifyAccessToken(token)
    
    // 檢查用戶是否仍然存在且啟用
    const user = await prisma.user.findFirst({
      where: {
        id: parseInt(payload.sub),
        isActive: true
      }
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      })
    }

    req.user = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      jti: payload.jti
    }

    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    })
  }
}
```

**Redis配置**:
```typescript
// backend/src/config/redis.ts
import Redis from 'ioredis'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
})

export { redis }
export default redis
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `backend/src/services/jwt.service.ts` - JWT服務
- `backend/src/middleware/auth.middleware.ts` - 認證中介軟體
- `backend/src/config/redis.ts` - Redis配置
- `backend/src/types/auth.types.ts` - 認證相關類型

**環境變數更新**:
```env
# JWT配置
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## ✅ 驗收條件

### 功能驗收
- [ ] JWT Token可正常生成和驗證
- [ ] Access Token和Refresh Token機制運作正常
- [ ] Token刷新功能正確執行
- [ ] 會話管理儲存到Redis正常
- [ ] 認證中介軟體正確保護API端點

### 安全性驗收
- [ ] JWT密鑰長度符合安全要求 (≥32字符)
- [ ] Token過期時間設置合理
- [ ] 撤銷的Token無法繼續使用
- [ ] 會話資料加密儲存

## 🚀 實作指引

### Step 1: 安裝依賴
```bash
cd backend
npm install jsonwebtoken ioredis
npm install -D @types/jsonwebtoken
```

### Step 2: 設置環境變數
```bash
# 生成安全的JWT密鑰
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: 測試JWT功能
```bash
npm run test:jwt
```

## 📊 預期成果
- ✅ 安全的JWT認證機制
- ✅ 完整的會話管理
- ✅ Token刷新和撤銷功能
- ✅ Redis快取整合
- ✅ 認證中介軟體保護