# Story 21: 測試套件

## 📋 基本資訊
- **Story ID**: YMP-021
- **Epic**: 系統完善
- **優先級**: Should Have (P1)
- **預估點數**: 10 points
- **預估時間**: 2-3 天
- **依賴關係**: Story 20
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 開發團隊  
**我希望** 建立完整的自動化測試套件  
**以便** 確保程式品質和功能正確性

## 📝 詳細需求

### 核心功能需求
1. **單元測試**: 覆蓋所有核心業務邏輯
2. **整合測試**: API端點和資料庫操作測試
3. **E2E測試**: 完整的用戶流程測試
4. **效能測試**: 負載和壓力測試
5. **測試報告**: 測試覆蓋率和結果報告

### 技術規格

**前端測試配置**:
```typescript
// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})
```

**前端測試工具設置**:
```typescript
// frontend/src/test/setup.ts
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
    }
  },
  writable: true
})

// Mock IntersectionObserver
Object.defineProperty(window, 'IntersectionObserver', {
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))
})

// Mock ResizeObserver
Object.defineProperty(window, 'ResizeObserver', {
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }))
})

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
  }
})

// 全局測試配置
config.global.mocks = {
  $t: (key: string) => key, // i18n mock
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn()
  },
  $route: {
    path: '/',
    params: {},
    query: {}
  }
}
```

**組件單元測試範例**:
```typescript
// frontend/src/components/player/__tests__/YouTubePlayer.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import YouTubePlayer from '../YouTubePlayer.vue'
import { usePlayerStore } from '@/stores/player'

describe('YouTubePlayer', () => {
  let wrapper: any
  let playerStore: any

  beforeEach(() => {
    setActivePinia(createPinia())
    playerStore = usePlayerStore()
    
    wrapper = mount(YouTubePlayer, {
      props: {
        videoId: 'dQw4w9WgXcQ',
        width: 640,
        height: 360
      }
    })
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('渲染YouTube播放器容器', () => {
    expect(wrapper.find('.youtube-player').exists()).toBe(true)
    expect(wrapper.find('#youtube-player').exists()).toBe(true)
  })

  it('初始化YouTube播放器', async () => {
    await wrapper.vm.initPlayer()
    expect(window.YT.Player).toHaveBeenCalledWith('youtube-player', {
      width: 640,
      height: 360,
      videoId: 'dQw4w9WgXcQ',
      playerVars: expect.any(Object),
      events: expect.any(Object)
    })
  })

  it('播放影片時更新Store狀態', async () => {
    const mockPlayer = {
      playVideo: vi.fn(),
      getCurrentTime: vi.fn(() => 10),
      getDuration: vi.fn(() => 100)
    }
    wrapper.vm.player = mockPlayer
    
    await wrapper.vm.play()
    
    expect(mockPlayer.playVideo).toHaveBeenCalled()
    expect(playerStore.setIsPlaying).toHaveBeenCalledWith(true)
  })

  it('暫停影片時更新Store狀態', async () => {
    const mockPlayer = {
      pauseVideo: vi.fn()
    }
    wrapper.vm.player = mockPlayer
    
    await wrapper.vm.pause()
    
    expect(mockPlayer.pauseVideo).toHaveBeenCalled()
    expect(playerStore.setIsPlaying).toHaveBeenCalledWith(false)
  })

  it('跳轉到指定時間', async () => {
    const mockPlayer = {
      seekTo: vi.fn()
    }
    wrapper.vm.player = mockPlayer
    
    await wrapper.vm.seekTo(50)
    
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(50, true)
  })

  it('處理播放器狀態變更', async () => {
    const mockEvent = { data: 1 } // PLAYING
    
    await wrapper.vm.onPlayerStateChange(mockEvent)
    
    expect(playerStore.setIsPlaying).toHaveBeenCalledWith(true)
    expect(playerStore.setPlayerState).toHaveBeenCalledWith(1)
  })

  it('清理播放器資源', async () => {
    const mockPlayer = {
      destroy: vi.fn()
    }
    wrapper.vm.player = mockPlayer
    
    wrapper.unmount()
    
    expect(mockPlayer.destroy).toHaveBeenCalled()
  })
})
```

