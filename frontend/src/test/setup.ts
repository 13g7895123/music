import { vi } from 'vitest'
import { config } from '@vue/test-utils'

// Mock YouTube API
Object.defineProperty(window, 'YT', {
  value: {
    Player: vi.fn().mockImplementation(() => ({
      loadVideoById: vi.fn(),
      playVideo: vi.fn(),
      pauseVideo: vi.fn(),
      stopVideo: vi.fn(),
      seekTo: vi.fn(),
      getCurrentTime: vi.fn(() => 0),
      getDuration: vi.fn(() => 100),
      getPlayerState: vi.fn(() => 1),
      getVolume: vi.fn(() => 100),
      setVolume: vi.fn(),
      mute: vi.fn(),
      unMute: vi.fn(),
      isMuted: vi.fn(() => false),
      setPlaybackRate: vi.fn(),
      getPlaybackRate: vi.fn(() => 1),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      destroy: vi.fn()
    })),
    PlayerState: {
      UNSTARTED: -1,
      ENDED: 0,
      PLAYING: 1,
      PAUSED: 2,
      BUFFERING: 3,
      CUED: 5
    },
    ready: vi.fn((callback) => callback())
  },
  writable: true
})

// Mock IntersectionObserver
Object.defineProperty(window, 'IntersectionObserver', {
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  })),
  writable: true
})

// Mock ResizeObserver
Object.defineProperty(window, 'ResizeObserver', {
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  })),
  writable: true
})

// Mock MutationObserver
Object.defineProperty(window, 'MutationObserver', {
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => [])
  })),
  writable: true
})

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  },
  writable: true
})

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  },
  writable: true
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  })),
  writable: true
})

// Mock requestAnimationFrame
Object.defineProperty(window, 'requestAnimationFrame', {
  value: vi.fn((callback) => setTimeout(callback, 16)),
  writable: true
})

// Mock cancelAnimationFrame
Object.defineProperty(window, 'cancelAnimationFrame', {
  value: vi.fn((id) => clearTimeout(id)),
  writable: true
})

// Mock performance.now
Object.defineProperty(window.performance, 'now', {
  value: vi.fn(() => Date.now()),
  writable: true
})

// Mock fetch
global.fetch = vi.fn()

// Mock URL
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn()
  },
  writable: true
})

// 全局測試配置
config.global.mocks = {
  $t: (key: string) => key, // i18n mock
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  },
  $route: {
    path: '/',
    params: {},
    query: {},
    hash: '',
    fullPath: '/',
    matched: [],
    name: undefined,
    redirectedFrom: undefined
  }
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})