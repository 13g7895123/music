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

  if (error instanceof AppError) {
    statusCode = error.statusCode
    message = error.message
  }

  logger.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  })

  res.status(statusCode).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  })
}