**Store測試範例**:
```typescript
// frontend/src/stores/__tests__/player.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from '../player'

describe('Player Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始狀態正確', () => {
    const store = usePlayerStore()
    
    expect(store.currentVideoId).toBe('')
    expect(store.isPlaying).toBe(false)
    expect(store.currentTime).toBe(0)
    expect(store.duration).toBe(0)
    expect(store.volume).toBe(100)
    expect(store.isMuted).toBe(false)
    expect(store.playlist).toEqual([])
    expect(store.currentIndex).toBe(0)
    expect(store.repeatMode).toBe('none')
    expect(store.isShuffled).toBe(false)
  })

  it('載入影片', () => {
    const store = usePlayerStore()
    const videoData = {
      id: 'dQw4w9WgXcQ',
      title: 'Never Gonna Give You Up',
      duration: 213,
      thumbnail: 'https://example.com/thumb.jpg'
    }
    
    store.loadVideo(videoData)
    
    expect(store.currentVideoId).toBe('dQw4w9WgXcQ')
    expect(store.currentVideo).toEqual(videoData)
    expect(store.duration).toBe(213)
  })

  it('播放/暫停切換', () => {
    const store = usePlayerStore()
    
    store.togglePlayPause()
    expect(store.isPlaying).toBe(true)
    
    store.togglePlayPause()
    expect(store.isPlaying).toBe(false)
  })

  it('更新播放時間', () => {
    const store = usePlayerStore()
    
    store.updateCurrentTime(45)
    expect(store.currentTime).toBe(45)
    expect(store.progress).toBe(0) // duration為0時
    
    store.setDuration(100)
    store.updateCurrentTime(25)
    expect(store.progress).toBe(25)
  })

  it('音量控制', () => {
    const store = usePlayerStore()
    
    store.setVolume(50)
    expect(store.volume).toBe(50)
    expect(store.isMuted).toBe(false)
    
    store.toggleMute()
    expect(store.isMuted).toBe(true)
    
    store.toggleMute()
    expect(store.isMuted).toBe(false)
  })

  it('播放清單操作', () => {
    const store = usePlayerStore()
    const playlist = [
      { id: '1', title: 'Song 1' },
      { id: '2', title: 'Song 2' },
      { id: '3', title: 'Song 3' }
    ]
    
    store.setPlaylist(playlist)
    expect(store.playlist).toEqual(playlist)
    expect(store.canGoNext).toBe(true)
    expect(store.canGoPrevious).toBe(false)
    
    store.nextTrack()
    expect(store.currentIndex).toBe(1)
    expect(store.canGoPrevious).toBe(true)
    
    store.previousTrack()
    expect(store.currentIndex).toBe(0)
  })

  it('重複模式切換', () => {
    const store = usePlayerStore()
    
    expect(store.repeatMode).toBe('none')
    
    store.toggleRepeatMode()
    expect(store.repeatMode).toBe('one')
    
    store.toggleRepeatMode()
    expect(store.repeatMode).toBe('all')
    
    store.toggleRepeatMode()
    expect(store.repeatMode).toBe('none')
  })

  it('隨機播放', () => {
    const store = usePlayerStore()
    const playlist = Array.from({ length: 10 }, (_, i) => ({ 
      id: i.toString(), 
      title: `Song ${i}` 
    }))
    
    store.setPlaylist(playlist)
    store.toggleShuffle()
    
    expect(store.isShuffled).toBe(true)
    expect(store.shuffledPlaylist).not.toEqual(playlist)
    expect(store.shuffledPlaylist).toHaveLength(playlist.length)
  })
})
```

