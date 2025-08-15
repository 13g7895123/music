# Story 14: 播放控制系統

## 📋 基本資訊
- **Story ID**: YMP-014
- **Epic**: 音樂播放系統
- **優先級**: Must Have (P0)
- **預估點數**: 8 points
- **預估時間**: 2 天
- **依賴關係**: Story 13
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 已登入用戶  
**我希望** 有完整的播放控制介面  
**以便** 方便地控制音樂播放、調整音量和管理播放佇列

## 📝 詳細需求

### 核心功能需求
1. **基本控制**: 播放/暫停、上一首/下一首、重複/隨機
2. **進度控制**: 播放進度條、時間顯示、跳轉控制
3. **音量控制**: 音量滑桿、靜音切換
4. **播放模式**: 順序播放、單曲重複、列表重複、隨機播放
5. **佇列管理**: 顯示播放佇列、添加到佇列、佇列重排

### 技術規格

**播放控制組件**:
```vue
<!-- frontend/src/components/player/PlaybackControls.vue -->
<template>
  <div class="playback-controls">
    <!-- 歌曲資訊區域 -->
    <div class="current-song-info">
      <div class="song-thumbnail">
        <img
          v-if="currentSong?.thumbnailUrl"
          :src="currentSong.thumbnailUrl"
          :alt="currentSong.title"
          class="thumbnail-image"
        />
        <div v-else class="thumbnail-placeholder">🎵</div>
      </div>
      
      <div class="song-details">
        <h4 class="song-title">
          {{ currentSong?.title || '未選擇歌曲' }}
        </h4>
        <p class="song-artist">
          {{ currentSong?.artist || '未知藝術家' }}
        </p>
      </div>
    </div>

    <!-- 主要控制區域 -->
    <div class="main-controls">
      <div class="control-buttons">
        <!-- 隨機播放 -->
        <button
          @click="toggleShuffle"
          :class="{ active: isShuffle }"
          class="control-btn shuffle-btn"
          title="隨機播放"
        >
          🔀
        </button>

        <!-- 上一首 -->
        <button
          @click="playPrev"
          :disabled="!hasPrev"
          class="control-btn prev-btn"
          title="上一首"
        >
          ⏮️
        </button>

        <!-- 播放/暫停 -->
        <button
          @click="togglePlay"
          :disabled="!currentSong"
          class="control-btn play-btn main-play-btn"
          :title="isPlaying ? '暫停' : '播放'"
        >
          {{ isPlaying ? '⏸️' : '▶️' }}
        </button>

        <!-- 下一首 -->
        <button
          @click="playNext"
          :disabled="!hasNext && queue.length === 0"
          class="control-btn next-btn"
          title="下一首"
        >
          ⏭️
        </button>

        <!-- 重複播放 -->
        <button
          @click="toggleRepeat"
          :class="{ active: repeatMode !== 'none' }"
          class="control-btn repeat-btn"
          :title="getRepeatTitle()"
        >
          {{ getRepeatIcon() }}
        </button>
      </div>

      <!-- 進度控制 -->
      <div class="progress-section">
        <span class="time-display current-time">
          {{ formatTime(currentTime) }}
        </span>
        
        <div
          class="progress-bar-container"
          @click="onProgressClick"
          ref="progressContainer"
        >
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${progress}%` }"
            ></div>
            <div
              class="progress-handle"
              :style="{ left: `${progress}%` }"
              @mousedown="startProgressDrag"
            ></div>
          </div>
        </div>
        
        <span class="time-display total-time">
          {{ formatTime(duration) }}
        </span>
      </div>
    </div>

    <!-- 輔助控制區域 -->
    <div class="secondary-controls">
      <!-- 音量控制 -->
      <div class="volume-control">
        <button
          @click="toggleMute"
          class="control-btn volume-btn"
          :title="isMuted ? '取消靜音' : '靜音'"
        >
          {{ getVolumeIcon() }}
        </button>
        
        <div class="volume-slider-container">
          <input
            type="range"
            min="0"
            max="100"
            :value="displayVolume"
            @input="onVolumeChange"
            class="volume-slider"
          />
        </div>
      </div>

      <!-- 佇列和其他控制 -->
      <div class="additional-controls">
        <button
          @click="toggleQueue"
          :class="{ active: showQueue }"
          class="control-btn queue-btn"
          :title="`播放佇列 (${queue.length})`"
        >
          📋 {{ queue.length > 0 ? queue.length : '' }}
        </button>

        <button
          @click="toggleVideoMode"
          :class="{ active: isVideoVisible }"
          class="control-btn video-btn"
          title="切換影片模式"
        >
          {{ isVideoVisible ? '🎵' : '📺' }}
        </button>

        <button
          @click="toggleFullscreen"
          class="control-btn fullscreen-btn"
          title="全螢幕"
        >
          ⛶
        </button>
      </div>
    </div>

    <!-- 播放佇列 -->
    <div v-if="showQueue" class="queue-panel">
      <div class="queue-header">
        <h3>播放佇列</h3>
        <button @click="clearQueue" class="clear-queue-btn">
          清空佇列
        </button>
      </div>
      
      <div v-if="queue.length === 0" class="empty-queue">
        <p>佇列是空的</p>
      </div>
      
      <draggable
        v-else
        v-model="queue"
        @end="onQueueReorder"
        item-key="id"
        class="queue-list"
      >
        <template #item="{ element: song, index }">
          <div class="queue-item">
            <div class="queue-song-info">
              <img
                v-if="song.thumbnailUrl"
                :src="song.thumbnailUrl"
                :alt="song.title"
                class="queue-thumbnail"
              />
              <div class="queue-song-details">
                <h5>{{ song.title }}</h5>
                <p>{{ song.artist || '未知藝術家' }}</p>
              </div>
            </div>
            
            <div class="queue-actions">
              <button
                @click="playFromQueue(index)"
                class="queue-action-btn"
                title="立即播放"
              >
                ▶️
              </button>
              <button
                @click="removeFromQueue(index)"
                class="queue-action-btn remove"
                title="從佇列移除"
              >
                ✕
              </button>
            </div>
          </div>
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '@/stores/player'
import draggable from 'vuedraggable'

