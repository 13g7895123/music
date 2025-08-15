export interface User {
  id: number
  email: string
  nickname: string
  password: string
  isActive: boolean
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterData {
  email: string
  password: string
  confirmPassword: string
  nickname: string
}

export interface AuthResponse {
  success: boolean
  data: {
    user: Omit<User, 'password'>
    accessToken: string
    refreshToken: string
    expiresIn: number
  }
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface SessionData {
  userId: number
  email: string
  nickname: string
  tokenId: string
  createdAt: string
}

export interface JWTConfig {
  secret: string
  refreshSecret: string
  expiresIn: string
  refreshExpiresIn: string
}

export interface TokenBlacklist {
  tokenId: string
  userId: number
  revokedAt: Date
  reason: string
}