**後端API測試**:
```typescript
// backend/src/test/auth.test.ts
import request from 'supertest'
import { app } from '../app'
import { prisma } from '../config/database'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'

describe('Auth API', () => {
  beforeAll(async () => {
    // 測試資料庫設置
    await prisma.$connect()
  })

  afterAll(async () => {
    // 清理測試資料
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // 清理測試用戶
    await prisma.user.deleteMany()
  })

  describe('POST /api/auth/register', () => {
    it('成功註冊新用戶', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        nickname: 'TestUser'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe(userData.email)
      expect(response.body.data.user.nickname).toBe(userData.nickname)
      expect(response.body.data.accessToken).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()
    })

    it('拒絕重複的電子郵件', async () => {
      // 先建立一個用戶
      await prisma.user.create({
        data: {
          email: 'existing@example.com',
          password: 'hashedpassword',
          nickname: 'ExistingUser'
        }
      })

      const userData = {
        email: 'existing@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        nickname: 'NewUser'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS')
    })

    it('驗證密碼強度', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        confirmPassword: 'weak',
        nickname: 'TestUser'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // 建立測試用戶
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          nickname: 'TestUser'
        })
    })

    it('成功登入', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe(loginData.email)
      expect(response.body.data.accessToken).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()
    })

    it('拒絕無效密碼', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
    })

    it('拒絕不存在的用戶', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123!'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
    })
  })

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string

    beforeEach(async () => {
      // 註冊並登入獲取refresh token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          nickname: 'TestUser'
        })
      
      refreshToken = registerResponse.body.data.refreshToken
    })

    it('成功刷新token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.accessToken).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()
    })

    it('拒絕無效的refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('INVALID_TOKEN')
    })
  })
})
```

**E2E測試設置**:
```typescript
// frontend/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('用戶認證流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('完整的註冊和登入流程', async ({ page }) => {
    // 導航到註冊頁面
    await page.click('text=註冊')
    await expect(page).toHaveURL(/\/auth\/register/)

    // 填寫註冊表單
    await page.fill('[data-testid="email-input"]', 'e2e-test@example.com')
    await page.fill('[data-testid="password-input"]', 'Password123!')
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!')
    await page.fill('[data-testid="nickname-input"]', 'E2E Test User')

    // 提交註冊表單
    await page.click('[data-testid="register-button"]')

    // 驗證註冊成功並重導向到儀表板
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('text=歡迎, E2E Test User')).toBeVisible()

    // 登出
    await page.click('[data-testid="user-menu"]')
    await page.click('text=登出')
    await expect(page).toHaveURL(/\/auth\/login/)

    // 重新登入
    await page.fill('[data-testid="email-input"]', 'e2e-test@example.com')
    await page.fill('[data-testid="password-input"]', 'Password123!')
    await page.click('[data-testid="login-button"]')

    // 驗證登入成功
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('text=歡迎, E2E Test User')).toBeVisible()
  })

  test('播放清單管理流程', async ({ page }) => {
    // 先登入
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'Password123!')
    await page.click('[data-testid="login-button"]')

    // 前往播放清單頁面
    await page.click('text=播放清單')
    await expect(page).toHaveURL(/\/playlists/)

    // 建立新播放清單
    await page.click('[data-testid="create-playlist-button"]')
    await page.fill('[data-testid="playlist-name-input"]', '我的測試播放清單')
    await page.fill('[data-testid="playlist-description-input"]', '這是E2E測試用的播放清單')
    await page.click('[data-testid="save-playlist-button"]')

    // 驗證播放清單建立成功
    await expect(page.locator('text=我的測試播放清單')).toBeVisible()

    // 點擊進入播放清單詳情
    await page.click('text=我的測試播放清單')
    await expect(page).toHaveURL(/\/playlists\/\d+/)

    // 添加歌曲到播放清單
    await page.click('[data-testid="add-song-button"]')
    await page.fill('[data-testid="youtube-url-input"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await page.click('[data-testid="add-url-button"]')

    // 等待歌曲添加成功
    await expect(page.locator('text=Never Gonna Give You Up')).toBeVisible({ timeout: 10000 })

    // 播放歌曲
    await page.click('[data-testid="play-button"]')
    await expect(page.locator('[data-testid="youtube-player"]')).toBeVisible()
  })
})
```

