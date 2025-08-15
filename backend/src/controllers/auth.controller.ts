import { Request, Response } from 'express'
import { UserService } from '../services/user.service'
import { JWTService } from '../services/jwt.service'
import { registerSchema, loginSchema, refreshTokenSchema } from '../schemas/auth.schemas'
import { asyncHandler, AppError } from '../middleware/error.middleware'
import { AuthRequest } from '../middleware/auth.middleware'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const userService = new UserService(prisma)
const jwtService = new JWTService(prisma)

export const register = asyncHandler(async (req: Request, res: Response) => {
  // 驗證輸入資料
  const { error, value } = registerSchema.validate(req.body)
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        message: error.details[0].message,
        code: 'VALIDATION_ERROR'
      }
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

export const login = asyncHandler(async (req: Request, res: Response) => {
  // 驗證輸入資料
  const { error, value } = loginSchema.validate(req.body)
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        message: error.details[0].message,
        code: 'VALIDATION_ERROR'
      }
    })
  }

  const { email, password } = value

  // 查找用戶
  const user = await userService.findUserByEmail(email)
  
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
  }

  // 檢查帳號狀態
  if (!user.isActive) {
    throw new AppError('Account is disabled', 401, 'ACCOUNT_DISABLED')
  }

  // 檢查登入嘗試次數和鎖定狀態
  const maxAttempts = 5
  const lockoutTime = 30 * 60 * 1000 // 30分鐘

  if (user.loginAttempts >= maxAttempts && user.lastLoginAttempt) {
    const timeSinceLastAttempt = Date.now() - user.lastLoginAttempt.getTime()
    if (timeSinceLastAttempt < lockoutTime) {
      const remainingTime = Math.ceil((lockoutTime - timeSinceLastAttempt) / 1000 / 60)
      throw new AppError(`Account temporarily locked. Try again in ${remainingTime} minutes`, 423, 'ACCOUNT_LOCKED')
    }
  }

  // 驗證密碼
  const isPasswordValid = await userService.verifyPassword(password, user.passwordHash)
  
  if (!isPasswordValid) {
    // 更新失敗嘗試次數
    await userService.updateLoginAttempts(user.id, user.loginAttempts + 1)
    
    const remainingAttempts = maxAttempts - (user.loginAttempts + 1)
    if (remainingAttempts > 0) {
      throw new AppError(`Invalid email or password. ${remainingAttempts} attempts remaining`, 401, 'INVALID_CREDENTIALS')
    } else {
      throw new AppError('Account temporarily locked due to too many failed attempts', 423, 'ACCOUNT_LOCKED')
    }
  }

  // 重置登入嘗試次數並更新最後登入時間
  await userService.resetLoginAttempts(user.id)

  // 生成JWT Token
  const tokens = await jwtService.generateTokens(
    user.id,
    user.email,
    user.nickname
  )

  // 回應成功
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      },
      ...tokens
    }
  })
})

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  // 驗證輸入資料
  const { error, value } = refreshTokenSchema.validate(req.body)
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        message: error.details[0].message,
        code: 'VALIDATION_ERROR'
      }
    })
  }

  const { refreshToken: token } = value

  try {
    // 刷新Token
    const tokens = await jwtService.refreshTokens(token)

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens
    })
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN')
  }
})

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.jti) {
    // 撤銷會話
    await jwtService.revokeSession(req.user.jti)
  }

  res.json({
    success: true,
    message: 'Logout successful'
  })
})

export const logoutAll = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.id) {
    // 撤銷所有會話
    await jwtService.revokeAllUserSessions(req.user.id)
  }

  res.json({
    success: true,
    message: 'All sessions logged out successfully'
  })
})

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await userService.findUserById(req.user!.id)
  
  if (!user || !user.isActive) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND')
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        preferences: user.preferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }
  })
})