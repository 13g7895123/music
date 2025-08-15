# Story 18: 錯誤處理系統

## 📋 基本資訊
- **Story ID**: YMP-018
- **Epic**: 系統完善
- **優先級**: Should Have (P1)
- **預估點數**: 6 points
- **預估時間**: 1-2 天
- **依賴關係**: Story 17
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 使用者  
**我希望** 當發生錯誤時能看到清楚的錯誤訊息和恢復建議  
**以便** 了解問題並知道如何處理

## 📝 詳細需求

### 核心功能需求
1. **全域錯誤處理**: 統一的錯誤處理機制
2. **用戶友善訊息**: 清楚易懂的錯誤提示
3. **錯誤日誌**: 完整的錯誤記錄和追蹤
4. **自動恢復**: 部分錯誤的自動重試機制
5. **離線處理**: 網路斷線時的優雅處理

### 技術規格

**前端錯誤處理系統**:
```typescript
// frontend/src/utils/errorHandler.ts
export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: Date
  userId?: string
  url?: string
  userAgent?: string
}

export class ErrorHandler {
  private static instance: ErrorHandler
  private errorQueue: AppError[] = []
  private isOnline = navigator.onLine

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  constructor() {
    this.setupGlobalErrorHandlers()
    this.setupNetworkMonitoring()
  }

  private setupGlobalErrorHandlers() {
    // 捕獲未處理的Promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        code: 'UNHANDLED_PROMISE_REJECTION',
        message: event.reason?.message || 'Unhandled promise rejection',
        details: event.reason,
        timestamp: new Date(),
        url: window.location.href,
        userAgent: navigator.userAgent
      })
      event.preventDefault()
    })

    // 捕獲JavaScript錯誤
    window.addEventListener('error', (event) => {
      this.handleError({
        code: 'JAVASCRIPT_ERROR',
        message: event.message,
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        },
        timestamp: new Date(),
        url: window.location.href,
        userAgent: navigator.userAgent
      })
    })

    // 捕獲資源載入錯誤
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError({
          code: 'RESOURCE_LOAD_ERROR',
          message: `Failed to load resource: ${(event.target as any)?.src || (event.target as any)?.href}`,
          details: {
            element: event.target,
            type: (event.target as any)?.tagName
          },
          timestamp: new Date(),
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      }
    }, true)
  }

  private setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.processErrorQueue()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.showOfflineMessage()
    })
  }

  handleError(error: AppError) {
    console.error('Application Error:', error)

    // 添加用戶ID（如果已登入）
    const authStore = useAuthStore()
    if (authStore.user?.id) {
      error.userId = authStore.user.id.toString()
    }

    // 如果離線，加入佇列
    if (!this.isOnline) {
      this.errorQueue.push(error)
      return
    }

    // 發送錯誤到後端
    this.sendErrorToBackend(error)

    // 顯示用戶友善的錯誤訊息
    this.showUserFriendlyMessage(error)
  }

  private async sendErrorToBackend(error: AppError) {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(error)
      })
    } catch (sendError) {
      // 發送失敗時加入佇列
      this.errorQueue.push(error)
    }
  }

  private processErrorQueue() {
    while (this.errorQueue.length > 0 && this.isOnline) {
      const error = this.errorQueue.shift()
      if (error) {
        this.sendErrorToBackend(error)
      }
    }
  }

  private showUserFriendlyMessage(error: AppError) {
    const message = this.getUserFriendlyMessage(error.code)
    
    // 使用通知系統顯示錯誤
    const notificationStore = useNotificationStore()
    notificationStore.showError(message, {
      duration: 5000,
      actions: this.getErrorActions(error.code)
    })
  }

  private getUserFriendlyMessage(code: string): string {
    const messages: Record<string, string> = {
      'NETWORK_ERROR': '網路連線有問題，請檢查您的網路設定',
      'AUTHENTICATION_ERROR': '登入已過期，請重新登入',
      'PERMISSION_DENIED': '您沒有權限執行此操作',
      'RESOURCE_NOT_FOUND': '找不到請求的資源',
      'VALIDATION_ERROR': '輸入的資料有誤，請檢查後重試',
      'YOUTUBE_API_ERROR': 'YouTube服務暫時無法使用，請稍後再試',
      'PLAYLIST_ERROR': '播放清單操作失敗，請重試',
      'PLAYER_ERROR': '播放器發生錯誤，正在嘗試恢復',
      'DATABASE_ERROR': '資料庫操作失敗，請稍後再試',
      'UNKNOWN_ERROR': '發生未知錯誤，我們正在處理中'
    }

    return messages[code] || messages['UNKNOWN_ERROR']
  }

  private getErrorActions(code: string): Array<{label: string, action: () => void}> {
    const actions: Record<string, Array<{label: string, action: () => void}>> = {
      'AUTHENTICATION_ERROR': [
        {
          label: '重新登入',
          action: () => {
            const router = useRouter()
            router.push('/auth/login')
          }
        }
      ],
      'NETWORK_ERROR': [
        {
          label: '重試',
          action: () => {
            window.location.reload()
          }
        }
      ],
      'PLAYER_ERROR': [
        {
          label: '重新載入播放器',
          action: () => {
            const playerStore = usePlayerStore()
            playerStore.resetPlayer()
          }
        }
      ]
    }

    return actions[code] || []
  }

  private showOfflineMessage() {
    const notificationStore = useNotificationStore()
    notificationStore.showWarning('您目前處於離線狀態，部分功能可能無法使用', {
      persistent: true,
      id: 'offline-warning'
    })
  }
}

// 初始化錯誤處理器
export const errorHandler = ErrorHandler.getInstance()
```