**效能測試**:
```typescript
// backend/src/test/performance.test.ts
import { performance } from 'perf_hooks'
import request from 'supertest'
import { app } from '../app'
import { describe, it, expect } from 'vitest'

describe('API Performance Tests', () => {
  it('登入API回應時間應小於500ms', async () => {
    const startTime = performance.now()
    
    await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!'
      })
    
    const endTime = performance.now()
    const responseTime = endTime - startTime
    
    expect(responseTime).toBeLessThan(500)
  })

  it('播放清單API能處理併發請求', async () => {
    const concurrentRequests = 10
    const promises: Promise<any>[] = []
    
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        request(app)
          .get('/api/playlists')
          .set('Authorization', 'Bearer valid-token')
      )
    }
    
    const startTime = performance.now()
    const responses = await Promise.all(promises)
    const endTime = performance.now()
    
    // 所有請求都應該成功
    responses.forEach(response => {
      expect(response.status).toBe(200)
    })
    
    // 總處理時間應該合理
    const totalTime = endTime - startTime
    expect(totalTime).toBeLessThan(2000)
  })

  it('資料庫查詢效能測試', async () => {
    const startTime = performance.now()
    
    // 執行複雜的資料庫查詢
    await request(app)
      .get('/api/playlists/1/songs?limit=100')
      .set('Authorization', 'Bearer valid-token')
    
    const endTime = performance.now()
    const queryTime = endTime - startTime
    
    expect(queryTime).toBeLessThan(1000)
  })
})
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `frontend/vitest.config.ts` - 前端測試配置
- `frontend/src/test/setup.ts` - 測試環境設置
- `frontend/src/components/**/__tests__/*.test.ts` - 組件單元測試
- `frontend/src/stores/__tests__/*.test.ts` - Store測試
- `frontend/e2e/*.spec.ts` - E2E測試
- `backend/src/test/*.test.ts` - 後端API測試
- `backend/jest.config.js` - 後端測試配置

**更新檔案**:
- `frontend/package.json` - 添加測試依賴和腳本
- `backend/package.json` - 添加測試依賴和腳本
- `.github/workflows/test.yml` - CI/CD測試流程

## ✅ 驗收條件

### 測試覆蓋率驗收
- [ ] 前端代碼覆蓋率 > 80%
- [ ] 後端代碼覆蓋率 > 85%
- [ ] 關鍵業務邏輯覆蓋率 > 90%
- [ ] API端點測試完整

### 測試類型驗收
- [ ] 單元測試涵蓋所有組件和函數
- [ ] 整合測試涵蓋API和資料庫操作
- [ ] E2E測試涵蓋主要用戶流程
- [ ] 效能測試驗證回應時間

### 測試品質驗收
- [ ] 測試案例清楚易懂
- [ ] Mock設置正確完整
- [ ] 測試資料隔離
- [ ] 測試報告詳細準確

### CI/CD整合驗收
- [ ] 測試在CI管道中自動執行
- [ ] 測試失敗時阻止部署
- [ ] 測試報告自動生成
- [ ] 覆蓋率趨勢追蹤

## 🚀 實作指引

### Step 1: 設置測試環境
配置前端和後端測試框架

### Step 2: 撰寫單元測試
為組件、Store和API撰寫單元測試

### Step 3: 建立整合測試
測試API端點和資料庫操作

### Step 4: 實作E2E測試
建立完整的用戶流程測試

### Step 5: 整合到CI/CD
在持續集成管道中執行測試

## 📊 預期成果
- ✅ 高品質的測試套件
- ✅ 充分的測試覆蓋率
- ✅ 穩定的回歸測試
- ✅ 快速的問題發現
- ✅ 持續的品質保證