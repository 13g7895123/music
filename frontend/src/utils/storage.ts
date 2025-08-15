/**
 * 本地儲存工具類
 * 提供 localStorage 的封裝，支援過期時間和自動清理
 */

interface StorageItem<T> {
  data: T
  timestamp: number
  expiry?: number // 過期時間（毫秒）
}

export class LocalStorage {
  /**
   * 設置儲存項目
   * @param key 儲存鍵
   * @param value 儲存值
   * @param expiryHours 過期時間（小時），可選
   */
  static setItem<T>(key: string, value: T, expiryHours?: number): boolean {
    try {
      const item: StorageItem<T> = {
        data: value,
        timestamp: Date.now(),
        expiry: expiryHours ? Date.now() + (expiryHours * 60 * 60 * 1000) : undefined
      }
      
      localStorage.setItem(key, JSON.stringify(item))
      return true
    } catch (error) {
      console.error('Failed to set localStorage item:', error)
      return false
    }
  }

  /**
   * 獲取儲存項目
   * @param key 儲存鍵
   * @returns 儲存的值，如果不存在或過期則返回 null
   */
  static getItem<T>(key: string): T | null {
    try {
      const itemStr = localStorage.getItem(key)
      if (!itemStr) return null

      const item: StorageItem<T> = JSON.parse(itemStr)
      
      // 檢查是否過期
      if (item.expiry && Date.now() > item.expiry) {
        localStorage.removeItem(key)
        return null
      }

      return item.data
    } catch (error) {
      console.error('Failed to get localStorage item:', error)
      return null
    }
  }

  /**
   * 移除儲存項目
   * @param key 儲存鍵
   */
  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to remove localStorage item:', error)
    }
  }

  /**
   * 清除所有儲存項目
   */
  static clear(): void {
    try {
      localStorage.clear()
    } catch (error) {
      console.error('Failed to clear localStorage:', error)
    }
  }

  /**
   * 檢查儲存項目是否存在
   * @param key 儲存鍵
   * @returns 是否存在
   */
  static hasItem(key: string): boolean {
    return this.getItem(key) !== null
  }

  /**
   * 獲取所有儲存的鍵
   * @returns 所有鍵的數組
   */
  static getAllKeys(): string[] {
    try {
      return Object.keys(localStorage)
    } catch (error) {
      console.error('Failed to get localStorage keys:', error)
      return []
    }
  }

  /**
   * 清理過期的儲存項目
   */
  static cleanup(): number {
    let cleanedCount = 0
    
    try {
      const keys = this.getAllKeys()
      
      keys.forEach(key => {
        try {
          const itemStr = localStorage.getItem(key)
          if (!itemStr) return

          const item = JSON.parse(itemStr)
          
          // 檢查是否有過期時間且已過期
          if (item.expiry && Date.now() > item.expiry) {
            localStorage.removeItem(key)
            cleanedCount++
          }
        } catch (error) {
          // 如果無法解析，可能是其他格式的數據，跳過
        }
      })
    } catch (error) {
      console.error('Failed to cleanup localStorage:', error)
    }

    return cleanedCount
  }

  /**
   * 獲取儲存使用量（近似值）
   * @returns 儲存使用量資訊
   */
  static getUsage(): { used: number; total: number; percentage: number } {
    try {
      let used = 0
      const keys = this.getAllKeys()
      
      keys.forEach(key => {
        const value = localStorage.getItem(key)
        if (value) {
          used += key.length + value.length
        }
      })

      // localStorage 的限制通常是 5-10MB，這裡使用 5MB 作為估計
      const total = 5 * 1024 * 1024 // 5MB in bytes
      const percentage = (used / total) * 100

      return { used, total, percentage }
    } catch (error) {
      console.error('Failed to get localStorage usage:', error)
      return { used: 0, total: 0, percentage: 0 }
    }
  }
}

/**
 * 播放器狀態儲存工具
 */
export class PlayerStorage {
  private static readonly PLAYER_STATE_KEY = 'player-state'
  private static readonly PLAYER_PREFERENCES_KEY = 'player-preferences'
  private static readonly PLAYER_QUEUE_KEY = 'player-queue'

