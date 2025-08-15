# Story 7: 身份驗證前端介面

## 📋 基本資訊
- **Story ID**: YMP-007
- **Epic**: 身份驗證系統
- **優先級**: Must Have (P0)
- **預估點數**: 8 points
- **預估時間**: 2 天
- **依賴關係**: Story 5, Story 6
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 使用者  
**我希望** 有美觀易用的註冊和登入介面  
**以便** 快速完成帳號註冊和登入流程

## 📝 詳細需求

### 核心功能需求
1. **註冊表單**: 電子郵件、密碼、確認密碼、暱稱
2. **登入表單**: 電子郵件、密碼、記住我
3. **表單驗證**: 即時驗證和錯誤提示
4. **狀態管理**: 登入狀態的全域管理
5. **路由保護**: 需要登入的頁面自動重導向

### 技術規格

**Vue組件結構**:
```vue
<!-- frontend/src/views/auth/LoginView.vue -->
<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <h1>登入 MyTune</h1>
        <p>歡迎回來！請登入您的帳號</p>
      </div>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label for="email">電子郵件</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            :class="{ 'error': errors.email }"
            placeholder="請輸入您的電子郵件"
          />
          <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
        </div>

        <div class="form-group">
          <label for="password">密碼</label>
          <input
            id="password"
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            required
            :class="{ 'error': errors.password }"
            placeholder="請輸入您的密碼"
          />
          <button
            type="button"
            class="password-toggle"
            @click="showPassword = !showPassword"
          >
            <i :class="showPassword ? 'eye-off' : 'eye'"></i>
          </button>
          <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
        </div>

        <div class="form-options">
          <label class="checkbox">
            <input type="checkbox" v-model="form.rememberMe" />
            <span>記住我</span>
          </label>
          <router-link to="/auth/forgot-password" class="forgot-password">
            忘記密碼？
          </router-link>
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="btn-primary"
        >
          <span v-if="isLoading" class="loading-spinner"></span>
          {{ isLoading ? '登入中...' : '登入' }}
        </button>

        <div v-if="error" class="error-alert">
          {{ error }}
        </div>
      </form>

      <div class="auth-footer">
        <p>還沒有帳號？
          <router-link to="/auth/register">立即註冊</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  email: '',
  password: '',
  rememberMe: false
})

const errors = reactive({
  email: '',
  password: ''
})

const isLoading = ref(false)
const error = ref('')
const showPassword = ref(false)

const validateForm = () => {
  errors.email = ''
  errors.password = ''

  if (!form.email) {
    errors.email = '請輸入電子郵件'
    return false
  }

  if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = '請輸入有效的電子郵件格式'
    return false
  }

  if (!form.password) {
    errors.password = '請輸入密碼'
    return false
  }

  if (form.password.length < 6) {
    errors.password = '密碼長度至少6個字符'
    return false
  }

  return true
}

const handleLogin = async () => {
  if (!validateForm()) return

  isLoading.value = true
  error.value = ''

  try {
    await authStore.login({
      email: form.email,
      password: form.password,
      rememberMe: form.rememberMe
    })

    // 登入成功後導向目標頁面或首頁
    const redirect = router.currentRoute.value.query.redirect as string
    router.push(redirect || '/dashboard')
  } catch (err: any) {
    error.value = err.message || '登入失敗，請稍後再試'
  } finally {
    isLoading.value = false
  }
}
</script>
```

