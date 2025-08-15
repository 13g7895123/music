<template>
  <div 
    ref="containerRef"
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

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

const containerRef = ref<HTMLElement>()
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
  if (url.includes('ytimg.com') || url.includes('googleusercontent.com')) {
    // YouTube 縮圖優化
    if (url.includes('maxresdefault')) {
      return url // 已經是最高質量
    } else if (url.includes('hqdefault')) {
      return url // 已經是高質量
    } else {
      // 嘗試獲取高質量版本
      return url.replace(/\/[^\/]+\.jpg$/, '/hqdefault.jpg')
    }
  }
  
  // 如果有CDN，添加優化參數
  if (url.includes('cdn.') || url.includes('cloudinary.com')) {
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

let webpSupported: boolean | null = null

function supportsWebP(): boolean {
  if (webpSupported !== null) return webpSupported
  
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
  } catch (error) {
    webpSupported = false
  }
  
  return webpSupported
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
      rootMargin: '50px', // 提前50px開始載入
      threshold: 0.1
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
    
    // 延遲重試，避免立即重複失敗
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
  
  nextTick(() => {
    if (observer.value && containerRef.value) {
      observer.value.observe(containerRef.value)
    }
  })
})

onUnmounted(() => {
  observer.value?.disconnect()
})
</script>

<style lang="scss" scoped>
@import '@/styles/responsive.scss';

.optimized-image {
  position: relative;
  overflow: hidden;
  background: var(--bg-secondary);
  border-radius: var(--radius);
  
  &.loading {
    .optimized-image-element {
      opacity: 0;
    }
  }
  
  &.error {
    .optimized-image-element {
      display: none;
    }
  }
}

.optimized-image-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity var(--transition-normal);
  opacity: 0;
  
  &.loaded {
    opacity: 1;
  }
}

.image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    var(--bg-secondary) 25%,
    var(--bg-tertiary) 50%,
    var(--bg-secondary) 75%
  );
  background-size: 200% 100%;
}

.placeholder-shimmer {
  width: 100%;
  height: 100%;
  animation: shimmer 1.5s ease-in-out infinite;
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
  padding: 1rem;
  text-align: center;
}

.error-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.5;
  
  @include respond-to(sm) {
    font-size: 1.5rem;
  }
}

.retry-btn {
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.875rem;
  transition: background var(--transition-normal);
  
  &:hover {
    background: var(--primary-color-dark);
  }
  
  @include respond-to(sm) {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

// 響應式調整
@include respond-to(sm) {
  .image-error {
    padding: 0.5rem;
  }
}

// 深色主題適配
@media (prefers-color-scheme: dark) {
  .image-placeholder {
    background: linear-gradient(
      90deg,
      var(--bg-primary) 25%,
      var(--bg-secondary) 50%,
      var(--bg-primary) 75%
    );
  }
}

// 減少動畫效果（使用者偏好）
@media (prefers-reduced-motion: reduce) {
  .optimized-image-element,
  .placeholder-shimmer {
    transition: none !important;
    animation: none !important;
  }
}

// 高對比度模式
@media (prefers-contrast: high) {
  .image-error {
    border: 2px solid var(--border-color);
  }
  
  .retry-btn {
    border: 2px solid var(--primary-color);
  }
}
</style>