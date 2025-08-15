# Story 13: YouTube播放器整合

## 📋 基本資訊
- **Story ID**: YMP-013
- **Epic**: 音樂播放系統
- **優先級**: Must Have (P0)
- **預估點數**: 12 points
- **預估時間**: 3 天
- **依賴關係**: Story 7, Story 11
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 已登入用戶  
**我希望** 能夠使用YouTube iframe API播放音樂  
**以便** 在應用程式中直接播放YouTube影片中的音樂

## 📝 詳細需求

### 核心功能需求
1. **YouTube iframe整合**: 嵌入YouTube播放器
2. **播放控制**: 播放、暫停、跳轉、音量控制
3. **條件式顯示**: 播放頁面顯示影片，其他頁面隱藏
4. **狀態監聽**: 監聽播放狀態變化
5. **錯誤處理**: 處理影片不可用等錯誤

### 技術規格

**YouTube播放器組件**:
```vue
<!-- frontend/src/components/player/YouTubePlayer.vue -->
<template>
  <div
    class="youtube-player-container"
    :class="{
      'video-visible': showVideo,
      'video-hidden': !showVideo,
      'fullscreen': isFullscreen
    }"
  >
    <!-- YouTube iframe 容器 -->
    <div
      id="youtube-player"
      class="youtube-iframe"
      :style="playerStyle"
    ></div>
    
    <!-- 覆蓋層，用於隱藏影片時的占位 -->
    <div
      v-if="!showVideo"
      class="player-overlay"
      :style="overlayStyle"
    >
      <div class="audio-only-indicator">
        <div class="audio-icon">🎵</div>
        <p>音訊播放中</p>
        <button 
          @click="showVideoMode"
          class="show-video-btn"
        >
          顯示影片
        </button>
      </div>
    </div>

    <!-- 載入狀態 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
      <p>載入中...</p>
    </div>

    <!-- 錯誤狀態 -->
    <div v-if="error" class="error-overlay">
      <div class="error-icon">❌</div>
      <p>{{ error }}</p>
      <button @click="retryLoad" class="retry-btn">
        重試
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePlayerStore } from '@/stores/player'

interface Props {
  videoId?: string
  autoplay?: boolean
  showVideo?: boolean
  width?: number
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoplay: false,
  showVideo: true,
  width: 640,
  height: 360
})

const emit = defineEmits<{
  ready: [player: any]
  stateChange: [state: number]
  error: [error: any]
}>()

const route = useRoute()
const playerStore = usePlayerStore()

const player = ref<any>(null)
const isLoading = ref(false)
const error = ref('')
const isFullscreen = ref(false)

const playerStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
  display: props.showVideo ? 'block' : 'none'
}))

const overlayStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`
}))

// YouTube Player API 狀態常數
const YT_PLAYER_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5
}

const initializePlayer = () => {
  if (!window.YT || !window.YT.Player) {
    loadYouTubeAPI()
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    player.value = new window.YT.Player('youtube-player', {
      width: props.width,
      height: props.height,
      videoId: props.videoId || '',
      playerVars: {
        autoplay: props.autoplay ? 1 : 0,
        controls: 1,
        rel: 0,
        showinfo: 0,
        modestbranding: 1,
        fs: 1,
        cc_load_policy: 0,
        iv_load_policy: 3,
        origin: window.location.origin
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError
      }
    })
  } catch (err: any) {
    error.value = '播放器初始化失敗'
    console.error('YouTube Player initialization failed:', err)
  }
}

const loadYouTubeAPI = () => {
  if (window.YT) return

  const tag = document.createElement('script')
  tag.src = 'https://www.youtube.com/iframe_api'
  const firstScriptTag = document.getElementsByTagName('script')[0]
  firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

  // 設置全域回調
  window.onYouTubeIframeAPIReady = () => {
    initializePlayer()
  }
}

const onPlayerReady = (event: any) => {
  isLoading.value = false
  console.log('YouTube Player is ready')
  
  // 設置初始音量
  if (playerStore.volume !== undefined) {
    event.target.setVolume(playerStore.volume * 100)
  }

  emit('ready', event.target)
}

