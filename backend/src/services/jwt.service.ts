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

  async verifyRefreshToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret) as JWTPayload
      
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

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyRefreshToken(refreshToken)
    
    // 獲取用戶資訊
    const user = await this.prisma.user.findUnique({
      where: { id: parseInt(payload.sub) }
    })

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive')
    }

    // 撤銷舊的會話
    await this.revokeSession(payload.jti)

    // 生成新的Token對
    return this.generateTokens(user.id, user.email, user.nickname)
  }

  async revokeSession(tokenId: string): Promise<void> {
    await redis.del(`session:${tokenId}`)
  }

  async revokeAllUserSessions(userId: number): Promise<void> {
    const keys = await redis.keys('session:*')
    const sessions = await redis.mget(keys)
    
    const userSessions = keys.filter((key, index) => {
      const session = sessions[index]
      if (session) {
        const sessionData = JSON.parse(session)
        return sessionData.userId === userId
      }
      return false
    })

    if (userSessions.length > 0) {
      await redis.del(...userSessions)
    }
  }
}