import { ref, computed, onMounted, onUnmounted } from 'vue'

// 定義斷點
const breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400
}

export function useBreakpoints() {
  const windowWidth = ref(0)

  // 更新視窗寬度
  const updateWidth = () => {
    windowWidth.value = window.innerWidth
  }

  // 計算當前螢幕類型
  const currentBreakpoint = computed(() => {
    const width = windowWidth.value
    
    if (width >= breakpoints.xxl) return 'xxl'
    if (width >= breakpoints.xl) return 'xl'
    if (width >= breakpoints.lg) return 'lg'
    if (width >= breakpoints.md) return 'md'
    if (width >= breakpoints.sm) return 'sm'
    return 'xs'
  })

  // 各種螢幕尺寸判斷
  const isXs = computed(() => windowWidth.value < breakpoints.sm)
  const isSm = computed(() => windowWidth.value >= breakpoints.sm && windowWidth.value < breakpoints.md)
  const isMd = computed(() => windowWidth.value >= breakpoints.md && windowWidth.value < breakpoints.lg)
  const isLg = computed(() => windowWidth.value >= breakpoints.lg && windowWidth.value < breakpoints.xl)
  const isXl = computed(() => windowWidth.value >= breakpoints.xl && windowWidth.value < breakpoints.xxl)
  const isXxl = computed(() => windowWidth.value >= breakpoints.xxl)

  // 常用的分類
  const isMobile = computed(() => windowWidth.value < breakpoints.md)
  const isTablet = computed(() => windowWidth.value >= breakpoints.md && windowWidth.value < breakpoints.lg)
  const isDesktop = computed(() => windowWidth.value >= breakpoints.lg)

  // 螢幕尺寸比較函數
  const isGreaterOrEqual = (breakpoint: keyof typeof breakpoints) => {
    return computed(() => windowWidth.value >= breakpoints[breakpoint])
  }

  const isLessOrEqual = (breakpoint: keyof typeof breakpoints) => {
    return computed(() => windowWidth.value <= breakpoints[breakpoint])
  }

  const isBetween = (min: keyof typeof breakpoints, max: keyof typeof breakpoints) => {
    return computed(() => windowWidth.value >= breakpoints[min] && windowWidth.value <= breakpoints[max])
  }

  // 計算螢幕方向
  const isLandscape = computed(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth > window.innerHeight
  })

  const isPortrait = computed(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth <= window.innerHeight
  })

  // 檢測觸控設備
  const isTouchDevice = computed(() => {
    if (typeof window === 'undefined') return false
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  })

  // 生命週期管理
  onMounted(() => {
    updateWidth()
    window.addEventListener('resize', updateWidth)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateWidth)
  })

  return {
    // 當前視窗資訊
    windowWidth: windowWidth.value,
    currentBreakpoint,
    
    // 具體斷點判斷
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    isXxl,
    
    // 設備類型判斷
    isMobile,
    isTablet,
    isDesktop,
    
    // 方向判斷
    isLandscape,
    isPortrait,
    
    // 觸控設備判斷
    isTouchDevice,
    
    // 工具函數
    isGreaterOrEqual,
    isLessOrEqual,
    isBetween,
    
    // 原始斷點值
    breakpoints
  }
}

// 媒體查詢工具函數
export function useMediaQuery(query: string) {
  const matches = ref(false)
  let mediaQuery: MediaQueryList

  const updateMatches = () => {
    matches.value = mediaQuery.matches
  }

  onMounted(() => {
    if (typeof window !== 'undefined') {
      mediaQuery = window.matchMedia(query)
      matches.value = mediaQuery.matches
      mediaQuery.addEventListener('change', updateMatches)
    }
  })

  onUnmounted(() => {
    if (mediaQuery) {
      mediaQuery.removeEventListener('change', updateMatches)
    }
  })

  return matches
}

// 預設的媒體查詢組合
export function useCommonMediaQueries() {
  return {
    isDarkMode: useMediaQuery('(prefers-color-scheme: dark)'),
    isReducedMotion: useMediaQuery('(prefers-reduced-motion: reduce)'),
    isHighContrast: useMediaQuery('(prefers-contrast: high)'),
    canHover: useMediaQuery('(hover: hover)'),
    isFinePointer: useMediaQuery('(pointer: fine)'),
    isCoarsePointer: useMediaQuery('(pointer: coarse)')
  }
}

// 視窗尺寸變化監聽器
export function useWindowSize() {
  const width = ref(0)
  const height = ref(0)

  const update = () => {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }

  onMounted(() => {
    update()
    window.addEventListener('resize', update)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', update)
  })

  return {
    width,
    height,
    aspectRatio: computed(() => width.value / height.value)
  }
}

// 螢幕尺寸類別產生器
export function getBreakpointClasses(prefix = '') {
  const { currentBreakpoint, isMobile, isTablet, isDesktop } = useBreakpoints()
  
  return computed(() => {
    const classes = []
    
    if (prefix) {
      classes.push(`${prefix}-${currentBreakpoint.value}`)
    } else {
      classes.push(currentBreakpoint.value)
    }
    
    if (isMobile.value) classes.push(prefix ? `${prefix}-mobile` : 'mobile')
    if (isTablet.value) classes.push(prefix ? `${prefix}-tablet` : 'tablet')
    if (isDesktop.value) classes.push(prefix ? `${prefix}-desktop` : 'desktop')
    
    return classes
  })
}