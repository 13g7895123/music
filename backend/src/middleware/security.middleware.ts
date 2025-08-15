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
  }),

  // 註冊限制
  register: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1小時
    max: 10, // 每個IP最多10次註冊嘗試
    message: 'Too many registration attempts, please try again later'
  }),

  // API調用限制
  api: createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1分鐘
    max: 30, // 每個IP每分鐘最多30次API調用
    skipSuccessfulRequests: true
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
  },
  referrerPolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  ieNoOpen: true,
  noSniff: true,
  xssFilter: true
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

// CSRF保護中介軟體
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // 檢查不安全的HTTP方法
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const token = req.headers['x-csrf-token'] || req.body._token
    const origin = req.get('origin')
    const referer = req.get('referer')
    
    // 檢查Origin或Referer標頭
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173']
    
    if (!origin && !referer) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Missing origin or referer header',
          code: 'CSRF_PROTECTION_VIOLATION'
        }
      })
    }
    
    const sourceUrl = origin || referer
    const isAllowedOrigin = allowedOrigins.some(allowedOrigin => 
      sourceUrl?.startsWith(allowedOrigin)
    )
    
    if (!isAllowedOrigin) {
      logger.warn('CSRF protection triggered:', {
        origin,
        referer,
        ip: req.ip,
        url: req.url
      })
      
      return res.status(403).json({
        success: false,
        error: {
          message: 'CSRF protection violation',
          code: 'CSRF_PROTECTION_VIOLATION'
        }
      })
    }
  }
  
  next()
}

// 安全標頭中介軟體
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // 安全標頭
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'same-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  // 移除可能透露敏感資訊的標頭
  res.removeHeader('X-Powered-By')
  res.removeHeader('Server')
  
  next()
}

// 可疑行為檢測
export const suspiciousActivityDetection = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get('user-agent') || ''
  const ip = req.ip
  
  // 檢查可疑的User-Agent
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /openvas/i,
    /nmap/i,
    /masscan/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
    /^$/  // 空User-Agent
  ]
  
  const isSuspiciousUA = suspiciousPatterns.some(pattern => pattern.test(userAgent))
  
  if (isSuspiciousUA) {
    logger.warn('Suspicious user agent detected:', {
      userAgent,
      ip,
      url: req.url,
      method: req.method
    })
    
    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied',
        code: 'SUSPICIOUS_ACTIVITY'
      }
    })
  }
  
  // 檢查可疑的路徑
  const suspiciousUrls = [
    /wp-admin/i,
    /wp-login/i,
    /admin/i,
    /phpmyadmin/i,
    /\.php$/i,
    /\.asp$/i,
    /\.jsp$/i,
    /\.\./,  // 目錄遍歷
    /<script/i,  // XSS嘗試
    /union.*select/i,  // SQL注入嘗試
    /%27/,  // SQL注入嘗試 (')
    /%22/   // SQL注入嘗試 (")
  ]
  
  const isSuspiciousUrl = suspiciousUrls.some(pattern => pattern.test(req.url))
  
  if (isSuspiciousUrl) {
    logger.warn('Suspicious URL pattern detected:', {
      url: req.url,
      ip,
      userAgent
    })
    
    return res.status(404).json({
      success: false,
      error: {
        message: 'Resource not found',
        code: 'NOT_FOUND'
      }
    })
  }
  
  next()
}

// HTTP參數污染防護
export const httpParameterPollutionProtection = (req: Request, res: Response, next: NextFunction) => {
  // 檢查重複的查詢參數
  for (const [key, value] of Object.entries(req.query)) {
    if (Array.isArray(value) && value.length > 10) {
      logger.warn('Potential HTTP parameter pollution:', {
        key,
        count: value.length,
        ip: req.ip
      })
      
      return res.status(400).json({
        success: false,
        error: {
          message: 'Too many parameter values',
          code: 'PARAMETER_POLLUTION'
        }
      })
    }
  }
  
  next()
}

// 慢速攻擊防護
export const slowAttackProtection = (req: Request, res: Response, next: NextFunction) => {
  const timeout = 30000 // 30秒超時
  
  const timer = setTimeout(() => {
    logger.warn('Request timeout - potential slow attack:', {
      ip: req.ip,
      url: req.url,
      userAgent: req.get('user-agent')
    })
    
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        error: {
          message: 'Request timeout',
          code: 'REQUEST_TIMEOUT'
        }
      })
    }
  }, timeout)
  
  res.on('finish', () => {
    clearTimeout(timer)
  })
  
  next()
}