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
  },

  // 更新用戶資料
  userUpdate: {
    body: Joi.object({
      nickname: Joi.string().min(2).max(50).optional(),
      avatar: Joi.string().uri().optional()
    })
  },

  // 密碼重設
  passwordReset: {
    body: Joi.object({
      email: Joi.string().email().required()
    })
  },

  // 新密碼設定
  passwordUpdate: {
    body: Joi.object({
      token: Joi.string().required(),
      password: Joi.string()
        .min(8)
        .max(128)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
          'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
        }),
      confirmPassword: Joi.string().valid(Joi.ref('password')).required()
    })
  },

  // 播放清單項目
  playlistItem: {
    body: Joi.object({
      youtubeUrl: Joi.string()
        .pattern(/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//)
        .required(),
      title: Joi.string().min(1).max(200).optional(),
      position: Joi.number().integer().min(0).optional()
    })
  },

  // 分頁查詢
  pagination: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      sort: Joi.string().valid('createdAt', 'updatedAt', 'name', 'title').default('createdAt'),
      order: Joi.string().valid('asc', 'desc').default('desc')
    })
  },

  // ID參數驗證
  idParam: {
    params: Joi.object({
      id: Joi.number().integer().min(1).required()
    })
  }
}

// SQL注入防護
export const sanitizeSqlInput = (input: string): string => {
  // 移除可能的SQL注入字元
  return input.replace(/[';\\x00\\n\\r\\x1a]/g, '')
    .replace(/(\s*(union|select|insert|update|delete|drop|create|alter|exec|execute)\s)/gi, '')
    .trim()
}

// XSS防護中介軟體
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  // 清理查詢參數
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = DOMPurify.sanitize(value)
      }
    }
  }

  // 清理路徑參數
  if (req.params) {
    for (const [key, value] of Object.entries(req.params)) {
      if (typeof value === 'string') {
        req.params[key] = DOMPurify.sanitize(value)
      }
    }
  }

  next()
}

// NoSQL注入防護
export const noSqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const containsOperator = (obj: any): boolean => {
    if (typeof obj !== 'object' || obj === null) return false
    
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$')) return true
      if (typeof obj[key] === 'object' && containsOperator(obj[key])) return true
    }
    
    return false
  }

  if (containsOperator(req.body) || containsOperator(req.query)) {
    throw new AppError('Invalid query operators detected', 400, 'NOSQL_INJECTION_ATTEMPT')
  }

  next()
}

// 檔案上傳驗證
export const fileUploadValidation = (allowedTypes: string[], maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) return next()

    const fileType = req.file.mimetype
    const fileSize = req.file.size

    if (!allowedTypes.includes(fileType)) {
      throw new AppError(`File type ${fileType} not allowed`, 400, 'INVALID_FILE_TYPE')
    }

    if (fileSize > maxSize) {
      throw new AppError(`File size ${fileSize} exceeds maximum ${maxSize}`, 400, 'FILE_TOO_LARGE')
    }

    // 檢查檔案內容是否與副檔名一致（基本檢查）
    const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase()
    const expectedType = getExpectedMimeType(fileExtension || '')
    
    if (expectedType && !fileType.includes(expectedType)) {
      throw new AppError('File content does not match extension', 400, 'FILE_TYPE_MISMATCH')
    }

    next()
  }
}

function getExpectedMimeType(extension: string): string | null {
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    txt: 'text/plain'
  }
  
  return mimeTypes[extension] || null
}

// Legacy validation functions for backward compatibility
export const validatePlaylist = (req: Request, res: Response, next: NextFunction) => {
  const { name, description, isPublic } = req.body

  if (!name || typeof name !== 'string') {
    throw new AppError('Playlist name is required and must be a string', 400, 'VALIDATION_ERROR')
  }

  if (name.trim().length < 1 || name.trim().length > 100) {
    throw new AppError('Playlist name must be between 1 and 100 characters', 400, 'VALIDATION_ERROR')
  }

  if (description && typeof description !== 'string') {
    throw new AppError('Description must be a string', 400, 'VALIDATION_ERROR')
  }

  if (description && description.length > 500) {
    throw new AppError('Description must not exceed 500 characters', 400, 'VALIDATION_ERROR')
  }

  if (isPublic !== undefined && typeof isPublic !== 'boolean') {
    throw new AppError('isPublic must be a boolean', 400, 'VALIDATION_ERROR')
  }

  // 清理輸入
  req.body.name = DOMPurify.sanitize(name.trim())
  if (description) {
    req.body.description = DOMPurify.sanitize(description.trim())
  }

  next()
}

export const validatePlaylistUpdate = (req: Request, res: Response, next: NextFunction) => {
  const { name, description, isPublic } = req.body

  // For updates, all fields are optional
  if (name !== undefined) {
    if (typeof name !== 'string') {
      throw new AppError('Playlist name must be a string', 400, 'VALIDATION_ERROR')
    }

    if (name.trim().length < 1 || name.trim().length > 100) {
      throw new AppError('Playlist name must be between 1 and 100 characters', 400, 'VALIDATION_ERROR')
    }

    req.body.name = DOMPurify.sanitize(name.trim())
  }

  if (description !== undefined) {
    if (description !== null && typeof description !== 'string') {
      throw new AppError('Description must be a string or null', 400, 'VALIDATION_ERROR')
    }

    if (description && description.length > 500) {
      throw new AppError('Description must not exceed 500 characters', 400, 'VALIDATION_ERROR')
    }

    if (description) {
      req.body.description = DOMPurify.sanitize(description.trim())
    }
  }

  if (isPublic !== undefined && typeof isPublic !== 'boolean') {
    throw new AppError('isPublic must be a boolean', 400, 'VALIDATION_ERROR')
  }

  next()
}