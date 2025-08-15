import { onUnmounted, ref } from 'vue'

export function useMemoryManager() {
  const timers = ref<Set<number>>(new Set())
  const intervals = ref<Set<number>>(new Set())
  const observers = ref<Set<IntersectionObserver | MutationObserver | ResizeObserver>>(new Set())
  const eventListeners = ref<Array<{
    element: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  }>>([])
  const abortControllers = ref<Set<AbortController>>(new Set())

  // 計時器管理
  const setTimeout = (callback: () => void, delay: number): number => {
    const id = window.setTimeout(() => {
      callback()
      timers.value.delete(id)
    }, delay)
    timers.value.add(id)
    return id
  }

  const setInterval = (callback: () => void, delay: number): number => {
    const id = window.setInterval(callback, delay)
    intervals.value.add(id)
    return id
  }

  const clearTimeout = (id: number) => {
    window.clearTimeout(id)
    timers.value.delete(id)
  }

  const clearInterval = (id: number) => {
    window.clearInterval(id)
    intervals.value.delete(id)
  }

  // 事件監聽器管理
  const addEventListener = (
    element: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ) => {
    element.addEventListener(type, listener, options)
    eventListeners.value.push({ element, type, listener, options })
  }

  const removeEventListener = (
    element: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | EventListenerOptions
  ) => {
    element.removeEventListener(type, listener, options)
    const index = eventListeners.value.findIndex(
      item => item.element === element && 
               item.type === type && 
               item.listener === listener
    )
    if (index > -1) {
      eventListeners.value.splice(index, 1)
    }
  }

  // 觀察器管理
  const addObserver = <T extends IntersectionObserver | MutationObserver | ResizeObserver>(observer: T): T => {
    observers.value.add(observer)
    return observer
  }

  const removeObserver = (observer: IntersectionObserver | MutationObserver | ResizeObserver) => {
    observer.disconnect()
    observers.value.delete(observer)
  }

  // AbortController 管理
  const createAbortController = (): AbortController => {
    const controller = new AbortController()
    abortControllers.value.add(controller)
    return controller
  }

  const abortController = (controller: AbortController) => {
    controller.abort()
    abortControllers.value.delete(controller)
  }

  // 請求管理（使用 fetch 與 AbortController）
  const safeFetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const controller = createAbortController()
    
    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal
      })
      abortControllers.value.delete(controller)
      return response
    } catch (error) {
      abortControllers.value.delete(controller)
      throw error
    }
  }

  // 記憶體使用監控
  const getMemoryUsage = (): {
    used: number;
    total: number;
    percentage: number;
  } | null => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      }
    }
    return null
  }

  // 清理函數
  const cleanup = () => {
    // 清理計時器
    timers.value.forEach(id => window.clearTimeout(id))
    intervals.value.forEach(id => window.clearInterval(id))
    
    // 清理事件監聽器
    eventListeners.value.forEach(({ element, type, listener, options }) => {
      try {
        element.removeEventListener(type, listener, options)
      } catch (error) {
        console.warn('Failed to remove event listener:', error)
      }
    })
    
    // 清理觀察器
    observers.value.forEach(observer => {
      try {
        observer.disconnect()
      } catch (error) {
        console.warn('Failed to disconnect observer:', error)
      }
    })
    
    // 中止所有請求
    abortControllers.value.forEach(controller => {
      try {
        controller.abort()
      } catch (error) {
        console.warn('Failed to abort controller:', error)
      }
    })
    
    // 清空集合
    timers.value.clear()
    intervals.value.clear()
    eventListeners.value.length = 0
    observers.value.clear()
    abortControllers.value.clear()
  }

  // 記憶體洩漏檢測
  const detectMemoryLeaks = () => {
    const stats = {
      timers: timers.value.size,
      intervals: intervals.value.size,
      eventListeners: eventListeners.value.length,
      observers: observers.value.size,
      abortControllers: abortControllers.value.size
    }
    
    const totalResources = Object.values(stats).reduce((sum, count) => sum + count, 0)
    
    if (totalResources > 50) {
      console.warn('Potential memory leak detected:', stats)
    }
    
    return stats
  }

  // 強制垃圾回收（僅在開發環境）
  const forceGarbageCollection = () => {
    if (process.env.NODE_ENV === 'development' && 'gc' in window) {
      try {
        (window as any).gc()
      } catch (error) {
        console.warn('Manual garbage collection failed:', error)
      }
    }
  }

  // 自動清理組件銷毀時的資源
  onUnmounted(() => {
    cleanup()
    
    // 在開發環境下檢測潛在的記憶體洩漏
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        detectMemoryLeaks()
      }, 1000)
    }
  })

  return {
    // 計時器
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    
    // 事件監聽器
    addEventListener,
    removeEventListener,
    
    // 觀察器
    addObserver,
    removeObserver,
    
    // 請求管理
    createAbortController,
    abortController,
    safeFetch,
    
    // 記憶體監控
    getMemoryUsage,
    detectMemoryLeaks,
    forceGarbageCollection,
    
    // 清理
    cleanup
  }
}

// 全域記憶體監控工具
export class MemoryMonitor {
  private static instance: MemoryMonitor
  private checkInterval: number | null = null
  private memoryHistory: Array<{ timestamp: number; usage: number }> = []
  private maxHistorySize = 100

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor()
    }
    return MemoryMonitor.instance
  }

  startMonitoring(intervalMs = 30000) {
    if (this.checkInterval) return

    this.checkInterval = window.setInterval(() => {
      this.checkMemoryUsage()
    }, intervalMs)
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  private checkMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const usage = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      
      this.memoryHistory.push({
        timestamp: Date.now(),
        usage
      })
      
      // 保持歷史記錄大小
      if (this.memoryHistory.length > this.maxHistorySize) {
        this.memoryHistory.shift()
      }
      
      // 記憶體使用超過 80% 時警告
      if (usage > 80) {
        console.warn(`High memory usage detected: ${usage.toFixed(2)}%`)
        
        // 觸發清理事件
        window.dispatchEvent(new CustomEvent('memory-pressure', {
          detail: { usage, memory }
        }))
      }
    }
  }

  getMemoryHistory() {
    return [...this.memoryHistory]
  }

  getCurrentMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      }
    }
    return null
  }
}

// 自動啟動記憶體監控（僅在瀏覽器環境）
if (typeof window !== 'undefined') {
  const monitor = MemoryMonitor.getInstance()
  
  // 頁面載入後開始監控
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      monitor.startMonitoring()
    })
  } else {
    monitor.startMonitoring()
  }
  
  // 頁面卸載時停止監控
  window.addEventListener('beforeunload', () => {
    monitor.stopMonitoring()
  })
}