<template>
  <div class="home">
    <div class="hero-section">
      <h1 class="text-5xl font-bold text-white mb-4">MyTune</h1>
      <p class="text-xl text-blue-100 mb-8">您的個人 YouTube 音樂播放平台</p>
      
      <div v-if="!isAuthenticated" class="auth-buttons">
        <router-link to="/auth/login" class="btn btn-primary">登入</router-link>
        <router-link to="/auth/register" class="btn btn-secondary">註冊</router-link>
      </div>
      
      <div v-else class="user-welcome">
        <p class="text-blue-100 mb-4">歡迎回來，{{ user?.nickname }}！</p>
        <router-link to="/dashboard" class="btn btn-primary">進入控制台</router-link>
      </div>
    </div>

    <div class="features-section">
      <div class="container">
        <h2 class="text-3xl font-bold text-center mb-12">功能特色</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">🎵</div>
            <h3>音樂搜尋</h3>
            <p>從 YouTube 搜尋並播放您喜愛的音樂</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📝</div>
            <h3>播放清單</h3>
            <p>建立和管理您的個人音樂收藏</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📱</div>
            <h3>響應式設計</h3>
            <p>在任何裝置上都能完美使用</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🔒</div>
            <h3>安全登入</h3>
            <p>保護您的個人資料和音樂偏好</p>
          </div>
        </div>
      </div>
    </div>

    <div class="status-section">
      <div class="container">
        <h2 class="text-2xl font-bold mb-6">系統狀態</h2>
        <div class="status-grid">
          <div class="status-card">
            <div class="status-indicator success"></div>
            <h3>前端服務</h3>
            <p>Vue.js 3 + TypeScript</p>
            <span class="status-text success">運行中</span>
          </div>
          <div class="status-card">
            <div class="status-indicator warning"></div>
            <h3>後端API</h3>
            <p>Node.js + Express</p>
            <span class="status-text warning">待連接</span>
          </div>
          <div class="status-card">
            <div class="status-indicator error"></div>
            <h3>資料庫</h3>
            <p>PostgreSQL</p>
            <span class="status-text error">未連接</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const user = computed(() => authStore.user)
</script>

<style scoped>
.home {
  @apply min-h-screen;
}

.hero-section {
  @apply bg-gradient-to-br from-blue-600 to-purple-700 text-center py-20 px-4;
}

.auth-buttons {
  @apply space-x-4;
}

.btn {
  @apply inline-block px-8 py-3 rounded-lg font-medium transition-all duration-200 text-decoration-none;
}

.btn-primary {
  @apply bg-white text-blue-600 hover:bg-blue-50 shadow-lg hover:shadow-xl;
}

.btn-secondary {
  @apply bg-transparent text-white border-2 border-white hover:bg-white hover:text-blue-600;
}

.user-welcome {
  @apply space-y-4;
}

.features-section {
  @apply py-20 bg-gray-50;
}

.container {
  @apply max-w-6xl mx-auto px-4;
}

.features-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8;
}

.feature-card {
  @apply bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow;
}

.feature-icon {
  @apply text-4xl mb-4;
}

.feature-card h3 {
  @apply text-xl font-semibold text-gray-900 mb-2;
}

.feature-card p {
  @apply text-gray-600;
}

.status-section {
  @apply py-16 bg-white;
}

.status-grid {
  @apply grid grid-cols-1 md:grid-cols-3 gap-6;
}

.status-card {
  @apply bg-gray-50 rounded-lg p-6 relative;
}

.status-indicator {
  @apply w-4 h-4 rounded-full absolute top-4 right-4;
}

.status-indicator.success {
  @apply bg-green-500;
}

.status-indicator.warning {
  @apply bg-yellow-500;
}

.status-indicator.error {
  @apply bg-red-500;
}

.status-card h3 {
  @apply text-lg font-semibold text-gray-900 mb-1;
}

.status-card p {
  @apply text-gray-600 text-sm mb-2;
}

.status-text {
  @apply text-sm font-medium;
}

.status-text.success {
  @apply text-green-600;
}

.status-text.warning {
  @apply text-yellow-600;
}

.status-text.error {
  @apply text-red-600;
}
</style>