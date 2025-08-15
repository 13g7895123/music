import { Request, Response, NextFunction } from 'express'
import { JWTService } from '../services/jwt.service'
import { PrismaClient } from '@prisma/client'

export interface AuthRequest extends Request {
  user?: {
    id: number
    email: string
    nickname: string
    jti: string
  }
}

const prisma = new PrismaClient()
const jwtService = new JWTService(prisma)

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authorization token required',
          code: 'MISSING_TOKEN'
        }
      })
      return
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
      res.status(401).json({
        success: false,
        error: {
          message: 'User not found or inactive',
          code: 'USER_NOT_FOUND'
        }
      })
      return
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
      error: {
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      }
    })
  }
}

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next()
    }

    const token = authHeader.substring(7)
    const payload = await jwtService.verifyAccessToken(token)
    
    const user = await prisma.user.findFirst({
      where: {
        id: parseInt(payload.sub),
        isActive: true
      }
    })

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        jti: payload.jti
      }
    }

    next()
  } catch (error) {
    // 選擇性認證失敗時，不返回錯誤，繼續處理請求
    next()
  }
}

export { jwtService }