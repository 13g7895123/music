<template>
  <div>
    <div v-if="hasError" class="error-boundary">
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <h2>糟糕！出現了一些問題</h2>
        <p class="error-message">{{ errorMessage }}</p>
        
        <div class="error-actions">
          <button @click="retry" class="btn btn-primary">
            重試
          </button>
          <button @click="goHome" class="btn btn-secondary">
            回到首頁
          </button>
          <button @click="reportError" class="btn btn-link">
            回報問題
          </button>
        </div>
        
        <details v-if="isDevelopment" class="error-details">
          <summary>錯誤詳情 (開發模式)</summary>
          <pre>{{ errorDetails }}</pre>
        </details>
      </div>
    </div>
    
    <slot v-else />
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'
import { errorHandler } from '@/utils/errorHandler'

const router = useRouter()
const hasError = ref(false)
const errorMessage = ref('')
const errorDetails = ref('')
const isDevelopment = import.meta.env.DEV

onErrorCaptured((error, instance, info) => {
  hasError.value = true
  errorMessage.value = error.message || '發生未知錯誤'
  errorDetails.value = `${error.stack}\n\nComponent: ${info}`
  
  // 記錄錯誤
  errorHandler.handleError({
    code: 'VUE_ERROR',
    message: error.message,
    details: {
      componentInfo: info,
      stack: error.stack
    },
    timestamp: new Date(),
    url: window.location.href,
    userAgent: navigator.userAgent
  })
  
  return false // 阻止錯誤繼續傳播
})

const retry = () => {
  hasError.value = false
  errorMessage.value = ''
  errorDetails.value = ''
  // 強制重新渲染
  location.reload()
}

const goHome = () => {
  hasError.value = false
  router.push('/')
}

const reportError = () => {
  // 開啟錯誤回報表單或導向支援頁面
  const subject = encodeURIComponent('錯誤回報 - YouTube Music Player')
  const body = encodeURIComponent(`錯誤訊息: ${errorMessage.value}\n\n錯誤詳情: ${errorDetails.value}`)
  window.open(`mailto:support@example.com?subject=${subject}&body=${body}`)
}
</script>

<style lang="scss" scoped>
@import '@/styles/responsive.scss';

.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;
  background: var(--bg-primary);

  @include respond-to(md) {
    min-height: 60vh;
  }
}

.error-content {
  text-align: center;
  max-width: 500px;
  background: var(--bg-card);
  padding: 2rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.8;
}

h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1rem;

  @include respond-to(md) {
    font-size: 1.75rem;
  }
}

.error-message {
  margin: 1rem 0;
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 1rem;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 2rem 0;
  flex-wrap: wrap;

  @include respond-to(sm) {
    flex-direction: row;
    flex-wrap: nowrap;
  }
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius);
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all var(--transition-normal);
  border: none;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 100px;

  &:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  // 觸控設備優化
  @media (pointer: coarse) {
    min-height: 44px;
    min-width: 120px;
  }
}

.btn-primary {
  background: var(--primary-color);
  color: white;

  &:hover {
    background: var(--primary-color-dark);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);

  &:hover {
    background: var(--bg-tertiary);
    border-color: var(--border-color-dark);
  }
}

.btn-link {
  background: transparent;
  color: var(--primary-color);
  text-decoration: underline;

  &:hover {
    color: var(--primary-color-dark);
    background: var(--primary-color-light);
  }
}

.error-details {
  text-align: left;
  margin-top: 2rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  border: 1px solid var(--border-color);

  summary {
    cursor: pointer;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
    user-select: none;

    &:hover {
      color: var(--primary-color);
    }
  }

  pre {
    white-space: pre-wrap;
    font-size: 0.75rem;
    color: var(--text-secondary);
    line-height: 1.4;
    margin: 0.5rem 0 0 0;
    max-height: 200px;
    overflow-y: auto;
    background: var(--bg-tertiary);
    padding: 0.75rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-color);
  }
}

// 響應式調整
@include respond-to(sm) {
  .error-boundary {
    padding: 1.5rem;
  }

  .error-content {
    padding: 1.5rem;
  }

  .error-icon {
    font-size: 3rem;
  }

  h2 {
    font-size: 1.25rem;
  }

  .error-message {
    font-size: 0.875rem;
  }

  .error-actions {
    flex-direction: column;
    align-items: center;
  }

  .btn {
    width: 100%;
    max-width: 200px;
  }
}

// 深色主題適配
@media (prefers-color-scheme: dark) {
  .error-details pre {
    background: var(--bg-primary);
  }
}

// 高對比度模式
@media (prefers-contrast: high) {
  .error-content {
    border-width: 2px;
  }

  .btn {
    border-width: 2px;
  }

  .btn-secondary {
    border-color: var(--text-primary);
  }
}

// 減少動畫效果（使用者偏好）
@media (prefers-reduced-motion: reduce) {
  .btn {
    transition: none !important;

    &:hover {
      transform: none !important;
    }
  }
}

// 列印樣式
@media print {
  .error-boundary {
    background: white !important;
    color: black !important;
  }

  .error-actions {
    display: none !important;
  }

  .error-details {
    border: 1px solid black !important;
    background: white !important;
  }
}
</style>