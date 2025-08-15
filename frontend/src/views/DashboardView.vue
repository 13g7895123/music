<template>
  <div class="dashboard">
    <header class="dashboard-header">
      <div class="header-content">
        <h1>MyTune Dashboard</h1>
        <div class="user-info">
          <span>歡迎回來，{{ user?.nickname }}！</span>
          <button @click="handleLogout" class="logout-btn">登出</button>
        </div>
      </div>
    </header>

    <main class="dashboard-main">
      <div class="dashboard-content">
        <div class="welcome-card">
          <h2>歡迎使用 MyTune</h2>
          <p>您的個人音樂播放平台已準備就緒！</p>
          
          <div class="user-details">
            <h3>帳號資訊</h3>
            <div class="user-detail-item">
              <label>電子郵件:</label>
              <span>{{ user?.email }}</span>
            </div>
            <div class="user-detail-item">
              <label>暱稱:</label>
              <span>{{ user?.nickname }}</span>
            </div>
            <div class="user-detail-item">
              <label>註冊時間:</label>
              <span>{{ formatDate(user?.createdAt) }}</span>
            </div>
            <div class="user-detail-item">
              <label>帳號狀態:</label>
              <span class="status" :class="{ verified: user?.emailVerified }">
                {{ user?.emailVerified ? '已驗證' : '未驗證' }}
              </span>
            </div>
          </div>
        </div>

        <div class="features-grid">
          <div class="feature-card">
            <h3>我的播放清單</h3>
            <p>管理您的個人音樂收藏</p>
            <button class="feature-btn">開始使用</button>
          </div>
          
          <div class="feature-card">
            <h3>音樂搜尋</h3>
            <p>從YouTube搜尋並新增音樂</p>
            <button class="feature-btn">開始搜尋</button>
          </div>
          
          <div class="feature-card">
            <h3>播放記錄</h3>
            <p>查看您的音樂播放歷史</p>
            <button class="feature-btn">查看記錄</button>
          </div>
          
          <div class="feature-card">
            <h3>個人設定</h3>
            <p>自訂您的使用體驗</p>
            <button class="feature-btn">前往設定</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const user = computed(() => authStore.user)

const formatDate = (dateString?: string) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const handleLogout = async () => {
  try {
    await authStore.logout()
    router.push('/auth/login')
  } catch (error) {
    console.error('Logout failed:', error)
    // 即使登出失敗也要導向登入頁面
    router.push('/auth/login')
  }
}
</script>

<style scoped>
.dashboard {
  @apply min-h-screen bg-gray-50;
}

.dashboard-header {
  @apply bg-white shadow-sm border-b;
}

.header-content {
  @apply max-w-7xl mx-auto px-4 py-4 flex justify-between items-center;
}

.dashboard-header h1 {
  @apply text-2xl font-bold text-gray-900;
}

.user-info {
  @apply flex items-center space-x-4;
}

.user-info span {
  @apply text-gray-700;
}

.logout-btn {
  @apply bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors;
}

.dashboard-main {
  @apply py-8;
}

.dashboard-content {
  @apply max-w-7xl mx-auto px-4 space-y-8;
}

.welcome-card {
  @apply bg-white rounded-xl shadow-lg p-8;
}

.welcome-card h2 {
  @apply text-3xl font-bold text-gray-900 mb-2;
}

.welcome-card > p {
  @apply text-gray-600 mb-6;
}

.user-details {
  @apply space-y-4;
}

.user-details h3 {
  @apply text-lg font-semibold text-gray-800 mb-4;
}

.user-detail-item {
  @apply flex items-center space-x-3;
}

.user-detail-item label {
  @apply text-sm font-medium text-gray-600 w-20;
}

.user-detail-item span {
  @apply text-gray-900;
}

.status {
  @apply px-2 py-1 rounded-full text-xs font-medium;
}

.status.verified {
  @apply bg-green-100 text-green-800;
}

.status:not(.verified) {
  @apply bg-yellow-100 text-yellow-800;
}

.features-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6;
}

.feature-card {
  @apply bg-white rounded-xl shadow-lg p-6 text-center space-y-4;
}

.feature-card h3 {
  @apply text-lg font-semibold text-gray-900;
}

.feature-card p {
  @apply text-gray-600 text-sm;
}

.feature-btn {
  @apply bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors w-full;
}
</style>