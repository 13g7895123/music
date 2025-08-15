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

  // 黑名單管理 (可以用Redis實現)
  private blacklistedTokens = new Set<string>()

  blacklistToken(token: string): void {
    try {
      const decoded = jwt.decode(token) as JwtPayload
      if (decoded && decoded.exp) {
        // 只需要保留到token過期
        const expirationTime = decoded.exp * 1000 - Date.now()
        this.blacklistedTokens.add(token)
        
        // 清理過期的黑名單token
        setTimeout(() => {
          this.blacklistedTokens.delete(token)
        }, expirationTime)
      }
    } catch (error) {
      logger.warn('Failed to blacklist token:', { error: error.message })
    }
  }

  isTokenBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token)
  }

  // 生成安全的重設token
  generateResetToken(): { token: string, hash: string, expiresAt: Date } {
    const token = crypto.randomBytes(32).toString('hex')
    const hash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1小時後過期

    return { token, hash, expiresAt }
  }

  // 驗證重設token
  verifyResetToken(token: string, storedHash: string, expiresAt: Date): boolean {
    if (new Date() > expiresAt) {
      return false
    }

    const hash = crypto.createHash('sha256').update(token).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash))
  }
}

export const jwtService = new JwtService()