# Story 19: 效能優化

## 📋 基本資訊
- **Story ID**: YMP-019
- **Epic**: 系統完善
- **優先級**: Should Have (P1)
- **預估點數**: 8 points
- **預估時間**: 2 天
- **依賴關係**: Story 18
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 使用者  
**我希望** 應用程式載入快速且運行流暢  
**以便** 獲得優質的使用體驗

## 📝 詳細需求

### 核心功能需求
1. **載入時間優化**: 首屏載入時間 < 2秒
2. **代碼分割**: 按需載入減少初始包大小
3. **圖片優化**: 圖片壓縮和延遲載入
4. **快取策略**: 合理的瀏覽器和CDN快取
5. **記憶體管理**: 避免記憶體洩漏

### 技術規格

**前端效能優化**:
```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  
  // 建置優化
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    
    // 代碼分割
    rollupOptions: {
      output: {
        manualChunks: {
          // 第三方庫分離
          vendor: ['vue', 'vue-router', 'pinia'],
          ui: ['@headlessui/vue', 'vuedraggable'],
          charts: ['chart.js', 'vue-chartjs'],
          
          // 按功能分組
          auth: [
            './src/views/auth/LoginView.vue',
            './src/views/auth/RegisterView.vue',
            './src/stores/auth.ts'
          ],
          player: [
            './src/components/player/YouTubePlayer.vue',
            './src/components/player/PlaybackControls.vue',
            './src/stores/player.ts'
          ],
          playlist: [
            './src/views/PlaylistsView.vue',
            './src/views/PlaylistDetailView.vue',
            './src/stores/playlist.ts'
          ]
        }
      }
    },
    
    // Chunk 大小警告
    chunkSizeWarningLimit: 1000
  },
  
  // 開發伺服器優化
  server: {
    hmr: {
      overlay: false
    }
  },
  
  // 別名設定
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  
  // CSS 優化
  css: {
    devSourcemap: false,
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  }
})
```

**延遲載入和代碼分割**:
```typescript
// frontend/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { authGuard } from './guards'

// 延遲載入組件
const LoginView = () => import('@/views/auth/LoginView.vue')
const RegisterView = () => import('@/views/auth/RegisterView.vue')
const DashboardView = () => import('@/views/DashboardView.vue')
const PlaylistsView = () => import('@/views/PlaylistsView.vue')
const PlaylistDetailView = () => import('@/views/PlaylistDetailView.vue')
const PlayerView = () => import('@/views/PlayerView.vue')
const ProfileView = () => import('@/views/ProfileView.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/auth/login',
      name: 'Login',
      component: LoginView,
      meta: { 
        requiresGuest: true,
        preload: true // 預載入重要頁面
      }
    },
    {
      path: '/auth/register',
      name: 'Register',
      component: RegisterView,
      meta: { requiresGuest: true }
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: DashboardView,
      beforeEnter: authGuard,
      meta: { preload: true }
    },
    {
      path: '/playlists',
      name: 'Playlists',
      component: PlaylistsView,
      beforeEnter: authGuard
    },
    {
      path: '/playlists/:id',
      name: 'PlaylistDetail',
      component: PlaylistDetailView,
      beforeEnter: authGuard,
      props: true
    },
    {
      path: '/player',
      name: 'Player',
      component: PlayerView,
      beforeEnter: authGuard
    },
    {
      path: '/profile',
      name: 'Profile',
      component: ProfileView,
      beforeEnter: authGuard
    }
  ]
})

// 預載入重要路由
router.beforeEach((to, from, next) => {
  // 預載入下一個可能訪問的頁面
  if (to.meta?.preload) {
    const nextRoutes = getNextLikelyRoutes(to.name as string)
    nextRoutes.forEach(routeName => {
      const route = router.resolve({ name: routeName })
      if (route.matched[0]?.components?.default) {
        // 預載入組件
        route.matched[0].components.default()
      }
    })
  }
  next()
})

function getNextLikelyRoutes(currentRoute: string): string[] {
  const routeMap: Record<string, string[]> = {
    'Login': ['Dashboard'],
    'Dashboard': ['Playlists', 'Player'],
    'Playlists': ['PlaylistDetail', 'Player'],
    'PlaylistDetail': ['Player']
  }
  return routeMap[currentRoute] || []
}

export default router
```