const playerStore = usePlayerStore()

// Refs
const progressContainer = ref<HTMLElement>()
const isDragging = ref(false)
const showQueue = ref(false)
const isMuted = ref(false)
const volumeBeforeMute = ref(0.7)

// Computed properties
const currentSong = computed(() => playerStore.currentSong)
const isPlaying = computed(() => playerStore.isPlaying)
const currentTime = computed(() => playerStore.currentTime)
const duration = computed(() => playerStore.duration)
const progress = computed(() => playerStore.progress)
const volume = computed(() => playerStore.volume)
const queue = computed({
  get: () => playerStore.queue,
  set: (value) => playerStore.updateQueue(value)
})
const hasNext = computed(() => playerStore.hasNext)
const hasPrev = computed(() => playerStore.hasPrev)
const isShuffle = computed(() => playerStore.isShuffle)
const repeatMode = computed(() => playerStore.repeatMode)
const isVideoVisible = computed(() => playerStore.isVideoVisible)

const displayVolume = computed(() => isMuted.value ? 0 : volume.value * 100)

// Methods
const togglePlay = () => {
  if (isPlaying.value) {
    playerStore.pause()
  } else {
    playerStore.play()
  }
}

const playNext = () => {
  playerStore.playNext()
}

const playPrev = () => {
  playerStore.playPrev()
}

const toggleShuffle = () => {
  playerStore.toggleShuffle()
}

const toggleRepeat = () => {
  playerStore.toggleRepeat()
}

const getRepeatTitle = () => {
  switch (repeatMode.value) {
    case 'one': return '單曲重複'
    case 'all': return '列表重複'
    default: return '重複播放'
  }
}

const getRepeatIcon = () => {
  switch (repeatMode.value) {
    case 'one': return '🔂'
    case 'all': return '🔁'
    default: return '🔁'
  }
}

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '0:00'
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

const onProgressClick = (event: MouseEvent) => {
  if (!progressContainer.value || !duration.value) return
  
  const rect = progressContainer.value.getBoundingClientRect()
  const percentage = (event.clientX - rect.left) / rect.width
  const newTime = percentage * duration.value
  
  playerStore.seekTo(newTime)
}