**狀態管理 (Pinia Store)**:
```typescript
// frontend/src/stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/services/api'

interface User {
  id: number
  email: string
  nickname: string
}

interface LoginCredentials {
  email: string
  password: string
  rememberMe: boolean
}

interface RegisterData {
  email: string
  password: string
  nickname: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const isLoading = ref(false)

  const isAuthenticated = computed(() => !!user.value && !!accessToken.value)

  // 從localStorage恢復登入狀態
  const initializeAuth = () => {
    const storedToken = localStorage.getItem('accessToken')
    const storedRefreshToken = localStorage.getItem('refreshToken')
    const storedUser = localStorage.getItem('user')

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
      const response = await api.post('/auth/login', credentials)
      const { user: userData, tokens } = response.data.data

      user.value = userData
      accessToken.value = tokens.accessToken
      refreshToken.value = tokens.refreshToken

      // 根據記住我選項決定儲存位置
      if (credentials.rememberMe) {
        localStorage.setItem('accessToken', tokens.accessToken)
        localStorage.setItem('refreshToken', tokens.refreshToken)
        localStorage.setItem('user', JSON.stringify(userData))
      } else {
        sessionStorage.setItem('accessToken', tokens.accessToken)
        sessionStorage.setItem('refreshToken', tokens.refreshToken)
        sessionStorage.setItem('user', JSON.stringify(userData))
      }

      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '登入失敗')
    } finally {
      isLoading.value = false
    }
  }

  // 用戶註冊
  const register = async (data: RegisterData) => {
    isLoading.value = true
    
    try {
      const response = await api.post('/auth/register', data)
      const { user: userData, tokens } = response.data.data

      user.value = userData
      accessToken.value = tokens.accessToken
      refreshToken.value = tokens.refreshToken

      // 註冊後自動儲存到localStorage
      localStorage.setItem('accessToken', tokens.accessToken)
      localStorage.setItem('refreshToken', tokens.refreshToken)
      localStorage.setItem('user', JSON.stringify(userData))

      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '註冊失敗')
    } finally {
      isLoading.value = false
    }
  }

  // 用戶登出
  const logout = async () => {
    try {
      if (refreshToken.value) {
        await api.post('/auth/logout', { refreshToken: refreshToken.value })
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
      const response = await api.post('/auth/refresh', {
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

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    initializeAuth,
    login,
    register,
    logout,
    refreshAccessToken
  }
})
```

**路由保護**:
```typescript
// frontend/src/router/guards.ts
import { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export const authGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  const authStore = useAuthStore()

  if (authStore.isAuthenticated) {
    next()
  } else {
    next({
      path: '/auth/login',
      query: { redirect: to.fullPath }
    })
  }
}

export const guestGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  const authStore = useAuthStore()

  if (authStore.isAuthenticated) {
    next('/dashboard')
  } else {
    next()
  }
}
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `frontend/src/views/auth/LoginView.vue` - 登入頁面
- `frontend/src/views/auth/RegisterView.vue` - 註冊頁面
- `frontend/src/stores/auth.ts` - 認證狀態管理
- `frontend/src/router/guards.ts` - 路由守衛
- `frontend/src/services/api.ts` - API服務
- `frontend/src/components/auth/` - 認證相關組件

**更新檔案**:
- `frontend/src/router/index.ts` - 註冊認證路由
- `frontend/src/main.ts` - 初始化認證狀態

## ✅ 驗收條件

### 功能驗收
- [ ] 註冊表單正常運作並有即時驗證
- [ ] 登入表單正常運作並有即時驗證
- [ ] 記住我功能正常運作
- [ ] 登入狀態在頁面刷新後保持
- [ ] 登出功能正常清除所有狀態

### UI/UX驗收
- [ ] 表單設計美觀且符合現代標準
- [ ] 錯誤訊息清晰明確
- [ ] 載入狀態有適當的視覺回饋
- [ ] 響應式設計在各種螢幕尺寸正常

### 路由驗收
- [ ] 未登入用戶訪問受保護頁面會重導向
- [ ] 已登入用戶訪問認證頁面會重導向到首頁
- [ ] 登入後會導向原本想訪問的頁面

## 🚀 實作指引

### Step 1: 安裝前端依賴
```bash
cd frontend
npm install pinia vue-router axios
npm install -D @types/node
```

### Step 2: 建立認證相關檔案
按照技術規格建立所有相關組件和服務

### Step 3: 配置路由和狀態管理
更新main.ts和router配置

### Step 4: 樣式設計
```bash
npm install tailwindcss @tailwindcss/forms
```

## 📊 預期成果
- ✅ 完整的認證前端介面
- ✅ 安全的狀態管理
- ✅ 路由保護機制
- ✅ 優秀的用戶體驗
- ✅ 響應式設計