**圖片優化組件**:
```vue
<!-- frontend/src/components/common/OptimizedImage.vue -->
<template>
  <div 
    class="optimized-image"
    :class="{ 'loading': isLoading, 'error': hasError }"
  >
    <img
      v-if="shouldLoad && !hasError"
      :src="currentSrc"
      :alt="alt"
      :class="imageClass"
      @load="onLoad"
      @error="onError"
      loading="lazy"
    />
    
    <!-- 載入佔位符 -->
    <div v-if="isLoading" class="image-placeholder">
      <div class="placeholder-shimmer"></div>
    </div>
    
    <!-- 錯誤佔位符 -->
    <div v-if="hasError" class="image-error">
      <div class="error-icon">🖼️</div>
      <button v-if="retryCount < maxRetries" @click="retry" class="retry-btn">
        重試
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Props {
  src: string
  alt: string
  width?: number
  height?: number
  quality?: number
  placeholder?: string
  lazy?: boolean
  webp?: boolean
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  quality: 80,
  lazy: true,
  webp: true
})

const isLoading = ref(true)
const hasError = ref(false)
const shouldLoad = ref(!props.lazy)
const retryCount = ref(0)
const maxRetries = 3
const observer = ref<IntersectionObserver>()

const currentSrc = computed(() => {
  if (!props.src) return ''
  
  // 如果支援WebP格式，優先使用
  if (props.webp && supportsWebP()) {
    return generateOptimizedUrl(props.src, 'webp')
  }
  
  return generateOptimizedUrl(props.src, 'jpg')
})

const imageClass = computed(() => {
  return [
    'optimized-image-element',
    props.class,
    { 'loaded': !isLoading.value }
  ]
})

function generateOptimizedUrl(url: string, format: string): string {
  // 如果是YouTube縮圖，使用不同的優化策略
  if (url.includes('ytimg.com')) {
    return url.replace(/\/[^\/]+\.jpg$/, '/hqdefault.jpg')
  }
  
  // 如果有CDN，添加優化參數
  if (url.includes('your-cdn.com')) {
    const params = new URLSearchParams({
      w: props.width?.toString() || '300',
      h: props.height?.toString() || '200',
      q: props.quality?.toString() || '80',
      f: format
    })
    return `${url}?${params.toString()}`
  }
  
  return url
}

function supportsWebP(): boolean {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
}

function setupLazyLoading() {
  if (!props.lazy || !('IntersectionObserver' in window)) {
    shouldLoad.value = true
    return
  }
  
  observer.value = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          shouldLoad.value = true
          observer.value?.disconnect()
        }
      })
    },
    {
      rootMargin: '50px'
    }
  )
}

function onLoad() {
  isLoading.value = false
  hasError.value = false
}

function onError() {
  isLoading.value = false
  hasError.value = true
}

function retry() {
  if (retryCount.value < maxRetries) {
    retryCount.value++
    isLoading.value = true
    hasError.value = false
    
    // 延遲重試
    setTimeout(() => {
      shouldLoad.value = false
      nextTick(() => {
        shouldLoad.value = true
      })
    }, 1000 * retryCount.value)
  }
}

onMounted(() => {
  setupLazyLoading()
  if (observer.value) {
    observer.value.observe(document.querySelector('.optimized-image') as Element)
  }
})

onUnmounted(() => {
  observer.value?.disconnect()
})
</script>

<style scoped>
.optimized-image {
  position: relative;
  overflow: hidden;
  background: var(--bg-secondary);
}

.optimized-image-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.3s ease;
  opacity: 0;
}

.optimized-image-element.loaded {
  opacity: 1;
}

.image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
}

.placeholder-shimmer {
  width: 100%;
  height: 100%;
  animation: shimmer 1.5s infinite;
}

.image-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.error-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.5;
}

.retry-btn {
  padding: 0.25rem 0.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
</style>
```

