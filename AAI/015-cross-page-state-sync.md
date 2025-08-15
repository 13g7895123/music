# Story 15: 跨頁面狀態同步

## 📋 基本資訊
- **Story ID**: YMP-015
- **Epic**: 音樂播放系統
- **優先級**: Must Have (P0)
- **預估點數**: 6 points
- **預估時間**: 1-2 天
- **依賴關係**: Story 13, Story 14
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 已登入用戶  
**我希望** 在不同頁面間切換時音樂能持續播放且狀態保持同步  
**以便** 享受不間斷的音樂體驗

## 📝 詳細需求

### 核心功能需求
1. **狀態持久化**: 播放狀態在頁面切換時保持
2. **播放器同步**: 所有頁面的播放器狀態同步
3. **佇列保持**: 播放佇列在路由切換時維持
4. **進度同步**: 播放進度即時同步
5. **本地儲存**: 關鍵狀態存儲到localStorage

### 技術規格

**狀態同步組件**:
```vue
<!-- frontend/src/components/player/PlayerSync.vue -->
<template>
  <div class="player-sync">
    <!-- 全域播放器 - 隱藏但持續運行 -->
    <YouTubePlayer
      ref="globalPlayer"
      :video-id="currentSong?.youtubeId"
      :show-video="false"
      :width="1"
      :height="1"
      class="global-player"
      @ready="onPlayerReady"
      @state-change="onStateChange"
      @error="onPlayerError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '@/stores/player'
import YouTubePlayer from './YouTubePlayer.vue'

const playerStore = usePlayerStore()
const globalPlayer = ref()
const syncInterval = ref()

// 播放器事件處理
const onPlayerReady = (player: any) => {
  console.log('Global player ready')
  // 恢復之前的播放狀態
  restorePlayerState()
}

const onStateChange = (state: number) => {
  // 同步播放狀態到store
  playerStore.handleStateChange(state)
  
  // 保存狀態到localStorage
  savePlayerState()
}

const onPlayerError = (error: any) => {
  console.error('Global player error:', error)
  playerStore.handlePlayerError(error)
}

// 狀態保存和恢復
const savePlayerState = () => {
  const state = {
    currentSong: playerStore.currentSong,
    currentTime: globalPlayer.value?.getCurrentTime() || 0,
    volume: playerStore.volume,
    isPlaying: playerStore.isPlaying,
    queue: playerStore.queue,
    repeatMode: playerStore.repeatMode,
    isShuffle: playerStore.isShuffle,
    timestamp: Date.now()
  }
  
  localStorage.setItem('player-state', JSON.stringify(state))
}

const restorePlayerState = () => {
  const savedState = localStorage.getItem('player-state')
  if (!savedState) return
  
  try {
    const state = JSON.parse(savedState)
    
    // 檢查狀態是否過期（超過1小時）
    if (Date.now() - state.timestamp > 60 * 60 * 1000) {
      localStorage.removeItem('player-state')
      return
    }
    
    // 恢復播放器狀態
    if (state.currentSong) {
      playerStore.setCurrentSong(state.currentSong)
      
      if (globalPlayer.value) {
        globalPlayer.value.loadVideo(state.currentSong.youtubeId)
        globalPlayer.value.setVolume(state.volume)
        
        // 恢復播放進度
        setTimeout(() => {
          if (state.currentTime > 0) {
            globalPlayer.value.seekTo(state.currentTime)
          }
          
          if (state.isPlaying) {
            globalPlayer.value.play()
          }
        }, 1000)
      }
    }
    
    // 恢復其他狀態
    playerStore.setVolume(state.volume)
    playerStore.setQueue(state.queue || [])
    playerStore.setRepeatMode(state.repeatMode || 'none')
    playerStore.setShuffle(state.isShuffle || false)
    
  } catch (error) {
    console.error('Failed to restore player state:', error)
    localStorage.removeItem('player-state')
  }
}

// 定期同步播放進度
const startProgressSync = () => {
  syncInterval.value = setInterval(() => {
    if (globalPlayer.value && playerStore.isPlaying) {
      const currentTime = globalPlayer.value.getCurrentTime()
      const duration = globalPlayer.value.getDuration()
      
      playerStore.setCurrentTime(currentTime)
      playerStore.setDuration(duration)
      
      // 每30秒保存一次狀態
      if (Math.floor(currentTime) % 30 === 0) {
        savePlayerState()
      }
    }
  }, 1000)
}

const stopProgressSync = () => {
  if (syncInterval.value) {
    clearInterval(syncInterval.value)
    syncInterval.value = null
  }
}

// 監聽播放器命令
watch(() => playerStore.playerCommands, (commands) => {
  if (!commands || !globalPlayer.value) return
  
  if (commands.play) {
    globalPlayer.value.play()
  } else if (commands.pause) {
    globalPlayer.value.pause()
  }
  
  if (commands.volume !== undefined) {
    globalPlayer.value.setVolume(commands.volume)
  }
  
  if (commands.seekTo !== undefined) {
    globalPlayer.value.seekTo(commands.seekTo)
  }
  
  if (commands.loadVideo) {
    globalPlayer.value.loadVideo(commands.loadVideo)
  }
})

// 監聽歌曲變化
watch(() => playerStore.currentSong, (newSong) => {
  if (newSong && globalPlayer.value) {
    globalPlayer.value.loadVideo(newSong.youtubeId)
  }
})

// 頁面可見性變化處理
const handleVisibilityChange = () => {
  if (document.hidden) {
    // 頁面隱藏時保存狀態
    savePlayerState()
  } else {
    // 頁面顯示時檢查是否需要同步
    const savedState = localStorage.getItem('player-state')
    if (savedState) {
      try {
        const state = JSON.parse(savedState)
        if (Date.now() - state.timestamp < 5000) {
          // 如果狀態很新，可能是其他標籤頁更新的，需要同步
          restorePlayerState()
        }
      } catch (error) {
        console.error('Failed to sync player state:', error)
      }
    }
  }
}

// 窗口關閉前保存狀態
const handleBeforeUnload = () => {
  savePlayerState()
}

onMounted(() => {
  startProgressSync()
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  stopProgressSync()
  savePlayerState()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style scoped>
.global-player {
  position: fixed;
  top: -100px;
  left: -100px;
  pointer-events: none;
  z-index: -1;
}
</style>
```

