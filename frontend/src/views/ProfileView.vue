<template>
  <div class="profile-container">
    <div class="profile-header">
      <h1 class="profile-title">個人資料</h1>
      <p class="profile-subtitle">管理您的帳戶設定和偏好</p>
    </div>

    <div class="profile-content">
      <div class="profile-card">
        <div class="profile-section">
          <h2>基本資訊</h2>
          <div class="form-group">
            <label>電子郵件</label>
            <input 
              type="email" 
              :value="userEmail" 
              disabled 
              class="form-input"
            />
          </div>
          
          <div class="form-group">
            <label>暱稱</label>
            <input 
              type="text" 
              v-model="profileForm.nickname" 
              class="form-input"
              placeholder="請輸入暱稱"
            />
          </div>

          <div class="form-group">
            <label>頭像</label>
            <div class="avatar-section">
              <img 
                :src="profileForm.avatarUrl || defaultAvatar" 
                alt="用戶頭像"
                class="avatar-preview"
              />
              <button class="btn-secondary">更換頭像</button>
            </div>
          </div>
        </div>

        <div class="profile-section">
          <h2>播放偏好</h2>
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="profileForm.preferences.autoplay"
              />
              <span>自動播放下一首</span>
            </label>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="profileForm.preferences.repeatMode"
              />
              <span>單曲循環</span>
            </label>
          </div>
        </div>

        <div class="profile-actions">
          <button 
            @click="saveProfile" 
            class="btn-primary"
            :disabled="isLoading"
          >
            {{ isLoading ? '儲存中...' : '儲存變更' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const isLoading = ref(false)
const userEmail = ref('')
const defaultAvatar = '/images/default-avatar.png'

const profileForm = reactive({
  nickname: '',
  avatarUrl: '',
  preferences: {
    autoplay: true,
    repeatMode: false
  }
})

const loadProfile = async () => {
  try {
    isLoading.value = true
    // 這裡應該從 API 載入用戶資料
    userEmail.value = authStore.user?.email || ''
    profileForm.nickname = authStore.user?.nickname || ''
    profileForm.avatarUrl = authStore.user?.avatarUrl || ''
    
    // 載入偏好設定
    const saved = localStorage.getItem('userPreferences')
    if (saved) {
      Object.assign(profileForm.preferences, JSON.parse(saved))
    }
  } catch (error) {
    console.error('載入個人資料失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const saveProfile = async () => {
  try {
    isLoading.value = true
    
    // 儲存偏好設定到 localStorage
    localStorage.setItem('userPreferences', JSON.stringify(profileForm.preferences))
    
    // 這裡應該調用 API 儲存用戶資料
    console.log('儲存個人資料:', profileForm)
    
    // 顯示成功訊息
    alert('個人資料已儲存')
  } catch (error) {
    console.error('儲存個人資料失敗:', error)
    alert('儲存失敗，請稍後再試')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadProfile()
})
</script>

<style lang="scss" scoped>
.profile-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.profile-header {
  margin-bottom: 2rem;
  
  .profile-title {
    font-size: 2rem;
    font-weight: bold;
    color: $text-primary;
    margin-bottom: 0.5rem;
  }
  
  .profile-subtitle {
    color: $text-secondary;
    font-size: 1rem;
  }
}

.profile-card {
  background: $bg-card;
  border-radius: $radius-lg;
  box-shadow: $shadow;
  overflow: hidden;
}

.profile-section {
  padding: 2rem;
  border-bottom: 1px solid $border-color;
  
  &:last-child {
    border-bottom: none;
  }
  
  h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: 1.5rem;
  }
}

.form-group {
  margin-bottom: 1.5rem;
  
  label {
    display: block;
    font-weight: 500;
    color: $text-primary;
    margin-bottom: 0.5rem;
  }
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid $border-color;
  border-radius: $radius;
  font-size: 1rem;
  transition: $transition-normal;
  
  &:focus {
    outline: none;
    border-color: $primary-color;
    box-shadow: 0 0 0 3px $primary-color-light;
  }
  
  &:disabled {
    background: $bg-tertiary;
    color: $text-secondary;
    cursor: not-allowed;
  }
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar-preview {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid $border-color;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  
  input[type="checkbox"] {
    width: auto;
    margin: 0;
  }
}

.profile-actions {
  padding: 1.5rem 2rem;
  background: $bg-secondary;
  text-align: right;
}

.btn-primary {
  background: $primary-color;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: $radius;
  font-size: 1rem;
  cursor: pointer;
  transition: $transition-normal;
  
  &:hover:not(:disabled) {
    background: $primary-color-dark;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.btn-secondary {
  background: transparent;
  color: $primary-color;
  border: 1px solid $primary-color;
  padding: 0.5rem 1rem;
  border-radius: $radius;
  font-size: 0.875rem;
  cursor: pointer;
  transition: $transition-normal;
  
  &:hover {
    background: $primary-color;
    color: white;
  }
}
</style>