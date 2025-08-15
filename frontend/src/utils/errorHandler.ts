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
      this.hideOfflineMessage()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.showOfflineMessage()
    })
  }

  handleError(error: AppError) {
    console.error('Application Error:', error)

    // 添加用戶ID（如果已登入）
    try {
      const authData = localStorage.getItem('auth-user')
      if (authData) {
        const user = JSON.parse(authData)
        if (user?.id) {
          error.userId = user.id.toString()
        }
      }
    } catch (e) {
      // 忽略localStorage讀取錯誤
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
      const response = await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(error)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (sendError) {
      console.warn('Failed to send error to backend:', sendError)
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
    
    // 使用原生通知或簡單的UI顯示錯誤
    this.showNotification(message, 'error', this.getErrorActions(error.code))
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
      'UNHANDLED_PROMISE_REJECTION': '應用程式發生錯誤，請重新整理頁面',
      'JAVASCRIPT_ERROR': '頁面執行發生錯誤，請重新整理頁面',
      'RESOURCE_LOAD_ERROR': '資源載入失敗，請檢查網路連線',
      'VUE_ERROR': '頁面顯示發生錯誤，請重新整理頁面',
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
            window.location.href = '/auth/login'
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
            // 重置播放器狀態
            localStorage.removeItem('player-state')
            window.location.reload()
          }
        }
      ],
      'JAVASCRIPT_ERROR': [
        {
          label: '重新整理頁面',
          action: () => {
            window.location.reload()
          }
        }
      ],
      'RESOURCE_LOAD_ERROR': [
        {
          label: '重新載入',
          action: () => {
            window.location.reload()
          }
        }
      ]
    }

    return actions[code] || [
      {
        label: '重新整理',
        action: () => {
          window.location.reload()
        }
      }
    ]
  }

  private showOfflineMessage() {
    this.showNotification(
      '您目前處於離線狀態，部分功能可能無法使用',
      'warning',
      [],
      true
    )
  }

  private hideOfflineMessage() {
    // 移除離線訊息
    const offlineElement = document.getElementById('offline-notification')
    if (offlineElement) {
      offlineElement.remove()
    }
  }

  private showNotification(
    message: string,
    type: 'error' | 'warning' | 'info' = 'error',
    actions: Array<{label: string, action: () => void}> = [],
    persistent = false
  ) {
    // 創建通知元素
    const notification = document.createElement('div')
    notification.className = `error-notification error-notification-${type}`
    notification.id = type === 'warning' && persistent ? 'offline-notification' : undefined
    
    notification.innerHTML = `
      <div class="error-notification-content">
        <div class="error-notification-icon">
          ${type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}
        </div>
        <div class="error-notification-message">${message}</div>
        <div class="error-notification-actions">
          ${actions.map((action, index) => 
            `<button class="error-notification-btn" data-action="${index}">${action.label}</button>`
          ).join('')}
          ${!persistent ? '<button class="error-notification-close">✕</button>' : ''}
        </div>
      </div>
    `

    // 添加樣式
    const style = document.createElement('style')
    style.textContent = `
      .error-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.3s ease;
      }
      
      .error-notification-error {
        border-left: 4px solid #ef4444;
      }
      
      .error-notification-warning {
        border-left: 4px solid #f59e0b;
      }
      
      .error-notification-info {
        border-left: 4px solid #3b82f6;
      }
      
      .error-notification-content {
        padding: 16px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }
      
      .error-notification-icon {
        font-size: 20px;
        flex-shrink: 0;
      }
      
      .error-notification-message {
        flex: 1;
        font-size: 14px;
        line-height: 1.5;
        color: #374151;
      }
      
      .error-notification-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex-shrink: 0;
      }
      
      .error-notification-btn {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .error-notification-btn:hover {
        background: #2563eb;
      }
      
      .error-notification-close {
        background: none;
        border: none;
        color: #6b7280;
        cursor: pointer;
        font-size: 16px;
        padding: 4px;
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @media (max-width: 480px) {
        .error-notification {
          left: 20px;
          right: 20px;
          max-width: none;
        }
      }
    `
    
    if (!document.querySelector('#error-notification-styles')) {
      style.id = 'error-notification-styles'
      document.head.appendChild(style)
    }

    // 添加事件監聽器
    notification.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      
      if (target.classList.contains('error-notification-close')) {
        notification.remove()
      } else if (target.classList.contains('error-notification-btn')) {
        const actionIndex = parseInt(target.getAttribute('data-action') || '0')
        const action = actions[actionIndex]
        if (action) {
          action.action()
          notification.remove()
        }
      }
    })

    // 添加到頁面
    document.body.appendChild(notification)

    // 自動移除（非持久性通知）
    if (!persistent) {
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove()
        }
      }, 5000)
    }
  }

  // API請求錯誤處理
  async handleApiError(response: Response): Promise<void> {
    let errorCode = 'UNKNOWN_ERROR'
    let errorMessage = 'Request failed'

    try {
      const errorData = await response.json()
      errorCode = errorData.error?.code || 'API_ERROR'
      errorMessage = errorData.error?.message || `HTTP ${response.status}`
    } catch (e) {
      errorMessage = `HTTP ${response.status} ${response.statusText}`
    }

    this.handleError({
      code: errorCode,
      message: errorMessage,
      details: {
        status: response.status,
        url: response.url,
        statusText: response.statusText
      },
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent
    })
  }

  // 重試機制
  async retry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delay = 1000
  ): Promise<T> {
    let lastError: Error

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (i === maxRetries) {
          this.handleError({
            code: 'RETRY_FAILED',
            message: `Operation failed after ${maxRetries} retries`,
            details: {
              lastError: lastError.message,
              retries: i
            },
            timestamp: new Date(),
            url: window.location.href,
            userAgent: navigator.userAgent
          })
          throw error
        }

        // 等待後重試
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
      }
    }

    throw lastError!
  }
}

// 初始化錯誤處理器
export const errorHandler = ErrorHandler.getInstance()

// 全域錯誤處理函數
export const handleError = (error: Partial<AppError>) => {
  errorHandler.handleError({
    code: 'UNKNOWN_ERROR',
    message: 'An error occurred',
    timestamp: new Date(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    ...error
  })
}

// API錯誤處理助手
export const handleApiError = (response: Response) => {
  return errorHandler.handleApiError(response)
}

// 重試助手
export const retry = <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
) => {
  return errorHandler.retry(operation, maxRetries, delay)
}