const onPlayerStateChange = (event: any) => {
  const state = event.data
  console.log('Player state changed:', state)

  switch (state) {
    case YT_PLAYER_STATE.PLAYING:
      playerStore.setPlaying(true)
      break
    case YT_PLAYER_STATE.PAUSED:
      playerStore.setPlaying(false)
      break
    case YT_PLAYER_STATE.ENDED:
      playerStore.setPlaying(false)
      playerStore.playNext()
      break
    case YT_PLAYER_STATE.BUFFERING:
      // 可以顯示緩衝狀態
      break
  }

  emit('stateChange', state)
}

const onPlayerError = (event: any) => {
  const errorCode = event.data
  let errorMessage = '播放發生錯誤'

  switch (errorCode) {
    case 2:
      errorMessage = '無效的影片ID'
      break
    case 5:
      errorMessage = 'HTML5播放器錯誤'
      break
    case 100:
      errorMessage = '影片不存在或已被移除'
      break
    case 101:
    case 150:
      errorMessage = '影片禁止嵌入播放'
      break
  }

  error.value = errorMessage
  isLoading.value = false
  
  console.error('YouTube Player error:', errorCode, errorMessage)
  emit('error', { code: errorCode, message: errorMessage })

  // 自動跳到下一首
  setTimeout(() => {
    playerStore.playNext()
  }, 3000)
}

const retryLoad = () => {
  error.value = ''
  if (props.videoId) {
    loadVideo(props.videoId)
  }
}

const loadVideo = (videoId: string) => {
  if (!player.value) {
    initializePlayer()
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    player.value.loadVideoById(videoId)
  } catch (err) {
    error.value = '載入影片失敗'
    isLoading.value = false
  }
}

const play = () => {
  if (player.value && player.value.playVideo) {
    player.value.playVideo()
  }
}

const pause = () => {
  if (player.value && player.value.pauseVideo) {
    player.value.pauseVideo()
  }
}

const stop = () => {
  if (player.value && player.value.stopVideo) {
    player.value.stopVideo()
  }
}

const setVolume = (volume: number) => {
  if (player.value && player.value.setVolume) {
    player.value.setVolume(Math.max(0, Math.min(100, volume * 100)))
  }
}

const seekTo = (seconds: number) => {
  if (player.value && player.value.seekTo) {
    player.value.seekTo(seconds, true)
  }
}

const getDuration = (): number => {
  if (player.value && player.value.getDuration) {
    return player.value.getDuration()
  }
  return 0
}

const getCurrentTime = (): number => {
  if (player.value && player.value.getCurrentTime) {
    return player.value.getCurrentTime()
  }
  return 0
}

const getPlayerState = (): number => {
  if (player.value && player.value.getPlayerState) {
    return player.value.getPlayerState()
  }
  return YT_PLAYER_STATE.UNSTARTED
}

const showVideoMode = () => {
  // 通知父組件顯示影片模式
  playerStore.setVideoVisible(true)
}

const enterFullscreen = () => {
  if (player.value && player.value.getIframe) {
    const iframe = player.value.getIframe()
    if (iframe.requestFullscreen) {
      iframe.requestFullscreen()
      isFullscreen.value = true
    }
  }
}

const exitFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

// 監聽 videoId 變化
watch(() => props.videoId, (newVideoId) => {
  if (newVideoId && player.value) {
    loadVideo(newVideoId)
  }
})

// 監聽播放器控制命令
watch(() => playerStore.playerCommands, (commands) => {
  if (!commands || !player.value) return

  if (commands.play) {
    play()
  } else if (commands.pause) {
    pause()
  }

  if (commands.volume !== undefined) {
    setVolume(commands.volume)
  }

  if (commands.seekTo !== undefined) {
    seekTo(commands.seekTo)
  }

  // 清除命令
  playerStore.clearCommands()
})

// 暴露方法給父組件
defineExpose({
  play,
  pause,
  stop,
  setVolume,
  seekTo,
  getDuration,
  getCurrentTime,
  getPlayerState,
  loadVideo,
  enterFullscreen,
  exitFullscreen
})

onMounted(() => {
  // 延遲初始化，確保DOM準備就緒
  setTimeout(() => {
    initializePlayer()
  }, 100)

  // 監聽全螢幕變化
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
  })
})

onUnmounted(() => {
  if (player.value && player.value.destroy) {
    player.value.destroy()
  }
})
</script>