  /**
   * 儲存播放器當前狀態
   */
  static savePlayerState(state: any): boolean {
    return LocalStorage.setItem(this.PLAYER_STATE_KEY, state, 1) // 1小時過期
  }

  /**
   * 獲取播放器狀態
   */
  static getPlayerState(): any | null {
    return LocalStorage.getItem(this.PLAYER_STATE_KEY)
  }

  /**
   * 儲存播放器偏好設定
   */
  static savePlayerPreferences(preferences: any): boolean {
    return LocalStorage.setItem(this.PLAYER_PREFERENCES_KEY, preferences) // 永不過期
  }

  /**
   * 獲取播放器偏好設定
   */
  static getPlayerPreferences(): any | null {
    return LocalStorage.getItem(this.PLAYER_PREFERENCES_KEY)
  }

  /**
   * 儲存播放佇列
   */
  static savePlayerQueue(queue: any[]): boolean {
    return LocalStorage.setItem(this.PLAYER_QUEUE_KEY, queue, 24) // 24小時過期
  }

  /**
   * 獲取播放佇列
   */
  static getPlayerQueue(): any[] | null {
    return LocalStorage.getItem(this.PLAYER_QUEUE_KEY)
  }

  /**
   * 清除所有播放器相關數據
   */
  static clearAll(): void {
    LocalStorage.removeItem(this.PLAYER_STATE_KEY)
    LocalStorage.removeItem(this.PLAYER_PREFERENCES_KEY)
    LocalStorage.removeItem(this.PLAYER_QUEUE_KEY)
  }

  /**
   * 檢查播放器狀態是否存在且有效
   */
  static hasValidState(): boolean {
    const state = this.getPlayerState()
    return state !== null && state.currentSong !== null
  }
}

/**
 * 跨標籤頁通信工具
 */
export class CrossTabCommunication {
  private static listeners: Map<string, Function[]> = new Map()

  /**
   * 廣播消息到其他標籤頁
   */
  static broadcast(channel: string, data: any): void {
    try {
      const message = {
        channel,
        data,
        timestamp: Date.now(),
        sender: Math.random().toString(36).substr(2, 9) // 簡單的發送者ID
      }
      
      localStorage.setItem(`broadcast-${channel}`, JSON.stringify(message))
      
      // 立即移除，觸發其他標籤頁的 storage 事件
      setTimeout(() => {
        localStorage.removeItem(`broadcast-${channel}`)
      }, 10)
    } catch (error) {
      console.error('Failed to broadcast message:', error)
    }
  }

  /**
   * 監聽特定頻道的消息
   */
  static listen(channel: string, callback: (data: any) => void): () => void {
    const handler = (event: StorageEvent) => {
      if (event.key === `broadcast-${channel}` && event.newValue) {
        try {
          const message = JSON.parse(event.newValue)
          if (message.channel === channel) {
            callback(message.data)
          }
        } catch (error) {
          console.error('Failed to parse broadcast message:', error)
        }
      }
    }

    // 儲存監聽器引用
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, [])
    }
    this.listeners.get(channel)!.push(callback)

    window.addEventListener('storage', handler)

    // 返回取消監聽的函數
    return () => {
      window.removeEventListener('storage', handler)
      
      const channelListeners = this.listeners.get(channel)
      if (channelListeners) {
        const index = channelListeners.indexOf(callback)
        if (index > -1) {
          channelListeners.splice(index, 1)
        }
        
        if (channelListeners.length === 0) {
          this.listeners.delete(channel)
        }
      }
    }
  }

  /**
   * 移除特定頻道的所有監聽器
   */
  static removeAllListeners(channel: string): void {
    this.listeners.delete(channel)
  }

  /**
   * 移除所有監聽器
   */
  static removeAllChannels(): void {
    this.listeners.clear()
  }
}

// 定期清理過期的儲存項目
if (typeof window !== 'undefined') {
  // 每10分鐘清理一次
  setInterval(() => {
    const cleaned = LocalStorage.cleanup()
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired localStorage items`)
    }
  }, 10 * 60 * 1000)
}