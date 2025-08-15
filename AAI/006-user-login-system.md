# Story 6: 用戶登入系統

## 📋 基本資訊
- **Story ID**: YMP-006
- **Epic**: 身份驗證系統
- **優先級**: Must Have (P0)
- **預估點數**: 5 points
- **預估時間**: 1 天
- **依賴關係**: Story 4, Story 5
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 註冊用戶  
**我希望** 能夠登入我的帳號  
**以便** 存取我的個人播放清單和設定

## 📝 詳細需求

### 核心功能需求
1. **登入驗證**: 使用電子郵件和密碼登入
2. **JWT Token生成**: 成功登入後生成存取和刷新Token
3. **錯誤處理**: 提供清楚的錯誤訊息
4. **安全性**: 密碼錯誤次數限制和帳號鎖定
5. **Session管理**: 管理用戶會話狀態

### 技術規格

**API端點設計**:
```typescript
// backend/src/routes/auth.ts
import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { AppError } from '../middleware/error.middleware'

const router = Router()

// 登入限流：每15分鐘最多5次嘗試
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many login attempts, please try again later'
  },
  skipSuccessfulRequests: true
})

// 用戶登入
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body

    // 輸入驗證
    if (!email || !password) {
      throw new AppError('Email and password are required', 400)
    }

    // 查找用戶
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        nickname: true,
        isActive: true,
        loginAttempts: true,
        lastLoginAttempt: true
      }
    })

    if (!user) {
      throw new AppError('Invalid email or password', 401)
    }

    // 檢查帳號狀態
    if (!user.isActive) {
      throw new AppError('Account is disabled', 401)
    }

    // 檢查登入嘗試次數
    const maxAttempts = 5
    const lockoutTime = 30 * 60 * 1000 // 30分鐘

    if (user.loginAttempts >= maxAttempts) {
      const timeSinceLastAttempt = Date.now() - user.lastLoginAttempt.getTime()
      if (timeSinceLastAttempt < lockoutTime) {
        throw new AppError('Account temporarily locked due to too many failed attempts', 423)
      }
    }

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

    if (!isPasswordValid) {
      // 更新失敗嘗試次數
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: user.loginAttempts + 1,
          lastLoginAttempt: new Date()
        }
      })
      throw new AppError('Invalid email or password', 401)
    }

    // 重置登入嘗試次數
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lastLoginAt: new Date(),
        lastLoginAttempt: new Date()
      }
    })

    // 生成JWT tokens
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    )

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    )

    // 儲存refresh token到資料庫
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天
      }
    })

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    })

  } catch (error) {
    next(error)
  }
})

export default router
```

**資料庫Schema更新**:
```sql
-- 新增登入相關欄位到 users 表
ALTER TABLE users ADD COLUMN login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_login_attempt TIMESTAMP;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;

-- 建立sessions表管理refresh tokens
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `backend/src/routes/auth.ts` - 認證相關路由
- `backend/src/middleware/auth.middleware.ts` - JWT驗證中介軟體
- `backend/src/services/auth.service.ts` - 認證業務邏輯
- `backend/prisma/migrations/` - 資料庫遷移檔案

**更新檔案**:
- `backend/src/app.ts` - 註冊認證路由
- `backend/prisma/schema.prisma` - 更新資料模型

## ✅ 驗收條件

### 功能驗收
- [ ] 用戶可使用正確的帳號密碼成功登入
- [ ] 登入成功後獲得有效的JWT tokens
- [ ] 錯誤的密碼返回適當的錯誤訊息
- [ ] 不存在的帳號返回適當的錯誤訊息
- [ ] 連續錯誤登入會觸發帳號暫時鎖定

### 安全性驗收
- [ ] 密碼不會在回應中洩露
- [ ] JWT token包含正確的用戶資訊
- [ ] Refresh token安全儲存在資料庫
- [ ] 登入頻率限制正常運作
- [ ] 帳號鎖定機制正常運作

### API驗收
- [ ] `/api/auth/login` 端點正常運作
- [ ] 回應格式符合API規範
- [ ] 適當的HTTP狀態碼
- [ ] 完整的錯誤處理

## 🚀 實作指引

### Step 1: 更新資料庫Schema
```bash
cd backend
npx prisma migrate dev --name add-login-fields
```

### Step 2: 實作認證服務
```bash
npm install bcrypt jsonwebtoken
npm install -D @types/bcrypt @types/jsonwebtoken
```

### Step 3: 建立認證路由和中介軟體
按照技術規格建立相關檔案

### Step 4: 測試登入功能
```bash
npm run test:auth
```

## 📊 預期成果
- ✅ 安全的用戶登入系統
- ✅ JWT token認證機制
- ✅ 帳號安全保護
- ✅ 完整的錯誤處理
- ✅ Session管理機制