import { Request, Response, NextFunction } from 'express'
import { AppError } from './error.middleware'

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
  req.body.name = name.trim()
  if (description) {
    req.body.description = description.trim()
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

    req.body.name = name.trim()
  }

  if (description !== undefined) {
    if (description !== null && typeof description !== 'string') {
      throw new AppError('Description must be a string or null', 400, 'VALIDATION_ERROR')
    }

    if (description && description.length > 500) {
      throw new AppError('Description must not exceed 500 characters', 400, 'VALIDATION_ERROR')
    }

    if (description) {
      req.body.description = description.trim()
    }
  }

  if (isPublic !== undefined && typeof isPublic !== 'boolean') {
    throw new AppError('isPublic must be a boolean', 400, 'VALIDATION_ERROR')
  }

  next()
}