const startProgressDrag = (event: MouseEvent) => {
  isDragging.value = true
  event.preventDefault()
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.value || !progressContainer.value || !duration.value) return
    
    const rect = progressContainer.value.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = percentage * duration.value
    
    playerStore.seekTo(newTime)
  }
  
  const handleMouseUp = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const onVolumeChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const newVolume = parseInt(target.value) / 100
  
  if (isMuted.value) {
    isMuted.value = false
  }
  
  playerStore.setVolume(newVolume)
}

const toggleMute = () => {
  if (isMuted.value) {
    isMuted.value = false
    playerStore.setVolume(volumeBeforeMute.value)
  } else {
    volumeBeforeMute.value = volume.value
    isMuted.value = true
    playerStore.setVolume(0)
  }
}

const getVolumeIcon = () => {
  if (isMuted.value || volume.value === 0) return '🔇'
  if (volume.value < 0.3) return '🔈'
  if (volume.value < 0.7) return '🔉'
  return '🔊'
}

const toggleQueue = () => {
  showQueue.value = !showQueue.value
}

const clearQueue = () => {
  playerStore.clearQueue()
}

const playFromQueue = (index: number) => {
  const song = queue.value[index]
  playerStore.removeFromQueue(index)
  playerStore.playSong(song)
}

const removeFromQueue = (index: number) => {
  playerStore.removeFromQueue(index)
}

const onQueueReorder = () => {
  // 佇列重排序已經通過 v-model 自動處理
}

const toggleVideoMode = () => {
  playerStore.setVideoVisible(!isVideoVisible.value)
}

const toggleFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    document.documentElement.requestFullscreen()
  }
}

// 鍵盤快捷鍵
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return // 在輸入框中不處理快捷鍵
  }
  
  switch (event.code) {
    case 'Space':
      event.preventDefault()
      togglePlay()
      break
    case 'ArrowLeft':
      event.preventDefault()
      playPrev()
      break
    case 'ArrowRight':
      event.preventDefault()
      playNext()
      break
    case 'ArrowUp':
      event.preventDefault()
      playerStore.setVolume(Math.min(1, volume.value + 0.1))
      break
    case 'ArrowDown':
      event.preventDefault()
      playerStore.setVolume(Math.max(0, volume.value - 0.1))
      break
    case 'KeyM':
      toggleMute()
      break
    case 'KeyS':
      toggleShuffle()
      break
    case 'KeyR':
      toggleRepeat()
      break
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyPress)
})
</script>
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `frontend/src/components/player/PlaybackControls.vue` - 播放控制組件
- `frontend/src/components/player/ProgressBar.vue` - 進度條組件
- `frontend/src/components/player/VolumeControl.vue` - 音量控制組件
- `frontend/src/components/player/QueuePanel.vue` - 播放佇列面板

**更新檔案**:
- `frontend/src/stores/player.ts` - 添加佇列管理方法
- `frontend/src/components/layout/PlayerBar.vue` - 底部播放控制欄

## ✅ 驗收條件

### 功能驗收
- [ ] 播放/暫停控制正常運作
- [ ] 上一首/下一首切換正常
- [ ] 進度條控制準確
- [ ] 音量控制功能完整
- [ ] 播放模式切換正常

### 用戶體驗驗收
- [ ] 所有按鈕有適當的視覺回饋
- [ ] 快捷鍵功能正常
- [ ] 拖拽操作流暢
- [ ] 響應式設計適配各種螢幕

### 整合驗收
- [ ] 與YouTube播放器狀態同步
- [ ] 佇列管理功能完整
- [ ] 播放模式邏輯正確

## 🚀 實作指引

### Step 1: 建立控制組件
按照技術規格建立PlaybackControls.vue

### Step 2: 實作快捷鍵
添加鍵盤快捷鍵支援

### Step 3: 整合到主介面
將控制組件集成到底部播放欄

### Step 4: 測試控制功能
測試所有播放控制功能

## 📊 預期成果
- ✅ 完整的播放控制介面
- ✅ 直觀的操作體驗
- ✅ 豐富的快捷鍵支援
- ✅ 流暢的拖拽操作
- ✅ 智能的佇列管理