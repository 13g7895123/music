# Story 20: 安全性強化

## 📋 基本資訊
- **Story ID**: YMP-020
- **Epic**: 系統完善
- **優先級**: Must Have (P0)
- **預估點數**: 10 points
- **預估時間**: 2-3 天
- **依賴關係**: Story 19
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 系統管理員和用戶  
**我希望** 應用程式具有完善的安全防護機制  
**以便** 保護用戶資料和系統免受攻擊

## 📝 詳細需求

### 核心功能需求
1. **輸入驗證**: 防止SQL注入、XSS攻擊
2. **認證安全**: 強化JWT和Session安全
3. **API安全**: Rate limiting、CORS、CSRF防護
4. **資料加密**: 敏感資料加密存儲
5. **安全標頭**: 完整的HTTP安全標頭

### 技術規格

**輸入驗證和清理**:
```typescript
// backend/src/middleware/validation.middleware.ts
import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import DOMPurify from 'isomorphic-dompurify'
import { AppError } from './error.middleware'

// 通用驗證中介軟體
export const validateRequest = (schema: {
  body?: Joi.ObjectSchema
  query?: Joi.ObjectSchema
  params?: Joi.ObjectSchema
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = []

    // 驗證請求體
    if (schema.body) {
      const { error } = schema.body.validate(req.body)
      if (error) {
        errors.push(`Body: ${error.details.map(d => d.message).join(', ')}`)
      } else {
        // 清理HTML標籤
        req.body = sanitizeObject(req.body)
      }
    }

    // 驗證查詢參數
    if (schema.query) {
      const { error } = schema.query.validate(req.query)
      if (error) {
        errors.push(`Query: ${error.details.map(d => d.message).join(', ')}`)
      }
    }

    // 驗證路徑參數
    if (schema.params) {
      const { error } = schema.params.validate(req.params)
      if (error) {
        errors.push(`Params: ${error.details.map(d => d.message).join(', ')}`)
      }
    }

    if (errors.length > 0) {
      throw new AppError(`Validation failed: ${errors.join('; ')}`, 400, 'VALIDATION_ERROR')
    }

    next()
  }
}

// 清理物件中的HTML
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return DOMPurify.sanitize(obj, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    })
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value)
    }
    return sanitized
  }
  
  return obj
}

// 常用驗證規則
export const validationSchemas = {
  // 用戶註冊
  userRegistration: {
    body: Joi.object({
      email: Joi.string().email().max(255).required(),
      password: Joi.string()
        .min(8)
        .max(128)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
          'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
        }),
      nickname: Joi.string().min(2).max(50).required(),
      confirmPassword: Joi.string().valid(Joi.ref('password')).required()
    })
  },

  // 用戶登入
  userLogin: {
    body: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
      rememberMe: Joi.boolean().default(false)
    })
  },

  // 播放清單
  playlist: {
    body: Joi.object({
      name: Joi.string().min(1).max(100).required(),
      description: Joi.string().max(500).allow('').optional(),
      isPublic: Joi.boolean().default(false)
    })
  },

  // YouTube URL
  youtubeUrl: {
    body: Joi.object({
      url: Joi.string()
        .pattern(/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//)
        .required()
        .messages({
          'string.pattern.base': 'Must be a valid YouTube URL'
        })
    })
  }
}
```