**API錯誤處理中介軟體增強**:
```typescript
// backend/src/middleware/error.middleware.ts (增強版)
import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

export class AppError extends Error {
  statusCode: number
  isOperational: boolean
  code: string

  constructor(message: string, statusCode: number, code?: string) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    this.code = code || 'UNKNOWN_ERROR'
  }
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500
  let message = 'Internal server error'
  let code = 'INTERNAL_SERVER_ERROR'

  // 處理不同類型的錯誤
  if (error instanceof AppError) {
    statusCode = error.statusCode
    message = error.message
    code = error.code
  } else if (error.name === 'ValidationError') {
    statusCode = 400
    message = '輸入資料驗證失敗'
    code = 'VALIDATION_ERROR'
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401
    message = '無效的認證令牌'
    code = 'AUTHENTICATION_ERROR'
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401
    message = '認證令牌已過期'
    code = 'TOKEN_EXPIRED'
  } else if (error.message.includes('ECONNREFUSED')) {
    statusCode = 503
    message = '資料庫連線失敗'
    code = 'DATABASE_CONNECTION_ERROR'
  }

  // 記錄錯誤
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
    code
  }

  if (statusCode >= 500) {
    logger.error('Server Error:', errorInfo)
  } else {
    logger.warn('Client Error:', errorInfo)
  }

  // 在開發環境返回詳細錯誤資訊
  const isDevelopment = process.env.NODE_ENV === 'development'

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      timestamp: new Date().toISOString(),
      ...(isDevelopment && {
        stack: error.stack,
        details: errorInfo
      })
    }
  })
}

// 錯誤記錄API
export const logError = async (req: Request, res: Response) => {
  try {
    const errorData = req.body
    
    // 記錄前端錯誤
    logger.error('Frontend Error:', {
      ...errorData,
      ip: req.ip,
      serverTimestamp: new Date().toISOString()
    })

    res.json({ success: true, message: 'Error logged successfully' })
  } catch (error) {
    logger.error('Failed to log frontend error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to log error' 
    })
  }
}

// 404處理
export const notFoundHandler = (req: Request, res: Response) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'ROUTE_NOT_FOUND')
  res.status(404).json({
    success: false,
    error: {
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    }
  })
}
```

**錯誤恢復組件**:
```vue
<!-- frontend/src/components/common/ErrorBoundary.vue -->
<template>
  <div>
    <div v-if="hasError" class="error-boundary">
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <h2>糟糕！出現了一些問題</h2>
        <p class="error-message">{{ errorMessage }}</p>
        
        <div class="error-actions">
          <button @click="retry" class="btn-primary">
            重試
          </button>
          <button @click="goHome" class="btn-secondary">
            回到首頁
          </button>
          <button @click="reportError" class="btn-link">
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
  router.push('/')
}

const reportError = () => {
  // 開啟錯誤回報表單或導向支援頁面
  window.open('mailto:support@example.com?subject=Error Report&body=' + 
    encodeURIComponent(`Error: ${errorMessage.value}\n\nDetails: ${errorDetails.value}`))
}
</script>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;
}

.error-content {
  text-align: center;
  max-width: 500px;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.error-message {
  margin: 1rem 0;
  color: var(--text-secondary);
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin: 2rem 0;
  flex-wrap: wrap;
}

.error-details {
  text-align: left;
  margin-top: 2rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 4px;
}

.error-details pre {
  white-space: pre-wrap;
  font-size: 0.875rem;
}
</style>
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `frontend/src/utils/errorHandler.ts` - 錯誤處理工具
- `frontend/src/components/common/ErrorBoundary.vue` - 錯誤邊界組件
- `frontend/src/stores/notification.ts` - 通知系統Store
- `backend/src/routes/errors.ts` - 錯誤記錄API

**更新檔案**:
- `backend/src/middleware/error.middleware.ts` - 增強錯誤處理
- `frontend/src/main.ts` - 初始化錯誤處理
- `backend/src/app.ts` - 註冊錯誤記錄路由

## ✅ 驗收條件

### 功能驗收
- [ ] 全域錯誤捕獲機制正常運作
- [ ] 用戶友善的錯誤訊息顯示
- [ ] 錯誤日誌正確記錄到後端
- [ ] 離線時錯誤佇列機制正常
- [ ] 自動恢復機制有效

### 用戶體驗驗收
- [ ] 錯誤訊息清楚易懂
- [ ] 提供適當的錯誤恢復選項
- [ ] 不會因為錯誤導致應用崩潰
- [ ] 載入狀態和錯誤狀態視覺區別明確

### 技術驗收
- [ ] 錯誤日誌包含足夠的除錯資訊
- [ ] 敏感資訊不會在錯誤訊息中洩露
- [ ] 錯誤處理不影響應用效能

## 🚀 實作指引

### Step 1: 建立錯誤處理工具
實作errorHandler.ts和相關工具

### Step 2: 建立錯誤邊界組件
建立ErrorBoundary.vue組件

### Step 3: 增強後端錯誤處理
更新error.middleware.ts

### Step 4: 整合到應用
在main.ts和App.vue中整合錯誤處理

## 📊 預期成果
- ✅ 穩定可靠的錯誤處理機制
- ✅ 優秀的用戶錯誤體驗
- ✅ 完整的錯誤追蹤和日誌
- ✅ 智能的錯誤恢復功能
- ✅ 強化的應用穩定性