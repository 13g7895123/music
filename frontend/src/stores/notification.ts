import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
  persistent?: boolean
  actions?: Array<{
    label: string
    action: () => void
    primary?: boolean
  }>
  timestamp: Date
}

export const useNotificationStore = defineStore('notification', () => {
  // State
  const notifications = ref<Notification[]>([])
  const maxNotifications = ref(5)

  // Getters
  const activeNotifications = computed(() => notifications.value)
  const hasNotifications = computed(() => notifications.value.length > 0)
  const errorNotifications = computed(() => 
    notifications.value.filter(n => n.type === 'error')
  )
  const warningNotifications = computed(() => 
    notifications.value.filter(n => n.type === 'warning')
  )

  // Actions
  const generateId = (): string => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>): string => {
    const id = generateId()
    const newNotification: Notification = {
      id,
      timestamp: new Date(),
      duration: 5000, // 預設5秒
      ...notification
    }

    notifications.value.push(newNotification)

    // 限制通知數量
    if (notifications.value.length > maxNotifications.value) {
      notifications.value.shift()
    }

    // 自動移除非持久性通知
    if (!newNotification.persistent && newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }

    return id
  }

  const removeNotification = (id: string): void => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const clearAllNotifications = (): void => {
    notifications.value = []
  }

  const clearNotificationsByType = (type: Notification['type']): void => {
    notifications.value = notifications.value.filter(n => n.type !== type)
  }

  // 便利方法
  const showSuccess = (
    message: string, 
    options: Partial<Omit<Notification, 'id' | 'type' | 'message' | 'timestamp'>> = {}
  ): string => {
    return addNotification({
      type: 'success',
      message,
      ...options
    })
  }

  const showError = (
    message: string, 
    options: Partial<Omit<Notification, 'id' | 'type' | 'message' | 'timestamp'>> = {}
  ): string => {
    return addNotification({
      type: 'error',
      message,
      duration: 0, // 錯誤訊息預設不自動消失
      ...options
    })
  }

  const showWarning = (
    message: string, 
    options: Partial<Omit<Notification, 'id' | 'type' | 'message' | 'timestamp'>> = {}
  ): string => {
    return addNotification({
      type: 'warning',
      message,
      duration: 7000, // 警告訊息較長顯示時間
      ...options
    })
  }

  const showInfo = (
    message: string, 
    options: Partial<Omit<Notification, 'id' | 'type' | 'message' | 'timestamp'>> = {}
  ): string => {
    return addNotification({
      type: 'info',
      message,
      ...options
    })
  }

  // 特殊通知類型
  const showOfflineWarning = (): string => {
    // 先清除舊的離線警告
    const existingOffline = notifications.value.find(n => n.id === 'offline-warning')
    if (existingOffline) {
      return existingOffline.id
    }

    return addNotification({
      id: 'offline-warning',
      type: 'warning',
      message: '您目前處於離線狀態，部分功能可能無法使用',
      persistent: true,
      timestamp: new Date()
    })
  }

  const hideOfflineWarning = (): void => {
    removeNotification('offline-warning')
  }

  const showConnectionRestored = (): string => {
    hideOfflineWarning()
    return showSuccess('網路連線已恢復', {
      duration: 3000
    })
  }

  // 錯誤恢復相關
  const showErrorWithRetry = (
    message: string,
    retryAction: () => void,
    options: Partial<Omit<Notification, 'id' | 'type' | 'message' | 'timestamp' | 'actions'>> = {}
  ): string => {
    return addNotification({
      type: 'error',
      message,
      duration: 0,
      actions: [
        {
          label: '重試',
          action: retryAction,
          primary: true
        },
        {
          label: '關閉',
          action: () => {} // 空函數，關閉通知
        }
      ],
      ...options
    })
  }

  const showAuthError = (): string => {
    return addNotification({
      type: 'error',
      message: '登入已過期，請重新登入',
      duration: 0,
      actions: [
        {
          label: '重新登入',
          action: () => {
            window.location.href = '/auth/login'
          },
          primary: true
        }
      ]
    })
  }

  const showPlayerError = (retryAction: () => void): string => {
    return addNotification({
      type: 'error',
      message: '播放器發生錯誤',
      duration: 0,
      actions: [
        {
          label: '重新載入播放器',
          action: retryAction,
          primary: true
        },
        {
          label: '稍後再試',
          action: () => {}
        }
      ]
    })
  }

  // 批量操作
  const showLoadingNotification = (message: string): string => {
    return addNotification({
      type: 'info',
      message,
      persistent: true
    })
  }

  const updateNotification = (
    id: string, 
    updates: Partial<Omit<Notification, 'id' | 'timestamp'>>
  ): void => {
    const notification = notifications.value.find(n => n.id === id)
    if (notification) {
      Object.assign(notification, updates)
      
      // 如果更新後變成非持久性，設置自動移除
      if (!notification.persistent && notification.duration && notification.duration > 0) {
        setTimeout(() => {
          removeNotification(id)
        }, notification.duration)
      }
    }
  }

  // 統計信息
  const getNotificationStats = () => {
    return {
      total: notifications.value.length,
      byType: {
        success: notifications.value.filter(n => n.type === 'success').length,
        error: notifications.value.filter(n => n.type === 'error').length,
        warning: notifications.value.filter(n => n.type === 'warning').length,
        info: notifications.value.filter(n => n.type === 'info').length
      },
      persistent: notifications.value.filter(n => n.persistent).length
    }
  }

  return {
    // State
    notifications: activeNotifications,
    
    // Getters
    hasNotifications,
    errorNotifications,
    warningNotifications,
    
    // Actions
    addNotification,
    removeNotification,
    clearAllNotifications,
    clearNotificationsByType,
    
    // 便利方法
    showSuccess,
    showError,
    showWarning,
    showInfo,
    
    // 特殊通知
    showOfflineWarning,
    hideOfflineWarning,
    showConnectionRestored,
    showErrorWithRetry,
    showAuthError,
    showPlayerError,
    showLoadingNotification,
    updateNotification,
    
    // 工具
    getNotificationStats
  }
})