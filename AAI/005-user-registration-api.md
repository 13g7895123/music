# Story 5: 用戶註冊API開發

## 📋 基本資訊
- **Story ID**: YMP-005
- **Epic**: 身份驗證系統
- **優先級**: Must Have (P0)
- **預估點數**: 8 points
- **預估時間**: 1-2 天
- **依賴關係**: Story 2, Story 3, Story 4
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 新用戶  
**我希望** 能夠註冊個人帳號  
**以便** 使用音樂播放器的個人化功能和播放清單管理

## 📝 詳細需求

### 核心功能需求
1. **用戶註冊**: 郵箱、密碼、暱稱註冊
2. **資料驗證**: 郵箱格式、密碼強度、暱稱長度驗證
3. **重複檢查**: 防止重複郵箱註冊
4. **密碼加密**: bcrypt加密儲存
5. **自動登入**: 註冊成功後自動生成JWT Token

### 技術規格

**輸入驗證Schema**:
```typescript
// backend/src/schemas/auth.schemas.ts
import Joi from 'joi'

export const registerSchema = Joi.object({
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'edu', 'gov', 'tw', 'cn'] } })
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Password confirmation does not match',
      'any.required': 'Password confirmation is required'
    }),
  
  nickname: Joi.string()
    .min(2)
    .max(50)
    .trim()
    .required()
    .messages({
      'string.min': 'Nickname must be at least 2 characters long',
      'string.max': 'Nickname must not exceed 50 characters',
      'any.required': 'Nickname is required'
    }),
  
  agreeToTerms: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must agree to the terms and conditions',
      'any.required': 'Agreement to terms is required'
    })
})
```

**用戶服務實作**:
```typescript
// backend/src/services/user.service.ts
import bcrypt from 'bcrypt'
import { PrismaClient, User } from '@prisma/client'
import { AppError } from '../middleware/error.middleware'
import { logger } from '../utils/logger'

export interface CreateUserData {
  email: string
  password: string
  nickname: string
}

export interface UserResponse {
  id: number
  email: string
  nickname: string
  avatarUrl?: string
  emailVerified: boolean
  createdAt: Date
}

export class UserService {
  private prisma: PrismaClient
  private saltRounds = 12

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async createUser(userData: CreateUserData): Promise<UserResponse> {
    const { email, password, nickname } = userData

    try {
      // 檢查郵箱是否已存在
      const existingUser = await this.prisma.user.findFirst({
        where: { 
          email: {
            equals: email,
            mode: 'insensitive'
          }
        }
      })

      if (existingUser) {
        throw new AppError('Email address is already registered', 409)
      }

      // 檢查暱稱是否已存在
      const existingNickname = await this.prisma.user.findFirst({
        where: { 
          nickname: {
            equals: nickname,
            mode: 'insensitive'
          }
        }
      })

      if (existingNickname) {
        throw new AppError('Nickname is already taken', 409)
      }

      // 加密密碼
      const passwordHash = await bcrypt.hash(password, this.saltRounds)

      // 創建用戶
      const newUser = await this.prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          nickname,
          preferences: {
            theme: 'light',
            language: 'en',
            autoplay: true,
            volume: 0.7
          }
        },
        select: {
          id: true,
          email: true,
          nickname: true,
          avatarUrl: true,
          emailVerified: true,
          createdAt: true
        }
      })

      logger.info(`New user created: ${newUser.email}`, { 
        userId: newUser.id,
        email: newUser.email 
      })

      return newUser
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      
      logger.error('Failed to create user', { 
        email,
        error: error.message 
      })
      
      throw new AppError('Failed to create user account', 500)
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    try {
      return await this.prisma.user.findFirst({
        where: {
          email: {
            equals: email,
            mode: 'insensitive'
          }
        }
      })
    } catch (error) {
      logger.error('Failed to find user by email', { email, error: error.message })
      return null
    }
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword)
    } catch (error) {
      logger.error('Password verification failed', { error: error.message })
      return false
    }
  }
}
```

**註冊控制器**:
```typescript
// backend/src/controllers/auth.controller.ts
import { Request, Response } from 'express'
import { UserService } from '../services/user.service'
import { JWTService } from '../services/jwt.service'
import { registerSchema } from '../schemas/auth.schemas'
import { asyncHandler } from '../middleware/error.middleware'
import { prisma } from '../app'

const userService = new UserService(prisma)
const jwtService = new JWTService(prisma)

export const register = asyncHandler(async (req: Request, res: Response) => {
  // 驗證輸入資料
  const { error, value } = registerSchema.validate(req.body)
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    })
  }

  const { email, password, nickname } = value

  // 創建用戶
  const newUser = await userService.createUser({
    email,
    password,
    nickname
  })

  // 生成JWT Token
  const tokens = await jwtService.generateTokens(
    newUser.id,
    newUser.email,
    newUser.nickname
  )

  // 回應成功
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: newUser,
      ...tokens
    }
  })
})
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `backend/src/schemas/auth.schemas.ts` - 輸入驗證schema
- `backend/src/services/user.service.ts` - 用戶服務
- `backend/src/controllers/auth.controller.ts` - 認證控制器
- `backend/src/routes/auth.routes.ts` - 認證路由

## ✅ 驗收條件

### 功能驗收
- [ ] 用戶可以使用有效的郵箱、密碼、暱稱成功註冊
- [ ] 註冊成功後自動獲得JWT Token
- [ ] 重複郵箱註冊被正確拒絕
- [ ] 重複暱稱註冊被正確拒絕
- [ ] 密碼被安全加密儲存

### 驗證驗收
- [ ] 無效郵箱格式被拒絕
- [ ] 弱密碼被拒絕
- [ ] 密碼確認不匹配被拒絕
- [ ] 暱稱長度限制生效
- [ ] 必須同意條款才能註冊

## 🚀 實作指引

### Step 1: 安裝依賴
```bash
cd backend
npm install joi bcrypt
npm install -D @types/bcrypt
```

### Step 2: 建立驗證檔案
```bash
mkdir -p src/schemas src/controllers
```

### Step 3: 測試註冊功能
```bash
npm run test:auth
```

## 📊 預期成果
- ✅ 安全的用戶註冊系統
- ✅ 完整的輸入驗證
- ✅ 自動JWT Token生成
- ✅ 重複資料檢查
- ✅ 密碼安全加密