**增強的JWT安全**:
```typescript
// backend/src/utils/jwt.ts
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { logger } from './logger'

interface JwtPayload {
  userId: number
  email: string
  sessionId: string
  iat?: number
  exp?: number
}

export class JwtService {
  private readonly accessTokenSecret: string
  private readonly refreshTokenSecret: string
  private readonly accessTokenExpiry: string
  private readonly refreshTokenExpiry: string

  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET + this.getSecretSalt()
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET + this.getSecretSalt()
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m'
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d'
  }

  private getSecretSalt(): string {
    // 添加額外的熵
    return crypto.createHash('sha256')
      .update(process.env.NODE_ENV + process.env.DATABASE_URL)
      .digest('hex')
      .substring(0, 16)
  }

  generateTokens(payload: Omit<JwtPayload, 'sessionId' | 'iat' | 'exp'>) {
    const sessionId = crypto.randomUUID()
    const jwtPayload = { ...payload, sessionId }

    const accessToken = jwt.sign(jwtPayload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'mytune-app',
      audience: 'mytune-users',
      algorithm: 'HS256'
    })

    const refreshToken = jwt.sign(
      { userId: payload.userId, sessionId },
      this.refreshTokenSecret,
      {
        expiresIn: this.refreshTokenExpiry,
        issuer: 'mytune-app',
        audience: 'mytune-users',
        algorithm: 'HS256'
      }
    )

    return {
      accessToken,
      refreshToken,
      sessionId,
      expiresIn: this.parseExpiry(this.accessTokenExpiry)
    }
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.accessTokenSecret, {
        issuer: 'mytune-app',
        audience: 'mytune-users',
        algorithms: ['HS256']
      }) as JwtPayload
    } catch (error) {
      logger.warn('Invalid access token:', { error: error.message })
      throw new Error('Invalid access token')
    }
  }

  verifyRefreshToken(token: string): Pick<JwtPayload, 'userId' | 'sessionId'> {
    try {
      return jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'mytune-app',
        audience: 'mytune-users',
        algorithms: ['HS256']
      }) as Pick<JwtPayload, 'userId' | 'sessionId'>
    } catch (error) {
      logger.warn('Invalid refresh token:', { error: error.message })
      throw new Error('Invalid refresh token')
    }
  }

  private parseExpiry(expiry: string): number {
    const matches = expiry.match(/^(\d+)([smhd])$/)
    if (!matches) return 900 // 預設15分鐘

    const value = parseInt(matches[1])
    const unit = matches[2]

    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 }
    return value * multipliers[unit as keyof typeof multipliers]
  }
}

export const jwtService = new JwtService()
```

**安全中介軟體集合**:
```typescript
// backend/src/middleware/security.middleware.ts
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import cors from 'cors'
import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

// Rate Limiting配置
export const createRateLimiter = (options: {
  windowMs: number
  max: number
  message?: string
  skipSuccessfulRequests?: boolean
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: options.message || 'Too many requests, please try again later'
    },
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded:', {
        ip: req.ip,
        url: req.url,
        userAgent: req.get('user-agent')
      })
      
      res.status(429).json({
        success: false,
        error: {
          message: options.message || 'Too many requests, please try again later',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.round(options.windowMs / 1000)
        }
      })
    }
  })
}

// 不同端點的限制配置
export const rateLimiters = {
  // 一般API限制
  general: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15分鐘
    max: 100, // 每個IP最多100次請求
    skipSuccessfulRequests: true
  }),

  // 認證API嚴格限制
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15分鐘
    max: 5, // 每個IP最多5次嘗試
    message: 'Too many authentication attempts, please try again later'
  }),

  // 密碼重設極嚴格限制
  passwordReset: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1小時
    max: 3, // 每個IP最多3次嘗試
    message: 'Too many password reset attempts, please try again later'
  })
}

// CORS配置
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173']
    
    // 允許沒有origin的請求（例如移動應用）
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      logger.warn('CORS blocked request from origin:', origin)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control'
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400 // 預檢請求快取24小時
}

// Helmet安全標頭配置
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "https://www.youtube.com", "https://s.ytimg.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https://www.youtube.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https://www.youtube.com"],
      frameSrc: ["'self'", "https://www.youtube.com"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false, // YouTube iframe需要
  hsts: {
    maxAge: 31536000, // 1年
    includeSubDomains: true,
    preload: true
  }
}

// IP白名單中介軟體
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress
    
    if (allowedIPs.includes(clientIP!)) {
      next()
    } else {
      logger.warn('IP not in whitelist:', clientIP)
      res.status(403).json({
        success: false,
        error: {
          message: 'Access denied',
          code: 'IP_NOT_ALLOWED'
        }
      })
    }
  }
}

// 請求大小限制
export const requestSizeLimit = (limit: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('content-length')
    const maxSize = parseSize(limit)
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return res.status(413).json({
        success: false,
        error: {
          message: 'Request entity too large',
          code: 'REQUEST_TOO_LARGE'
        }
      })
    }
    
    next()
  }
}

function parseSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  }
  
  const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/)
  if (!match) return 10 * 1024 * 1024 // 預設10MB
  
  const value = parseInt(match[1])
  const unit = match[2]
  
  return value * units[unit]
}
```