**增強的播放器Store**:
```typescript
// frontend/src/stores/player.ts (追加部分)
export const usePlayerStore = defineStore('player', () => {
  // ... 現有代碼

  // 狀態同步方法
  const setCurrentSong = (song: Song | null) => {
    currentSong.value = song
    saveToLocalStorage()
  }

  const setQueue = (newQueue: Song[]) => {
    queue.value = newQueue
    saveToLocalStorage()
  }

  const setRepeatMode = (mode: 'none' | 'one' | 'all') => {
    repeatMode.value = mode
    saveToLocalStorage()
  }

  const setShuffle = (shuffle: boolean) => {
    isShuffle.value = shuffle
    saveToLocalStorage()
  }

  const handleStateChange = (state: number) => {
    const YT_PLAYER_STATE = {
      UNSTARTED: -1,
      ENDED: 0,
      PLAYING: 1,
      PAUSED: 2,
      BUFFERING: 3,
      CUED: 5
    }

    switch (state) {
      case YT_PLAYER_STATE.PLAYING:
        setPlaying(true)
        break
      case YT_PLAYER_STATE.PAUSED:
        setPlaying(false)
        break
      case YT_PLAYER_STATE.ENDED:
        setPlaying(false)
        playNext()
        break
    }
  }

  const handlePlayerError = (error: any) => {
    console.error('Player error:', error)
    // 自動跳到下一首
    setTimeout(() => {
      playNext()
    }, 2000)
  }

  // 本地儲存
  const saveToLocalStorage = () => {
    try {
      const state = {
        currentSong: currentSong.value,
        volume: volume.value,
        queue: queue.value,
        repeatMode: repeatMode.value,
        isShuffle: isShuffle.value,
        timestamp: Date.now()
      }
      localStorage.setItem('player-preferences', JSON.stringify(state))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  }

  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem('player-preferences')
      if (!saved) return

      const state = JSON.parse(saved)
      
      // 恢復偏好設定
      if (state.volume !== undefined) {
        volume.value = state.volume
      }
      if (state.repeatMode) {
        repeatMode.value = state.repeatMode
      }
      if (state.isShuffle !== undefined) {
        isShuffle.value = state.isShuffle
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error)
    }
  }

  // 跨標籤頁通信
  const setupCrossTabSync = () => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'player-state' && event.newValue) {
        try {
          const newState = JSON.parse(event.newValue)
          
          // 同步播放狀態（不包括當前歌曲，避免衝突）
          if (newState.volume !== undefined && newState.volume !== volume.value) {
            setVolume(newState.volume)
          }
          
          if (newState.isPlaying !== undefined && newState.isPlaying !== isPlaying.value) {
            setPlaying(newState.isPlaying)
          }
          
        } catch (error) {
          console.error('Failed to sync across tabs:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }

  return {
    // ... 現有返回值
    
    // 新增的同步方法
    setCurrentSong,
    setQueue,
    setRepeatMode,
    setShuffle,
    handleStateChange,
    handlePlayerError,
    saveToLocalStorage,
    loadFromLocalStorage,
    setupCrossTabSync
  }
})
```

