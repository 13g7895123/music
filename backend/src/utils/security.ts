import crypto from 'crypto'
import { Request } from 'express'
import { logger } from './logger'

// 安全工具函數集合
export class SecurityUtils {
  // 生成CSP nonce
  static generateCSPNonce(): string {
    return crypto.randomBytes(16).toString('base64')
  }

  // 獲取客戶端IP
  static getClientIP(req: Request): string {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress ||
      '127.0.0.1'
    )
  }

  // 檢查IP是否為私有IP
  static isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/
    ]
    
    return privateRanges.some(range => range.test(ip))
  }

  // 產生安全的檔案名稱
  static generateSecureFilename(originalName: string, maxLength: number = 255): string {
    // 移除路徑分隔符號和危險字元
    const sanitized = originalName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.+/g, '.')
      .replace(/_+/g, '_')
    
    const timestamp = Date.now()
    const random = crypto.randomBytes(4).toString('hex')
    
    const extension = sanitized.split('.').pop() || 'bin'
    const basename = sanitized.replace(/\.[^.]*$/, '').substring(0, maxLength - 20)
    
    return `${basename}_${timestamp}_${random}.${extension}`
  }

  // 驗證檔案類型
  static validateFileType(buffer: Buffer, allowedTypes: string[]): { isValid: boolean, detectedType: string | null } {
    const signatures: Record<string, Buffer[]> = {
      'image/jpeg': [
        Buffer.from([0xFF, 0xD8, 0xFF])
      ],
      'image/png': [
        Buffer.from([0x89, 0x50, 0x4E, 0x47])
      ],
      'image/gif': [
        Buffer.from([0x47, 0x49, 0x46, 0x38])
      ],
      'image/webp': [
        Buffer.from([0x52, 0x49, 0x46, 0x46]) // RIFF
      ],
      'application/pdf': [
        Buffer.from([0x25, 0x50, 0x44, 0x46])
      ],
      'text/plain': [
        // Text files are harder to detect by magic numbers
      ]
    }

    for (const [type, sigs] of Object.entries(signatures)) {
      for (const sig of sigs) {
        if (buffer.subarray(0, sig.length).equals(sig)) {
          return {
            isValid: allowedTypes.includes(type),
            detectedType: type
          }
        }
      }
    }

    return { isValid: false, detectedType: null }
  }

  // 清理使用者輸入
  static sanitizeUserInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // 移除尖括號
      .replace(/javascript:/gi, '') // 移除javascript:
      .replace(/on\w+\s*=/gi, '') // 移除事件處理器
      .substring(0, 1000) // 限制長度
  }

  // 檢查URL是否安全
  static isUrlSafe(url: string): boolean {
    try {
      const urlObj = new URL(url)
      
      // 只允許HTTPS和HTTP
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false
      }
      
      // 檢查是否為內部IP
      const hostname = urlObj.hostname
      if (this.isPrivateIP(hostname)) {
        return false
      }
      
      // 檢查是否為localhost
      if (['localhost', '127.0.0.1', '::1'].includes(hostname)) {
        return false
      }
      
      return true
    } catch {
      return false
    }
  }

  // 生成安全的重定向URL
  static generateSafeRedirectUrl(baseUrl: string, path: string): string {
    try {
      const base = new URL(baseUrl)
      const safePath = path.replace(/[^a-zA-Z0-9/_-]/g, '')
      return new URL(safePath, base).toString()
    } catch {
      return baseUrl
    }
  }

  // 記錄安全事件
  static logSecurityEvent(
    event: string,
    details: Record<string, any>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    const logData = {
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...details
    }

    switch (severity) {
      case 'critical':
      case 'high':
        logger.error('Security Event:', logData)
        break
      case 'medium':
        logger.warn('Security Event:', logData)
        break
      case 'low':
      default:
        logger.info('Security Event:', logData)
        break
    }
  }

  // 檢查請求是否來自機器人
  static isBotRequest(req: Request): boolean {
    const userAgent = req.get('user-agent') || ''
    
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python-requests/i,
      /postman/i
    ]
    
    return botPatterns.some(pattern => pattern.test(userAgent))
  }

  // 產生安全的Cookie選項
  static getSecureCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24小時
      path: '/'
    }
  }

  // 檢查密碼是否在常見密碼列表中
  static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      '123456',
      'password',
      '123456789',
      '12345678',
      '12345',
      '1234567890',
      '1234567',
      'qwerty',
      'abc123',
      'password123',
      'admin',
      'letmein',
      'welcome',
      'monkey',
      'dragon'
    ]
    
    return commonPasswords.includes(password.toLowerCase())
  }

  // 生成安全標頭
  static getSecurityHeaders() {
    return {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'same-origin',
      'Content-Security-Policy': this.generateCSP(),
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    }
  }

  // 生成內容安全政策
  static generateCSP(): string {
    const nonce = this.generateCSPNonce()
    
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: http:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://www.youtube.com",
      "media-src 'self' https://www.youtube.com",
      "object-src 'none'",
      "frame-src 'self' https://www.youtube.com",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join('; ')
  }

  // 檢查請求頻率是否異常
  static checkRequestFrequency(
    ip: string,
    requests: Map<string, number[]>,
    maxRequests: number = 100,
    windowMs: number = 60000
  ): boolean {
    const now = Date.now()
    const userRequests = requests.get(ip) || []
    
    // 清理過期的請求記錄
    const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs)
    
    if (validRequests.length >= maxRequests) {
      return false // 超過頻率限制
    }
    
    // 更新請求記錄
    validRequests.push(now)
    requests.set(ip, validRequests)
    
    return true
  }

  // 生成安全的API回應
  static generateSecureApiResponse<T>(data: T, message: string = 'Success') {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      // 移除敏感資訊
      server: undefined,
      version: undefined
    }
  }

  // 產生錯誤回應（不透露敏感資訊）
  static generateSecureErrorResponse(message: string = 'An error occurred', code?: string) {
    return {
      success: false,
      error: {
        message,
        code: code || 'GENERIC_ERROR',
        timestamp: new Date().toISOString()
      }
    }
  }

  // 驗證JWT token格式
  static isValidJWTFormat(token: string): boolean {
    const parts = token.split('.')
    return parts.length === 3 && parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))
  }

  // 檢查是否為SQL注入嘗試
  static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\'|\")[^\'\"]*(\s+(OR|AND)\s+)+[^\'\"]*(\"|\')/i,
      /(\-\-)|(\#)/,
      /(\bxp_cmdshell\b)/i
    ]
    
    return sqlPatterns.some(pattern => pattern.test(input))
  }
}

export default SecurityUtils