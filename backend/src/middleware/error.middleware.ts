import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export class AppError extends Error {
  statusCode: number
  isOperational: boolean
  code: string

  constructor(message: string, statusCode: number, code?: string) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    this.code = code || 'UNKNOWN_ERROR'
  }
}

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500
  let message = 'Internal server error'
  let code = 'INTERNAL_SERVER_ERROR'

  // 處理不同類型的錯誤
  if (error instanceof AppError) {
    statusCode = error.statusCode
    message = error.message
    code = error.code
  } else if (error.name === 'ValidationError') {
    statusCode = 400
    message = '輸入資料驗證失敗'
    code = 'VALIDATION_ERROR'
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401
    message = '無效的認證令牌'
    code = 'AUTHENTICATION_ERROR'
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401
    message = '認證令牌已過期'
    code = 'TOKEN_EXPIRED'
  } else if (error.message.includes('ECONNREFUSED')) {
    statusCode = 503
    message = '資料庫連線失敗'
    code = 'DATABASE_CONNECTION_ERROR'
  } else if (error.name === 'CastError') {
    statusCode = 400
    message = '無效的資料格式'
    code = 'INVALID_DATA_FORMAT'
  } else if (error.name === 'MongoError' && (error as any).code === 11000) {
    statusCode = 409
    message = '資料已存在'
    code = 'DUPLICATE_ENTRY'
  }

  // 記錄錯誤
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString(),
    code,
    body: req.body,
    params: req.params,
    query: req.query
  }

  if (statusCode >= 500) {
    logger.error('Server Error:', errorInfo)
  } else {
    logger.warn('Client Error:', errorInfo)
  }

  // 在開發環境返回詳細錯誤資訊
  const isDevelopment = process.env.NODE_ENV === 'development'

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      timestamp: new Date().toISOString(),
      ...(isDevelopment && {
        stack: error.stack,
        details: errorInfo
      })
    }
  })
}

// 錯誤記錄API
export const logError = async (req: Request, res: Response) => {
  try {
    const errorData = req.body
    
    // 記錄前端錯誤
    logger.error('Frontend Error:', {
      ...errorData,
      ip: req.ip,
      serverTimestamp: new Date().toISOString()
    })

    res.json({ success: true, message: 'Error logged successfully' })
  } catch (error) {
    logger.error('Failed to log frontend error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to log error' 
    })
  }
}

// 404處理
export const notFoundHandler = (req: Request, res: Response) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND')
  res.status(404).json({
    success: false,
    error: {
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    }
  })
}

// 請求驗證錯誤
export const validationError = (message: string) => {
  return new AppError(message, 400, 'VALIDATION_ERROR')
}

// 認證錯誤
export const authenticationError = (message: string = 'Authentication required') => {
  return new AppError(message, 401, 'AUTHENTICATION_ERROR')
}

// 權限錯誤
export const permissionError = (message: string = 'Permission denied') => {
  return new AppError(message, 403, 'PERMISSION_DENIED')
}

// 資源不存在錯誤
export const notFoundError = (message: string = 'Resource not found') => {
  return new AppError(message, 404, 'RESOURCE_NOT_FOUND')
}

// 衝突錯誤
export const conflictError = (message: string = 'Resource conflict') => {
  return new AppError(message, 409, 'RESOURCE_CONFLICT')
}

// 速率限制錯誤
export const rateLimitError = (message: string = 'Too many requests') => {
  return new AppError(message, 429, 'RATE_LIMIT_EXCEEDED')
}

// 服務不可用錯誤
export const serviceUnavailableError = (message: string = 'Service temporarily unavailable') => {
  return new AppError(message, 503, 'SERVICE_UNAVAILABLE')
}