<style scoped>
.youtube-player-container {
  position: relative;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.youtube-iframe {
  border-radius: 8px;
}

.player-overlay {
  position: absolute;
  top: 0;
  left: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.audio-only-indicator {
  text-align: center;
  color: white;
}

.audio-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  animation: pulse 2s infinite;
}

.show-video-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  border-radius: 8px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.retry-btn {
  background: #ff4444;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
}

.video-hidden .youtube-iframe {
  display: none;
}

.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 9999;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
```

**播放器狀態管理**:
```typescript
// frontend/src/stores/player.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface Song {
  id: number
  youtubeId: string
  title: string
  artist?: string
  duration?: number
  thumbnailUrl?: string
}

interface PlayerCommands {
  play?: boolean
  pause?: boolean
  volume?: number
  seekTo?: number
}

export const usePlayerStore = defineStore('player', () => {
  // 播放狀態
  const currentSong = ref<Song | null>(null)
  const currentPlaylist = ref<any>(null)
  const currentIndex = ref(0)
  const isPlaying = ref(false)
  const volume = ref(0.7)
  const currentTime = ref(0)
  const duration = ref(0)
  const isLoading = ref(false)

  // UI狀態
  const isVideoVisible = ref(false)
  const isFullscreen = ref(false)
  const showPlayer = ref(false)

  // 播放模式
  const isRepeat = ref(false)
  const isShuffle = ref(false)
  const repeatMode = ref<'none' | 'one' | 'all'>('none')

  // 播放佇列
  const queue = ref<Song[]>([])
  const history = ref<Song[]>([])

  // 播放器控制命令
  const playerCommands = ref<PlayerCommands | null>(null)

  // Computed
  const hasNext = computed(() => {
    if (!currentPlaylist.value) return false
    return currentIndex.value < currentPlaylist.value.songs.length - 1
  })

  const hasPrev = computed(() => {
    return currentIndex.value > 0 || history.value.length > 0
  })

  const progress = computed(() => {
    if (duration.value === 0) return 0
    return (currentTime.value / duration.value) * 100
  })

  // Actions
  const loadPlaylist = async (playlistId: number, shuffle = false) => {
    try {
      isLoading.value = true
      
      // 這裡應該從API載入播放清單
      // const playlist = await playlistAPI.getPlaylist(playlistId)
      // currentPlaylist.value = playlist
      
      if (shuffle) {
        shufflePlaylist()
      }
      
      currentIndex.value = 0
      if (currentPlaylist.value?.songs.length > 0) {
        currentSong.value = currentPlaylist.value.songs[0].song
        showPlayer.value = true
      }
    } catch (error) {
      console.error('Failed to load playlist:', error)
    } finally {
      isLoading.value = false
    }
  }

  const play = () => {
    playerCommands.value = { play: true }
    isPlaying.value = true
  }

  const pause = () => {
    playerCommands.value = { pause: true }
    isPlaying.value = false
  }

  const playNext = () => {
    if (repeatMode.value === 'one') {
      // 重複播放當前歌曲
      play()
      return
    }

    if (queue.value.length > 0) {
      // 播放佇列中的下一首
      const nextSong = queue.value.shift()
      if (currentSong.value) {
        history.value.push(currentSong.value)
      }
      currentSong.value = nextSong!
      play()
      return
    }

    if (!currentPlaylist.value) return

    const songs = currentPlaylist.value.songs
    let nextIndex = currentIndex.value + 1

    if (nextIndex >= songs.length) {
      if (repeatMode.value === 'all') {
        nextIndex = 0
      } else {
        // 播放結束
        pause()
        return
      }
    }

    if (currentSong.value) {
      history.value.push(currentSong.value)
    }

    currentIndex.value = nextIndex
    currentSong.value = songs[nextIndex].song
    play()
  }

  const playPrev = () => {
    if (history.value.length > 0) {
      // 從歷史記錄播放
      const prevSong = history.value.pop()
      if (currentSong.value && currentPlaylist.value) {
        // 將當前歌曲加回佇列前面
        queue.value.unshift(currentSong.value)
      }
      currentSong.value = prevSong!
      play()
      return
    }

    if (!currentPlaylist.value) return

    const songs = currentPlaylist.value.songs
    let prevIndex = currentIndex.value - 1

    if (prevIndex < 0) {
      if (repeatMode.value === 'all') {
        prevIndex = songs.length - 1
      } else {
        return
      }
    }

    currentIndex.value = prevIndex
    currentSong.value = songs[prevIndex].song
    play()
  }

  const playAt = (index: number) => {
    if (!currentPlaylist.value || index < 0 || index >= currentPlaylist.value.songs.length) {
      return
    }

    if (currentSong.value) {
      history.value.push(currentSong.value)
    }

    currentIndex.value = index
    currentSong.value = currentPlaylist.value.songs[index].song
    play()
  }

  const setVolume = (newVolume: number) => {
    volume.value = Math.max(0, Math.min(1, newVolume))
    playerCommands.value = { volume: volume.value }
  }

  const seekTo = (seconds: number) => {
    currentTime.value = seconds
    playerCommands.value = { seekTo: seconds }
  }

  const addToQueue = (song: Song) => {
    queue.value.push(song)
  }

  const removeFromQueue = (index: number) => {
    queue.value.splice(index, 1)
  }

  const clearQueue = () => {
    queue.value = []
  }

  const shufflePlaylist = () => {
    if (!currentPlaylist.value) return
    
    const songs = [...currentPlaylist.value.songs]
    for (let i = songs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[songs[i], songs[j]] = [songs[j], songs[i]]
    }
    currentPlaylist.value.songs = songs
  }

  const toggleShuffle = () => {
    isShuffle.value = !isShuffle.value
    if (isShuffle.value && currentPlaylist.value) {
      shufflePlaylist()
    }
  }

  const toggleRepeat = () => {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all']
    const currentModeIndex = modes.indexOf(repeatMode.value)
    repeatMode.value = modes[(currentModeIndex + 1) % modes.length]
  }

  const setPlaying = (playing: boolean) => {
    isPlaying.value = playing
  }

  const setCurrentTime = (time: number) => {
    currentTime.value = time
  }

  const setDuration = (dur: number) => {
    duration.value = dur
  }

  const setVideoVisible = (visible: boolean) => {
    isVideoVisible.value = visible
  }

  const clearCommands = () => {
    playerCommands.value = null
  }

  return {
    // State
    currentSong,
    currentPlaylist,
    currentIndex,
    isPlaying,
    volume,
    currentTime,
    duration,
    isLoading,
    isVideoVisible,
    isFullscreen,
    showPlayer,
    isRepeat,
    isShuffle,
    repeatMode,
    queue,
    history,
    playerCommands,

    // Computed
    hasNext,
    hasPrev,
    progress,

    // Actions
    loadPlaylist,
    play,
    pause,
    playNext,
    playPrev,
    playAt,
    setVolume,
    seekTo,
    addToQueue,
    removeFromQueue,
    clearQueue,
    shufflePlaylist,
    toggleShuffle,
    toggleRepeat,
    setPlaying,
    setCurrentTime,
    setDuration,
    setVideoVisible,
    clearCommands
  }
})
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `frontend/src/components/player/YouTubePlayer.vue` - YouTube播放器組件
- `frontend/src/stores/player.ts` - 播放器狀態管理
- `frontend/src/types/youtube.d.ts` - YouTube API型別定義
- `frontend/src/utils/youtube.ts` - YouTube API工具函數