**資料加密服務**:
```typescript
// backend/src/utils/encryption.ts
import crypto from 'crypto'
import bcrypt from 'bcrypt'

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly keyLength = 32
  private readonly ivLength = 16
  private readonly tagLength = 16
  private readonly saltRounds = 12

  private getEncryptionKey(): Buffer {
    const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key'
    return crypto.scryptSync(secret, 'salt', this.keyLength)
  }

  // 加密敏感資料
  encrypt(text: string): string {
    const key = this.getEncryptionKey()
    const iv = crypto.randomBytes(this.ivLength)
    
    const cipher = crypto.createCipher(this.algorithm, key)
    cipher.setAAD(Buffer.from('mytune-app'))
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    // 組合 IV + encrypted + tag
    return iv.toString('hex') + ':' + encrypted + ':' + tag.toString('hex')
  }

  // 解密敏感資料
  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format')
    }

    const key = this.getEncryptionKey()
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    const tag = Buffer.from(parts[2], 'hex')

    const decipher = crypto.createDecipher(this.algorithm, key)
    decipher.setAAD(Buffer.from('mytune-app'))
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  // 密碼雜湊
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds)
  }

  // 驗證密碼
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  // 生成安全的隨機字串
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  // 生成API密鑰
  generateApiKey(): string {
    const timestamp = Date.now().toString()
    const random = crypto.randomBytes(16).toString('hex')
    return `mtk_${timestamp}_${random}`
  }
}

export const encryptionService = new EncryptionService()
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `backend/src/middleware/validation.middleware.ts` - 輸入驗證中介軟體
- `backend/src/middleware/security.middleware.ts` - 安全中介軟體集合
- `backend/src/utils/jwt.ts` - 增強JWT服務
- `backend/src/utils/encryption.ts` - 加密服務
- `backend/src/utils/security.ts` - 安全工具函數

**更新檔案**:
- `backend/src/app.ts` - 整合安全中介軟體
- `backend/src/routes/auth.ts` - 應用安全驗證
- `backend/package.json` - 添加安全相關依賴

## ✅ 驗收條件

### 安全性驗收
- [ ] 所有輸入都經過驗證和清理
- [ ] 密碼使用強雜湊算法存儲
- [ ] JWT token安全機制完善
- [ ] API具有適當的Rate limiting
- [ ] HTTP安全標頭配置正確

### 防護驗收
- [ ] XSS攻擊防護有效
- [ ] SQL注入防護有效
- [ ] CSRF攻擊防護有效
- [ ] 暴力破解攻擊防護有效
- [ ] 敏感資料加密存儲

### 合規驗收
- [ ] OWASP Top 10安全風險已處理
- [ ] 安全掃描工具無高風險警告
- [ ] 滲透測試通過
- [ ] 安全審計記錄完整

## 🚀 實作指引

### Step 1: 實作輸入驗證
建立完整的輸入驗證和清理機制

### Step 2: 加強認證安全
增強JWT和Session安全機制

### Step 3: 配置安全中介軟體
設置Rate limiting、CORS、Helmet等

### Step 4: 實作資料加密
為敏感資料添加加密保護

## 📊 預期成果
- ✅ 完善的安全防護機制
- ✅ 符合行業安全標準
- ✅ 有效防護常見攻擊
- ✅ 安全的資料處理
- ✅ 完整的安全審計追蹤