**路由守衛增強**:
```typescript
// frontend/src/router/index.ts (追加部分)
import { usePlayerStore } from '@/stores/player'

router.beforeEach((to, from, next) => {
  const playerStore = usePlayerStore()
  
  // 在路由切換時保存播放器狀態
  playerStore.saveToLocalStorage()
  
  next()
})

router.afterEach(() => {
  const playerStore = usePlayerStore()
  
  // 路由切換後確保播放器狀態同步
  setTimeout(() => {
    playerStore.loadFromLocalStorage()
  }, 100)
})
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `frontend/src/components/player/PlayerSync.vue` - 狀態同步組件
- `frontend/src/composables/usePlayerSync.ts` - 同步邏輯Composable
- `frontend/src/utils/storage.ts` - 本地儲存工具

**更新檔案**:
- `frontend/src/stores/player.ts` - 增強狀態管理
- `frontend/src/router/index.ts` - 添加路由守衛
- `frontend/src/App.vue` - 集成全域播放器

## ✅ 驗收條件

### 功能驗收
- [ ] 頁面切換時音樂持續播放
- [ ] 播放狀態在所有頁面同步
- [ ] 頁面刷新後狀態正確恢復
- [ ] 播放進度即時同步
- [ ] 佇列狀態正確保持

### 持久化驗收
- [ ] 關閉瀏覽器後重新開啟狀態恢復
- [ ] localStorage數據結構正確
- [ ] 過期狀態自動清理
- [ ] 跨標籤頁狀態同步

### 效能驗收
- [ ] 狀態同步不影響頁面效能
- [ ] 路由切換流暢
- [ ] 記憶體使用合理

## 🚀 實作指引

### Step 1: 建立全域播放器
創建隱藏的全域YouTube播放器

### Step 2: 實作狀態同步
建立PlayerSync組件處理狀態同步

### Step 3: 增強Store
添加狀態持久化和同步方法

### Step 4: 集成到App
在App.vue中集成狀態同步功能

## 📊 預期成果
- ✅ 無縫的跨頁面播放體驗
- ✅ 可靠的狀態持久化
- ✅ 即時的狀態同步
- ✅ 智能的錯誤恢復
- ✅ 優秀的用戶體驗