**更新檔案**:
- `frontend/public/index.html` - 添加YouTube API script標籤
- `frontend/src/views/PlayerView.vue` - 播放器頁面

## ✅ 驗收條件

### 功能驗收
- [ ] YouTube播放器可以正常初始化
- [ ] 播放、暫停、跳轉控制正常
- [ ] 音量控制功能正常
- [ ] 播放狀態監聽正確
- [ ] 條件式影片顯示功能正常

### 錯誤處理驗收
- [ ] 無效影片ID有適當錯誤處理
- [ ] 受限制影片有適當提示
- [ ] 網路錯誤有重試機制
- [ ] 播放器初始化失敗有適當處理

### 整合驗收
- [ ] 與播放器狀態管理正常整合
- [ ] 播放佇列功能正常
- [ ] 播放模式切換正常

## 🚀 實作指引

### Step 1: 設置YouTube API
在public/index.html中添加YouTube iframe API

### Step 2: 建立播放器組件
按照技術規格建立YouTubePlayer.vue

### Step 3: 實作狀態管理
建立完整的player.ts store

### Step 4: 測試播放功能
測試各種播放控制功能

## 📊 預期成果
- ✅ 功能完整的YouTube播放器
- ✅ 靈活的條件式顯示
- ✅ 穩定的狀態管理
- ✅ 完善的錯誤處理
- ✅ 良好的用戶體驗