**記憶體管理和清理**:
```typescript
// frontend/src/composables/useMemoryManager.ts
import { onUnmounted, ref } from 'vue'

export function useMemoryManager() {
  const timers = ref<Set<number>>(new Set())
  const intervals = ref<Set<number>>(new Set())
  const observers = ref<Set<IntersectionObserver | MutationObserver>>(new Set())
  const eventListeners = ref<Array<{
    element: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  }>>([])

  const setTimeout = (callback: () => void, delay: number): number => {
    const id = window.setTimeout(callback, delay)
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

  const addObserver = (observer: IntersectionObserver | MutationObserver) => {
    observers.value.add(observer)
    return observer
  }

  const cleanup = () => {
    // 清理計時器
    timers.value.forEach(id => window.clearTimeout(id))
    intervals.value.forEach(id => window.clearInterval(id))
    
    // 清理事件監聽器
    eventListeners.value.forEach(({ element, type, listener, options }) => {
      element.removeEventListener(type, listener, options)
    })
    
    // 清理觀察器
    observers.value.forEach(observer => {
      observer.disconnect()
    })
    
    // 清空集合
    timers.value.clear()
    intervals.value.clear()
    eventListeners.value.length = 0
    observers.value.clear()
  }

  onUnmounted(cleanup)

  return {
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    addEventListener,
    removeEventListener,
    addObserver,
    cleanup
  }
}
```

**後端效能優化**:
```typescript
// backend/src/middleware/compression.middleware.ts
import compression from 'compression'
import { Request, Response, NextFunction } from 'express'

export const compressionMiddleware = compression({
  filter: (req: Request, res: Response) => {
    // 不壓縮某些內容類型
    if (req.headers['x-no-compression']) {
      return false
    }
    
    // 小於1KB的回應不壓縮
    const contentLength = parseInt(res.get('content-length') || '0')
    if (contentLength > 0 && contentLength < 1024) {
      return false
    }
    
    return compression.filter(req, res)
  },
  level: 6, // 壓縮等級 (1-9)
  threshold: 1024, // 最小壓縮大小
  memLevel: 8 // 記憶體使用等級
})

// 快取中介軟體
export const cacheMiddleware = (duration: number = 3600) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 只快取GET請求
    if (req.method !== 'GET') {
      return next()
    }
    
    // 設定快取標頭
    res.set({
      'Cache-Control': `public, max-age=${duration}`,
      'ETag': generateETag(req.url),
      'Last-Modified': new Date().toUTCString()
    })
    
    // 檢查 If-None-Match 標頭
    const clientETag = req.get('If-None-Match')
    const serverETag = res.get('ETag')
    
    if (clientETag && clientETag === serverETag) {
      return res.status(304).end()
    }
    
    next()
  }
}

function generateETag(url: string): string {
  const crypto = require('crypto')
  return crypto.createHash('md5').update(url).digest('hex')
}
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `frontend/src/components/common/OptimizedImage.vue` - 圖片優化組件
- `frontend/src/composables/useMemoryManager.ts` - 記憶體管理工具
- `frontend/src/utils/performance.ts` - 效能監控工具
- `backend/src/middleware/compression.middleware.ts` - 壓縮中介軟體

**更新檔案**:
- `frontend/vite.config.ts` - 建置優化設定
- `frontend/src/router/index.ts` - 路由延遲載入
- `backend/src/app.ts` - 添加效能中介軟體

## ✅ 驗收條件

### 效能驗收
- [ ] 首屏載入時間 < 2秒
- [ ] JavaScript包大小 < 500KB (gzipped)
- [ ] 圖片載入優化生效
- [ ] 路由切換流暢 < 500ms
- [ ] 記憶體使用穩定

### 用戶體驗驗收
- [ ] 頁面滾動流暢無卡頓
- [ ] 圖片延遲載入正常
- [ ] 載入狀態視覺回饋良好
- [ ] 離線快取功能正常

### 技術驗收
- [ ] Lighthouse評分 > 90
- [ ] Core Web Vitals指標良好
- [ ] 無記憶體洩漏
- [ ] API回應時間 < 1秒

## 🚀 實作指引

### Step 1: 建置優化
配置Vite和Webpack優化設定

### Step 2: 代碼分割
實作路由和組件的延遲載入

### Step 3: 資源優化
實作圖片優化和壓縮

### Step 4: 記憶體管理
建立記憶體清理機制

## 📊 預期成果
- ✅ 顯著的載入時間改善
- ✅ 流暢的用戶操作體驗
- ✅ 優化的資源使用
- ✅ 穩定的記憶體管理
- ✅ 高效的快取策略