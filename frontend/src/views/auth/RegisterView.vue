<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <h1>註冊 MyTune</h1>
        <p>創建您的帳號，開始享受音樂</p>
      </div>

      <form @submit.prevent="handleRegister" class="auth-form">
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
          <label for="nickname">暱稱</label>
          <input
            id="nickname"
            v-model="form.nickname"
            type="text"
            required
            :class="{ 'error': errors.nickname }"
            placeholder="請輸入您的暱稱"
            :disabled="isLoading"
          />
          <span v-if="errors.nickname" class="error-message">{{ errors.nickname }}</span>
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
          <div class="password-strength">
            <div class="strength-meter">
              <div :class="['strength-bar', passwordStrengthClass]" :style="{ width: passwordStrengthWidth }"></div>
            </div>
            <span :class="['strength-text', passwordStrengthClass]">{{ passwordStrengthText }}</span>
          </div>
        </div>

        <div class="form-group">
          <label for="confirmPassword">確認密碼</label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            :type="showConfirmPassword ? 'text' : 'password'"
            required
            :class="{ 'error': errors.confirmPassword }"
            placeholder="請再次輸入您的密碼"
            :disabled="isLoading"
          />
          <button
            type="button"
            class="password-toggle"
            @click="showConfirmPassword = !showConfirmPassword"
            :disabled="isLoading"
          >
            <span v-if="showConfirmPassword">👁️</span>
            <span v-else>🙈</span>
          </button>
          <span v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</span>
        </div>

        <div class="form-group">
          <label class="checkbox">
            <input 
              type="checkbox" 
              v-model="form.agreeToTerms" 
              :disabled="isLoading"
            />
            <span>我同意 <a href="/terms" target="_blank" class="link">服務條款</a> 和 <a href="/privacy" target="_blank" class="link">隱私政策</a></span>
          </label>
          <span v-if="errors.agreeToTerms" class="error-message">{{ errors.agreeToTerms }}</span>
        </div>

        <button
          type="submit"
          :disabled="isLoading || !form.agreeToTerms"
          class="btn-primary"
        >
          <span v-if="isLoading" class="loading-spinner"></span>
          {{ isLoading ? '註冊中...' : '註冊' }}
        </button>

        <div v-if="error" class="error-alert">
          {{ error }}
        </div>
      </form>

      <div class="auth-footer">
        <p>已經有帳號？
          <router-link to="/auth/login">立即登入</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  email: '',
  nickname: '',
  password: '',
  confirmPassword: '',
  agreeToTerms: false
})

const errors = reactive({
  email: '',
  nickname: '',
  password: '',
  confirmPassword: '',
  agreeToTerms: ''
})

const isLoading = ref(false)
const error = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// 密碼強度計算
const passwordStrength = computed(() => {
  const password = form.password
  let score = 0
  
  if (password.length >= 8) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  
  return score
})

const passwordStrengthText = computed(() => {
  const strength = passwordStrength.value
  if (strength <= 1) return '弱'
  if (strength <= 3) return '中等'
  return '強'
})

const passwordStrengthClass = computed(() => {
  const strength = passwordStrength.value
  if (strength <= 1) return 'weak'
  if (strength <= 3) return 'medium'
  return 'strong'
})

const passwordStrengthWidth = computed(() => {
  return `${(passwordStrength.value / 5) * 100}%`
})

const validateForm = () => {
  // 清除之前的錯誤
  Object.keys(errors).forEach(key => {
    errors[key as keyof typeof errors] = ''
  })

  let isValid = true

  // 電子郵件驗證
  if (!form.email) {
    errors.email = '請輸入電子郵件'
    isValid = false
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = '請輸入有效的電子郵件格式'
    isValid = false
  }

  // 暱稱驗證
  if (!form.nickname) {
    errors.nickname = '請輸入暱稱'
    isValid = false
  } else if (form.nickname.length < 2) {
    errors.nickname = '暱稱至少需要2個字符'
    isValid = false
  } else if (form.nickname.length > 50) {
    errors.nickname = '暱稱不能超過50個字符'
    isValid = false
  }

  // 密碼驗證
  if (!form.password) {
    errors.password = '請輸入密碼'
    isValid = false
  } else if (form.password.length < 8) {
    errors.password = '密碼長度至少8個字符'
    isValid = false
  } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).+$/.test(form.password)) {
    errors.password = '密碼必須包含大小寫字母、數字和特殊字符'
    isValid = false
  }

  // 確認密碼驗證
  if (!form.confirmPassword) {
    errors.confirmPassword = '請確認密碼'
    isValid = false
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = '兩次輸入的密碼不一致'
    isValid = false
  }

  // 服務條款驗證
  if (!form.agreeToTerms) {
    errors.agreeToTerms = '請同意服務條款和隱私政策'
    isValid = false
  }

  return isValid
}

const handleRegister = async () => {
  if (!validateForm()) return

  isLoading.value = true
  error.value = ''

  try {
    await authStore.register({
      email: form.email,
      nickname: form.nickname,
      password: form.password,
      confirmPassword: form.confirmPassword,
      agreeToTerms: form.agreeToTerms
    })

    // 註冊成功後導向首頁
    router.push('/dashboard')
  } catch (err: any) {
    error.value = err.message || '註冊失敗，請稍後再試'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.auth-container {
  @apply min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center px-4 py-8;
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
  @apply space-y-2 relative;
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

.password-strength {
  @apply mt-2 space-y-1;
}

.strength-meter {
  @apply w-full h-2 bg-gray-200 rounded-full overflow-hidden;
}

.strength-bar {
  @apply h-full transition-all duration-300;
}

.strength-bar.weak {
  @apply bg-red-500;
}

.strength-bar.medium {
  @apply bg-yellow-500;
}

.strength-bar.strong {
  @apply bg-green-500;
}

.strength-text {
  @apply text-xs font-medium;
}

.strength-text.weak {
  @apply text-red-600;
}

.strength-text.medium {
  @apply text-yellow-600;
}

.strength-text.strong {
  @apply text-green-600;
}

.error-message {
  @apply text-red-500 text-sm;
}

.checkbox {
  @apply flex items-start space-x-2 cursor-pointer;
}

.checkbox input {
  @apply w-auto mt-1;
}

.link {
  @apply text-blue-600 hover:text-blue-800 underline;
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