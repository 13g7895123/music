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

<style scoped>
.playback-controls {
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  max-width: 1200px;
  margin: 0 auto;
}

.current-song-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.song-thumbnail {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #6b7280;
}

.song-details {
  flex: 1;
  min-width: 0;
}

.song-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.25rem 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-artist {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.main-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.control-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}

.control-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.control-btn:hover:not(:disabled) {
  background: #f3f4f6;
  transform: scale(1.1);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.control-btn.active {
  background: #3b82f6;
  color: white;
}

.main-play-btn {
  font-size: 1.5rem;
  width: 50px;
  height: 50px;
  background: #3b82f6;
  color: white;
}

.main-play-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: scale(1.1);
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.time-display {
  font-size: 0.75rem;
  color: #6b7280;
  font-family: 'Monaco', 'Consolas', monospace;
  min-width: 40px;
}

.progress-bar-container {
  flex: 1;
  cursor: pointer;
  padding: 0.5rem 0;
}

.progress-bar {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  border-radius: 2px;
  transition: width 0.1s linear;
}

.progress-handle {
  position: absolute;
  top: 50%;
  transform: translateY(-50%) translateX(-50%);
  width: 12px;
  height: 12px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.progress-bar-container:hover .progress-handle {
  opacity: 1;
}

.secondary-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.volume-slider-container {
  width: 100px;
}

.volume-slider {
  width: 100%;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
}

.additional-controls {
  display: flex;
  gap: 0.5rem;
}

.queue-panel {
  margin-top: 1rem;
  border-top: 1px solid #e5e7eb;
  padding-top: 1rem;
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.queue-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.clear-queue-btn {
  background: #ef4444;
  color: white;
  border: none;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
}

.empty-queue {
  text-align: center;
  color: #6b7280;
  padding: 2rem;
}

.queue-list {
  max-height: 300px;
  overflow-y: auto;
}

.queue-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.2s;
}

.queue-item:hover {
  background: #f9fafb;
}

.queue-song-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.queue-thumbnail {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
}

.queue-song-details {
  flex: 1;
  min-width: 0;
}

.queue-song-details h5 {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
  margin: 0 0 0.25rem 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.queue-song-details p {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.queue-actions {
  display: flex;
  gap: 0.25rem;
}

.queue-action-btn {
  background: none;
  border: none;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.queue-action-btn:hover {
  background: #f3f4f6;
}

.queue-action-btn.remove:hover {
  background: #fef2f2;
  color: #dc2626;
}

@media (max-width: 768px) {
  .playback-controls {
    padding: 0.75rem;
  }
  
  .current-song-info {
    margin-bottom: 0.75rem;
  }
  
  .song-thumbnail {
    width: 50px;
    height: 50px;
  }
  
  .control-buttons {
    gap: 0.75rem;
  }
  
  .control-btn {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }
  
  .main-play-btn {
    width: 44px;
    height: 44px;
    font-size: 1.25rem;
  }
  
  .secondary-controls {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }
  
  .volume-control {
    justify-content: center;
  }
  
  .additional-controls {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .progress-section {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .progress-bar-container {
    width: 100%;
  }
  
  .time-display {
    font-size: 0.875rem;
  }
}
</style>