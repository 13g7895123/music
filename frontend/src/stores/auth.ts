import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/services/api'

interface User {
  id: number
  email: string
  nickname: string
  avatarUrl?: string | null
  emailVerified: boolean
  createdAt: string
}

interface LoginCredentials {
  email: string
  password: string
  rememberMe: boolean
}

interface RegisterData {
  email: string
  password: string
  confirmPassword: string
  nickname: string
  agreeToTerms: boolean
}

interface AuthResponse {
  success: boolean
  message: string
  data: {
    user: User
    accessToken: string
    refreshToken: string
    expiresIn: number
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const isLoading = ref(false)

  const isAuthenticated = computed(() => !!user.value && !!accessToken.value)

  // 從localStorage恢復登入狀態
  const initializeAuth = () => {
    const storedToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
    const storedRefreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken')
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user')

    if (storedToken && storedUser) {
      accessToken.value = storedToken
      refreshToken.value = storedRefreshToken
      user.value = JSON.parse(storedUser)
    }
  }

  // 用戶登入
  const login = async (credentials: LoginCredentials) => {
    isLoading.value = true
    
    try {
      const response = await api.post<AuthResponse>('/api/auth/login', credentials)
      const { user: userData, accessToken: token, refreshToken: refresh } = response.data.data

      user.value = userData
      accessToken.value = token
      refreshToken.value = refresh

      // 根據記住我選項決定儲存位置
      const storage = credentials.rememberMe ? localStorage : sessionStorage
      
      storage.setItem('accessToken', token)
      storage.setItem('refreshToken', refresh)
      storage.setItem('user', JSON.stringify(userData))

      return response.data
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || '登入失敗'
      throw new Error(errorMessage)
    } finally {
      isLoading.value = false
    }
  }

  // 用戶註冊
  const register = async (data: RegisterData) => {
    isLoading.value = true
    
    try {
      const response = await api.post<AuthResponse>('/api/auth/register', data)
      const { user: userData, accessToken: token, refreshToken: refresh } = response.data.data

      user.value = userData
      accessToken.value = token
      refreshToken.value = refresh

      // 註冊後自動儲存到localStorage
      localStorage.setItem('accessToken', token)
      localStorage.setItem('refreshToken', refresh)
      localStorage.setItem('user', JSON.stringify(userData))

      return response.data
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || '註冊失敗'
      throw new Error(errorMessage)
    } finally {
      isLoading.value = false
    }
  }

  // 用戶登出
  const logout = async () => {
    try {
      if (refreshToken.value) {
        await api.post('/api/auth/logout')
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      user.value = null
      accessToken.value = null
      refreshToken.value = null
      
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      sessionStorage.removeItem('accessToken')
      sessionStorage.removeItem('refreshToken')
      sessionStorage.removeItem('user')
    }
  }

  // Token刷新
  const refreshAccessToken = async () => {
    if (!refreshToken.value) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await api.post('/api/auth/refresh', {
        refreshToken: refreshToken.value
      })

      const { accessToken: newAccessToken } = response.data.data
      accessToken.value = newAccessToken

      // 更新儲存的token
      if (localStorage.getItem('accessToken')) {
        localStorage.setItem('accessToken', newAccessToken)
      } else {
        sessionStorage.setItem('accessToken', newAccessToken)
      }

      return newAccessToken
    } catch (error) {
      // Token刷新失敗，清除所有認證資料
      await logout()
      throw error
    }
  }

  // 獲取用戶資料
  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/auth/profile')
      user.value = response.data.data.user
      return response.data.data.user
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      throw error
    }
  }

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    initializeAuth,
    login,
    register,
    logout,
    refreshAccessToken,
    fetchProfile
  }
})