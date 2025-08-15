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
            :disabled="isLoading"
          />
          <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
        </div>

        <div class="form-group">
          <label for="password">密碼</label>
          <div class="password-input-wrapper">
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              required
              :class="{ 'error': errors.password }"
              placeholder="請輸入您的密碼"
              :disabled="isLoading"
            />
            <button
              type="button"
              class="password-toggle"
              @click="showPassword = !showPassword"
              :disabled="isLoading"
            >
              <span v-if="showPassword">👁️</span>
              <span v-else>🙈</span>
            </button>
          </div>
          <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
        </div>

        <div class="form-options">
          <label class="checkbox">
            <input 
              type="checkbox" 
              v-model="form.rememberMe" 
              :disabled="isLoading"
            />
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

<style scoped>
.auth-container {
  @apply min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8;
}

.auth-card {
  @apply bg-white rounded-2xl shadow-xl p-8 w-full max-w-md;
}

.auth-header {
  @apply text-center mb-8;
}

.auth-header h1 {
  @apply text-3xl font-bold text-gray-900 mb-2;
}

.auth-header p {
  @apply text-gray-600;
}

.auth-form {
  @apply space-y-6;
}

.form-group {
  @apply space-y-2;
}

.form-group label {
  @apply block text-sm font-medium text-gray-700;
}

.form-group input {
  @apply w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors;
}

.form-group input.error {
  @apply border-red-500 focus:ring-red-500;
}

.form-group input:disabled {
  @apply bg-gray-100 cursor-not-allowed;
}

.password-input-wrapper {
  @apply relative;
}

.password-toggle {
  @apply absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none;
}

.error-message {
  @apply text-red-500 text-sm;
}

.form-options {
  @apply flex items-center justify-between;
}

.checkbox {
  @apply flex items-center space-x-2 cursor-pointer;
}

.checkbox input {
  @apply w-auto;
}

.forgot-password {
  @apply text-blue-600 hover:text-blue-800 text-sm;
}

.btn-primary {
  @apply w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2;
}

.loading-spinner {
  @apply w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin;
}

.error-alert {
  @apply bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg;
}

.auth-footer {
  @apply text-center mt-8 pt-6 border-t border-gray-200;
}

.auth-footer p {
  @apply text-gray-600;
}

.auth-footer a {
  @apply text-blue-600 hover:text-blue-800 font-medium;
}
</style>