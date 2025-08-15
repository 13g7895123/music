// 效能監控工具

export interface PerformanceMetrics {
  // 頁面載入指標
  firstContentfulPaint?: number
  largestContentfulPaint?: number
  firstInputDelay?: number
  cumulativeLayoutShift?: number
  timeToInteractive?: number
  
  // 自定義指標
  componentMountTime?: number
  apiResponseTime?: number
  routeChangeTime?: number
  
  // 資源使用
  memoryUsage?: {
    used: number
    total: number
    percentage: number
  }
  
  // 連線資訊
  connectionType?: string
  effectiveType?: string
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetrics = {}
  private observers: PerformanceObserver[] = []
  private customMarks: Map<string, number> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  constructor() {
    this.setupWebVitalsObservers()
    this.setupNetworkInfo()
    this.setupMemoryMonitoring()
  }

  // 設置 Web Vitals 觀察器
  private setupWebVitalsObservers() {
    try {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lcpEntry = entries[entries.length - 1]
        this.metrics.largestContentfulPaint = lcpEntry.startTime
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.push(lcpObserver)

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          this.metrics.firstInputDelay = entry.processingStart - entry.startTime
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
      this.observers.push(fidObserver)

      // Cumulative Layout Shift (CLS)
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
        this.metrics.cumulativeLayoutShift = clsValue
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      this.observers.push(clsObserver)

      // Navigation Timing
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          this.metrics.firstContentfulPaint = entry.firstContentfulPaint
          this.metrics.timeToInteractive = entry.domInteractive - entry.navigationStart
        })
      })
      navigationObserver.observe({ entryTypes: ['navigation'] })
      this.observers.push(navigationObserver)

    } catch (error) {
      console.warn('Performance observers not supported:', error)
    }
  }

  // 設置網路資訊監控
  private setupNetworkInfo() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      this.metrics.connectionType = connection.type
      this.metrics.effectiveType = connection.effectiveType

      connection.addEventListener('change', () => {
        this.metrics.connectionType = connection.type
        this.metrics.effectiveType = connection.effectiveType
      })
    }
  }

  // 設置記憶體監控
  private setupMemoryMonitoring() {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        this.metrics.memoryUsage = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
        }
      }
    }

    updateMemoryInfo()
    setInterval(updateMemoryInfo, 10000) // 每10秒更新一次
  }

  // 開始測量自定義指標
  startMeasure(name: string) {
    this.customMarks.set(`${name}-start`, performance.now())
    if ('mark' in performance) {
      performance.mark(`${name}-start`)
    }
  }

  // 結束測量自定義指標
  endMeasure(name: string): number {
    const endTime = performance.now()
    const startTime = this.customMarks.get(`${name}-start`)
    
    if (startTime) {
      const duration = endTime - startTime
      
      if ('mark' in performance && 'measure' in performance) {
        performance.mark(`${name}-end`)
        performance.measure(name, `${name}-start`, `${name}-end`)
      }
      
      this.customMarks.delete(`${name}-start`)
      return duration
    }
    
    return 0
  }

  // 測量組件掛載時間
  measureComponentMount(componentName: string, mountFn: () => void): void {
    this.startMeasure(`component-mount-${componentName}`)
    mountFn()
    const duration = this.endMeasure(`component-mount-${componentName}`)
    this.metrics.componentMountTime = duration
  }

  // 測量 API 回應時間
  async measureApiCall<T>(
    apiCall: () => Promise<T>,
    apiName: string
  ): Promise<T> {
    this.startMeasure(`api-${apiName}`)
    
    try {
      const result = await apiCall()
      const duration = this.endMeasure(`api-${apiName}`)
      this.metrics.apiResponseTime = duration
      
      // 記錄到效能時間線
      if ('mark' in performance) {
        performance.mark(`api-${apiName}-success`)
      }
      
      return result
    } catch (error) {
      this.endMeasure(`api-${apiName}`)
      
      if ('mark' in performance) {
        performance.mark(`api-${apiName}-error`)
      }
      
      throw error
    }
  }

  // 測量路由變更時間
  measureRouteChange(from: string, to: string, changeFn: () => void): void {
    this.startMeasure(`route-change-${from}-to-${to}`)
    changeFn()
    const duration = this.endMeasure(`route-change-${from}-to-${to}`)
    this.metrics.routeChangeTime = duration
  }

  // 獲取所有指標
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  // 獲取 Core Web Vitals 評分
  getCoreWebVitalsScore(): {
    lcp: 'good' | 'needs-improvement' | 'poor' | 'unknown'
    fid: 'good' | 'needs-improvement' | 'poor' | 'unknown'
    cls: 'good' | 'needs-improvement' | 'poor' | 'unknown'
  } {
    return {
      lcp: this.scoreMetric(this.metrics.largestContentfulPaint, 2500, 4000),
      fid: this.scoreMetric(this.metrics.firstInputDelay, 100, 300),
      cls: this.scoreMetric(this.metrics.cumulativeLayoutShift, 0.1, 0.25)
    }
  }

  private scoreMetric(
    value: number | undefined,
    goodThreshold: number,
    poorThreshold: number
  ): 'good' | 'needs-improvement' | 'poor' | 'unknown' {
    if (value === undefined) return 'unknown'
    if (value <= goodThreshold) return 'good'
    if (value <= poorThreshold) return 'needs-improvement'
    return 'poor'
  }

  // 生成效能報告
  generateReport(): string {
    const metrics = this.getMetrics()
    const scores = this.getCoreWebVitalsScore()
    
    let report = '=== 效能報告 ===\n\n'
    
    // Core Web Vitals
    report += 'Core Web Vitals:\n'
    report += `- LCP: ${metrics.largestContentfulPaint?.toFixed(2)}ms (${scores.lcp})\n`
    report += `- FID: ${metrics.firstInputDelay?.toFixed(2)}ms (${scores.fid})\n`
    report += `- CLS: ${metrics.cumulativeLayoutShift?.toFixed(3)} (${scores.cls})\n\n`
    
    // 其他指標
    if (metrics.firstContentfulPaint) {
      report += `First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(2)}ms\n`
    }
    if (metrics.timeToInteractive) {
      report += `Time to Interactive: ${metrics.timeToInteractive.toFixed(2)}ms\n`
    }
    if (metrics.componentMountTime) {
      report += `Component Mount Time: ${metrics.componentMountTime.toFixed(2)}ms\n`
    }
    if (metrics.apiResponseTime) {
      report += `API Response Time: ${metrics.apiResponseTime.toFixed(2)}ms\n`
    }
    if (metrics.routeChangeTime) {
      report += `Route Change Time: ${metrics.routeChangeTime.toFixed(2)}ms\n`
    }
    
    // 記憶體使用
    if (metrics.memoryUsage) {
      report += `\n記憶體使用:\n`
      report += `- 已使用: ${(metrics.memoryUsage.used / 1024 / 1024).toFixed(2)}MB\n`
      report += `- 總計: ${(metrics.memoryUsage.total / 1024 / 1024).toFixed(2)}MB\n`
      report += `- 使用率: ${metrics.memoryUsage.percentage.toFixed(2)}%\n`
    }
    
    // 網路資訊
    if (metrics.connectionType || metrics.effectiveType) {
      report += `\n網路資訊:\n`
      if (metrics.connectionType) {
        report += `- 連線類型: ${metrics.connectionType}\n`
      }
      if (metrics.effectiveType) {
        report += `- 有效類型: ${metrics.effectiveType}\n`
      }
    }
    
    return report
  }

  // 向後端發送效能資料
  async sendMetricsToServer(): Promise<void> {
    try {
      const metrics = this.getMetrics()
      
      await fetch('/api/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metrics,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.warn('Failed to send performance metrics:', error)
    }
  }

  // 清理觀察器
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.customMarks.clear()
  }
}

// 單例實例
export const performanceMonitor = PerformanceMonitor.getInstance()

// Vue 3 Composable
export function usePerformanceMonitor() {
  return {
    monitor: performanceMonitor,
    startMeasure: (name: string) => performanceMonitor.startMeasure(name),
    endMeasure: (name: string) => performanceMonitor.endMeasure(name),
    measureApiCall: <T>(apiCall: () => Promise<T>, apiName: string) => 
      performanceMonitor.measureApiCall(apiCall, apiName),
    getMetrics: () => performanceMonitor.getMetrics(),
    generateReport: () => performanceMonitor.generateReport()
  }
}

// 自動初始化效能監控
if (typeof window !== 'undefined') {
  // 頁面載入完成後發送初始指標
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (process.env.NODE_ENV !== 'development') {
        performanceMonitor.sendMetricsToServer()
      }
    }, 5000) // 延遲5秒確保所有指標都被收集
  })
  
  // 頁面卸載前清理
  window.addEventListener('beforeunload', () => {
    performanceMonitor.cleanup()
  })
  
  // 開發環境下在控制台顯示效能報告
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      console.log(performanceMonitor.generateReport())
    }, 3000)
  }
}