import bcrypt from 'bcrypt'
import { PrismaClient, User } from '@prisma/client'
import { AppError } from '../middleware/error.middleware'
import { logger } from '../utils/logger'

export interface CreateUserData {
  email: string
  password: string
  nickname: string
}

export interface UserResponse {
  id: number
  email: string
  nickname: string
  avatarUrl?: string | null
  emailVerified: boolean
  createdAt: Date
}

export class UserService {
  private prisma: PrismaClient
  private saltRounds = 12

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async createUser(userData: CreateUserData): Promise<UserResponse> {
    const { email, password, nickname } = userData

    try {
      // 檢查郵箱是否已存在
      const existingUser = await this.prisma.user.findFirst({
        where: { 
          email: {
            equals: email,
            mode: 'insensitive'
          }
        }
      })

      if (existingUser) {
        throw new AppError('Email address is already registered', 409, 'EMAIL_ALREADY_EXISTS')
      }

      // 檢查暱稱是否已存在
      const existingNickname = await this.prisma.user.findFirst({
        where: { 
          nickname: {
            equals: nickname,
            mode: 'insensitive'
          }
        }
      })

      if (existingNickname) {
        throw new AppError('Nickname is already taken', 409, 'NICKNAME_ALREADY_EXISTS')
      }

      // 加密密碼
      const passwordHash = await bcrypt.hash(password, this.saltRounds)

      // 創建用戶
      const newUser = await this.prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          nickname,
          preferences: {
            theme: 'light',
            language: 'en',
            autoplay: true,
            volume: 0.7
          }
        },
        select: {
          id: true,
          email: true,
          nickname: true,
          avatarUrl: true,
          emailVerified: true,
          createdAt: true
        }
      })

      logger.info(`New user created: ${newUser.email}`, { 
        userId: newUser.id,
        email: newUser.email 
      })

      return newUser
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      
      logger.error('Failed to create user', { 
        email,
        error: (error as Error).message 
      })
      
      throw new AppError('Failed to create user account', 500, 'USER_CREATION_FAILED')
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    try {
      return await this.prisma.user.findFirst({
        where: {
          email: {
            equals: email,
            mode: 'insensitive'
          }
        }
      })
    } catch (error) {
      logger.error('Failed to find user by email', { email, error: (error as Error).message })
      return null
    }
  }

  async findUserById(id: number): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id }
      })
    } catch (error) {
      logger.error('Failed to find user by ID', { id, error: (error as Error).message })
      return null
    }
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword)
    } catch (error) {
      logger.error('Password verification failed', { error: (error as Error).message })
      return false
    }
  }

  async updateUserProfile(userId: number, updates: {nickname?: string, avatarUrl?: string}): Promise<UserResponse> {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updates,
        select: {
          id: true,
          email: true,
          nickname: true,
          avatarUrl: true,
          emailVerified: true,
          createdAt: true
        }
      })

      logger.info(`User profile updated: ${updatedUser.email}`, { 
        userId: updatedUser.id 
      })

      return updatedUser
    } catch (error) {
      logger.error('Failed to update user profile', { 
        userId,
        error: (error as Error).message 
      })
      
      throw new AppError('Failed to update user profile', 500, 'PROFILE_UPDATE_FAILED')
    }
  }

  async deactivateUser(userId: number): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { 
          isActive: false,
          updatedAt: new Date()
        }
      })

      logger.info(`User deactivated: ${userId}`)
    } catch (error) {
      logger.error('Failed to deactivate user', { 
        userId,
        error: (error as Error).message 
      })
      
      throw new AppError('Failed to deactivate user', 500, 'USER_DEACTIVATION_FAILED')
    }
  }

  async updateLoginAttempts(userId: number, attempts: number): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          loginAttempts: attempts,
          lastLoginAttempt: new Date()
        }
      })

      logger.warn(`Login attempt recorded for user ${userId}`, { 
        userId,
        attempts 
      })
    } catch (error) {
      logger.error('Failed to update login attempts', { 
        userId,
        error: (error as Error).message 
      })
    }
  }

  async resetLoginAttempts(userId: number): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          loginAttempts: 0,
          lastLoginAt: new Date(),
          lastLoginAttempt: new Date()
        }
      })

      logger.info(`Login attempts reset for user ${userId}`)
    } catch (error) {
      logger.error('Failed to reset login attempts', { 
        userId,
        error: (error as Error).message 
      })
    }
  }
}