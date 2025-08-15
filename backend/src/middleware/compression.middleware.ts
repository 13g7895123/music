import compression from 'compression'
import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

// 高效能壓縮中介軟體
export const compressionMiddleware = compression({
  filter: (req: Request, res: Response) => {
    // 檢查請求是否明確拒絕壓縮
    if (req.headers['x-no-compression']) {
      return false
    }
    
    // 檢查內容類型是否適合壓縮
    const contentType = res.get('content-type') || ''
    const compressibleTypes = [
      'text/',
      'application/json',
      'application/javascript',
      'application/xml',
      'application/rss+xml',
      'application/atom+xml',
      'image/svg+xml'
    ]
    
    const isCompressible = compressibleTypes.some(type => 
      contentType.toLowerCase().includes(type)
    )
    
    if (!isCompressible) {
      return false
    }
    
    // 小於1KB的回應不壓縮（壓縮開銷可能大於收益）
    const contentLength = parseInt(res.get('content-length') || '0')
    if (contentLength > 0 && contentLength < 1024) {
      return false
    }
    
    return compression.filter(req, res)
  },
  level: 6, // 壓縮等級 (1-9)，6是性能和壓縮率的平衡點
  threshold: 1024, // 最小壓縮大小 (1KB)
  memLevel: 8, // 記憶體使用等級 (1-9)
  windowBits: 15, // 窗口大小
  chunkSize: 16384 // 區塊大小 (16KB)
})

// 快取中介軟體
export const cacheMiddleware = (duration: number = 3600) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 只快取GET和HEAD請求
    if (!['GET', 'HEAD'].includes(req.method)) {
      return next()
    }
    
    // 檢查是否有Cache-Control: no-cache標頭
    if (req.get('Cache-Control')?.includes('no-cache')) {
      return next()
    }
    
    // 生成ETag
    const etag = generateETag(req.url)
    
    // 設定快取標頭
    res.set({
      'Cache-Control': `public, max-age=${duration}, must-revalidate`,
      'ETag': etag,
      'Last-Modified': new Date().toUTCString(),
      'Vary': 'Accept-Encoding'
    })
    
    // 檢查 If-None-Match 標頭（ETag驗證）
    const clientETag = req.get('If-None-Match')
    if (clientETag && clientETag === etag) {
      return res.status(304).end()
    }
    
    // 檢查 If-Modified-Since 標頭
    const ifModifiedSince = req.get('If-Modified-Since')
    const lastModified = res.get('Last-Modified')
    if (ifModifiedSince && lastModified) {
      const clientDate = new Date(ifModifiedSince)
      const serverDate = new Date(lastModified)
      
      if (clientDate >= serverDate) {
        return res.status(304).end()
      }
    }
    
    next()
  }
}

// 靜態資源快取中介軟體
export const staticCacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 靜態資源的快取策略
  const url = req.url
  
  if (url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    // 靜態資源快取1年
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Expires': new Date(Date.now() + 31536000000).toUTCString()
    })
  } else if (url.match(/\.(html|htm)$/)) {
    // HTML檔案快取1小時
    res.set({
      'Cache-Control': 'public, max-age=3600, must-revalidate'
    })
  } else if (url.includes('/api/')) {
    // API回應不快取（除非特別設定）
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    })
  }
  
  next()
}

// 產生ETag
function generateETag(url: string, additionalData?: string): string {
  const data = url + (additionalData || '') + Date.now().toString()
  return `"${crypto.createHash('md5').update(data).digest('hex')}"`
}

// 條件式快取中介軟體
export const conditionalCacheMiddleware = (
  cacheCondition: (req: Request) => boolean,
  duration: number = 3600
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (cacheCondition(req)) {
      return cacheMiddleware(duration)(req, res, next)
    }
    next()
  }
}

// API回應快取中介軟體
export const apiCacheMiddleware = (duration: number = 300) => {
  const cache = new Map<string, {
    data: any
    timestamp: number
    etag: string
  }>()
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next()
    }
    
    const cacheKey = `${req.originalUrl}-${JSON.stringify(req.query)}`
    const cached = cache.get(cacheKey)
    const now = Date.now()
    
    // 檢查快取是否仍然有效
    if (cached && (now - cached.timestamp) < duration * 1000) {
      const clientETag = req.get('If-None-Match')
      
      if (clientETag === cached.etag) {
        return res.status(304).end()
      }
      
      res.set({
        'Cache-Control': `public, max-age=${duration}`,
        'ETag': cached.etag,
        'X-Cache': 'HIT'
      })
      
      return res.json(cached.data)
    }
    
    // 攔截原始的json方法
    const originalJson = res.json
    res.json = function(data: any) {
      // 只快取成功的回應
      if (res.statusCode === 200) {
        const etag = generateETag(cacheKey, JSON.stringify(data))
        
        cache.set(cacheKey, {
          data,
          timestamp: now,
          etag
        })
        
        res.set({
          'Cache-Control': `public, max-age=${duration}`,
          'ETag': etag,
          'X-Cache': 'MISS'
        })
        
        // 清理過期的快取項目
        setTimeout(() => {
          for (const [key, value] of cache.entries()) {
            if (now - value.timestamp > duration * 1000) {
              cache.delete(key)
            }
          }
        }, duration * 1000)
      }
      
      return originalJson.call(this, data)
    }
    
    next()
  }
}

// 效能監控中介軟體
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint()
  
  // 添加回應時間標頭
  res.on('finish', () => {
    const endTime = process.hrtime.bigint()
    const responseTime = Number(endTime - startTime) / 1000000 // 轉換為毫秒
    
    res.set('X-Response-Time', `${responseTime.toFixed(2)}ms`)
    
    // 記錄慢查詢
    if (responseTime > 1000) {
      console.warn(`Slow API response: ${req.method} ${req.url} - ${responseTime.toFixed(2)}ms`)
    }
  })
  
  next()
}

// 記憶體使用監控
export const memoryMonitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const memoryUsage = process.memoryUsage()
  
  // 記憶體使用超過閾值時警告
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024
  const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024
  const usage = (heapUsedMB / heapTotalMB) * 100
  
  if (usage > 80) {
    console.warn(`High memory usage: ${usage.toFixed(2)}% (${heapUsedMB.toFixed(2)}MB/${heapTotalMB.toFixed(2)}MB)`)
  }
  
  // 添加記憶體使用標頭（僅在開發環境）
  if (process.env.NODE_ENV === 'development') {
    res.set('X-Memory-Usage', `${heapUsedMB.toFixed(2)}MB`)
  }
  
  next()
}

// 請求大小限制中介軟體
export const requestSizeLimitMiddleware = (maxSizeMB: number = 10) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('content-length') || '0')
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    
    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        success: false,
        error: {
          message: 'Request entity too large',
          code: 'REQUEST_TOO_LARGE',
          maxSize: `${maxSizeMB}MB`
        }
      })
    }
    
    next()
  }
}