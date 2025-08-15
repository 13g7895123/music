<template>
  <div class="player-view">
    <div class="player-container">
      <!-- 返回按鈕 -->
      <div class="player-header">
        <button @click="goBack" class="back-btn">
          ⬅️ 返回
        </button>
        <h1 class="player-title">播放器</h1>
        <div class="header-actions">
          <button @click="toggleTheme" class="theme-btn" title="切換主題">
            {{ isDarkTheme ? '☀️' : '🌙' }}
          </button>
        </div>
      </div>

      <!-- 主播放區域 -->
      <div class="player-main">
        <!-- 歌曲封面區域 -->
        <div class="album-section">
          <div class="album-cover" :class="{ 'playing': isPlaying }">
            <img
              v-if="currentSong?.thumbnailUrl"
              :src="currentSong.thumbnailUrl"
              :alt="currentSong.title"
              class="cover-image"
            />
            <div v-else class="cover-placeholder">
              🎵
            </div>
            
            <!-- 播放動畫覆蓋層 -->
            <div v-if="isPlaying" class="cover-overlay">
              <PlayerVisualizer />
            </div>
          </div>
        </div>

        <!-- 歌曲資訊區域 -->
        <div class="song-info">
          <h2 class="song-title">{{ currentSong?.title || '未選擇歌曲' }}</h2>
          <p class="song-artist">{{ currentSong?.artist || '未知藝術家' }}</p>
          <p class="song-duration">
            {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
          </p>
        </div>

        <!-- 進度條 -->
        <div class="progress-section">
          <div class="progress-bar" @click="seekTo">
            <div
              class="progress-fill"
              :style="{ width: `${progress}%` }"
            ></div>
            <div
              class="progress-handle"
              :style="{ left: `${progress}%` }"
            ></div>
          </div>
        </div>

        <!-- 播放控制 -->
        <div class="playback-controls">
          <button
            @click="toggleShuffle"
            :class="{ active: shuffle }"
            class="control-btn secondary"
            title="隨機播放"
          >
            🔀
          </button>

          <button
            @click="playPrev"
            :disabled="!hasPrev"
            class="control-btn"
            title="上一首"
          >
            ⏮️
          </button>

          <button
            @click="togglePlay"
            class="control-btn primary play-btn"
            :title="isPlaying ? '暫停' : '播放'"
          >
            {{ isPlaying ? '⏸️' : '▶️' }}
          </button>

          <button
            @click="playNext"
            :disabled="!hasNext && queue.length === 0"
            class="control-btn"
            title="下一首"
          >
            ⏭️
          </button>

          <button
            @click="toggleRepeat"
            :class="{ active: repeatMode !== 'none' }"
            class="control-btn secondary"
            :title="getRepeatTitle()"
          >
            {{ getRepeatIcon() }}
          </button>
        </div>

        <!-- 音量控制 -->
        <div class="volume-control">
          <button
            @click="toggleMute"
            class="volume-btn"
            :title="isMuted ? '取消靜音' : '靜音'"
          >
            {{ getVolumeIcon() }}
          </button>
          
          <div class="volume-slider">
            <input
              type="range"
              min="0"
              max="100"
              :value="displayVolume"
              @input="onVolumeChange"
              class="volume-input"
            />
          </div>
        </div>
      </div>

      <!-- 播放佇列 -->
      <div class="queue-section" v-if="showQueue">
        <div class="queue-header">
          <h3>播放佇列 ({{ queue.length }})</h3>
          <button @click="toggleQueue" class="close-queue">❌</button>
        </div>
        <div class="queue-list">
          <div
            v-for="(song, index) in queue"
            :key="song.id"
            class="queue-item"
            :class="{ current: song.id === currentSong?.id }"
            @click="playSongFromQueue(index)"
          >
            <div class="queue-thumbnail">
              <img
                v-if="song.thumbnailUrl"
                :src="song.thumbnailUrl"
                :alt="song.title"
                class="queue-thumb-img"
              />
              <div v-else class="queue-thumb-placeholder">🎵</div>
            </div>
            <div class="queue-details">
              <h4 class="queue-title">{{ song.title }}</h4>
              <p class="queue-artist">{{ song.artist || '未知藝術家' }}</p>
            </div>
            <button
              @click.stop="removeFromQueue(index)"
              class="remove-btn"
              title="從佇列移除"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      <!-- 底部操作欄 -->
      <div class="player-actions">
        <button
          @click="toggleQueue"
          :class="{ active: showQueue }"
          class="action-btn"
          :title="`播放佇列 (${queue.length})`"
        >
          📋 {{ queue.length }}
        </button>
        
        <button
          @click="openPlaylist"
          class="action-btn"
          title="播放清單"
        >
          📁
        </button>
        
        <button
          @click="shareCurrentSong"
          :disabled="!currentSong"
          class="action-btn"
          title="分享歌曲"
        >
          📤
        </button>
      </div>
    </div>

    <!-- 動態背景 -->
    <PlayerBackground :current-song="currentSong" :is-playing="isPlaying" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import PlayerVisualizer from '@/components/player/PlayerVisualizer.vue'
import PlayerBackground from '@/components/player/PlayerBackground.vue'

const router = useRouter()
const playerStore = usePlayerStore()

// Refs
const showQueue = ref(false)
const isMuted = ref(false)
const isDarkTheme = ref(false)

// Computed
const currentSong = computed(() => playerStore.currentSong)
const isPlaying = computed(() => playerStore.isPlaying)
const currentTime = computed(() => playerStore.currentTime)
const duration = computed(() => playerStore.duration)
const progress = computed(() => playerStore.progress)
const volume = computed(() => playerStore.volume)
const queue = computed(() => playerStore.queue)
const hasNext = computed(() => playerStore.hasNext)
const hasPrev = computed(() => playerStore.hasPrev)
const shuffle = computed(() => playerStore.shuffle)
const repeatMode = computed(() => playerStore.repeatMode)

const displayVolume = computed(() => isMuted.value ? 0 : volume.value * 100)

// Methods
const goBack = () => {
  router.go(-1)
}

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
  playerStore.setShuffle(!shuffle.value)
}

const toggleRepeat = () => {
  const modes = ['none', 'all', 'one']
  const currentIndex = modes.indexOf(repeatMode.value)
  const nextMode = modes[(currentIndex + 1) % modes.length]
  playerStore.setRepeatMode(nextMode)
}

const seekTo = (event: MouseEvent) => {
  const progressBar = event.currentTarget as HTMLElement
  const rect = progressBar.getBoundingClientRect()
  const percent = (event.clientX - rect.left) / rect.width
  const newTime = percent * duration.value
  playerStore.seekTo(newTime)
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
  isMuted.value = !isMuted.value
  if (isMuted.value) {
    playerStore.setVolume(0)
  } else {
    playerStore.setVolume(0.7)
  }
}

const getVolumeIcon = () => {
  if (isMuted.value || volume.value === 0) return '🔇'
  if (volume.value < 0.3) return '🔈'
  if (volume.value < 0.7) return '🔉'
  return '🔊'
}

const getRepeatIcon = () => {
  switch (repeatMode.value) {
    case 'one': return '🔂'
    case 'all': return '🔁'
    default: return '🔁'
  }
}

const getRepeatTitle = () => {
  switch (repeatMode.value) {
    case 'one': return '單曲循環'
    case 'all': return '列表循環'
    default: return '不循環'
  }
}

const toggleQueue = () => {
  showQueue.value = !showQueue.value
}

const playSongFromQueue = (index: number) => {
  playerStore.playFromQueue(index)
}

const removeFromQueue = (index: number) => {
  playerStore.removeFromQueue(index)
}

const toggleTheme = () => {
  isDarkTheme.value = !isDarkTheme.value
  document.body.classList.toggle('dark-theme', isDarkTheme.value)
}

const formatTime = (seconds: number): string => {
  return playerStore.formatTime(seconds)
}

const openPlaylist = () => {
  router.push('/playlists')
}

const shareCurrentSong = () => {
  if (currentSong.value) {
    const url = `https://youtube.com/watch?v=${currentSong.value.youtubeId}`
    navigator.clipboard.writeText(url)
    // TODO: 顯示分享成功提示
  }
}
</script>

<style scoped>
.player-view {
  position: relative;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  overflow: hidden;
}

.player-container {
  position: relative;
  z-index: 10;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

.back-btn, .theme-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 16px;
}

.back-btn:hover, .theme-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.player-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.player-main {
  text-align: center;
}

.album-section {
  margin-bottom: 30px;
}

.album-cover {
  position: relative;
  width: 300px;
  height: 300px;
  margin: 0 auto;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease;
}

.album-cover.playing {
  transform: scale(1.05);
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  font-size: 80px;
}

.cover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.song-info {
  margin-bottom: 30px;
}

.song-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 10px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.song-artist {
  font-size: 20px;
  opacity: 0.9;
  margin: 0 0 10px 0;
}

.song-duration {
  font-size: 16px;
  opacity: 0.8;
  margin: 0;
  font-family: 'Monaco', 'Consolas', monospace;
}

.progress-section {
  margin-bottom: 40px;
  padding: 0 20px;
}

.progress-bar {
  position: relative;
  height: 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.progress-bar:hover {
  height: 10px;
}

.progress-fill {
  height: 100%;
  background: white;
  border-radius: 4px;
  transition: width 0.1s ease;
}

.progress-handle {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.2s;
}

.progress-bar:hover .progress-handle {
  opacity: 1;
}

.playback-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.control-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 16px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 20px;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.control-btn.primary {
  background: white;
  color: #667eea;
  width: 80px;
  height: 80px;
  font-size: 28px;
}

.control-btn.secondary.active {
  background: rgba(255, 255, 255, 0.4);
}

.volume-control {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-bottom: 40px;
}

.volume-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 12px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 18px;
}

.volume-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.volume-slider {
  width: 150px;
}

.volume-input {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  outline: none;
  border-radius: 3px;
  cursor: pointer;
}

.queue-section {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  max-height: 300px;
  overflow-y: auto;
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.queue-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-queue {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 16px;
  padding: 5px;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.queue-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.queue-item.current {
  background: rgba(255, 255, 255, 0.2);
}

.queue-thumbnail {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.queue-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.queue-thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  font-size: 14px;
}

.queue-details {
  flex: 1;
  text-align: left;
  min-width: 0;
}

.queue-title {
  font-size: 14px;
  font-weight: 500;
  margin: 0 0 2px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-artist {
  font-size: 12px;
  opacity: 0.8;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.remove-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
  padding: 4px;
}

.remove-btn:hover {
  opacity: 1;
}

.player-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.action-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.action-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.active {
  background: rgba(255, 255, 255, 0.4);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .player-container {
    padding: 15px;
  }
  
  .album-cover {
    width: 250px;
    height: 250px;
  }
  
  .song-title {
    font-size: 24px;
  }
  
  .song-artist {
    font-size: 16px;
  }
  
  .playback-controls {
    gap: 15px;
  }
  
  .control-btn {
    width: 50px;
    height: 50px;
    font-size: 18px;
  }
  
  .control-btn.primary {
    width: 70px;
    height: 70px;
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .album-cover {
    width: 200px;
    height: 200px;
  }
  
  .player-header {
    flex-direction: column;
    gap: 15px;
    margin-bottom: 30px;
  }
  
  .song-title {
    font-size: 20px;
  }
  
  .song-artist {
    font-size: 14px;
  }
  
  .volume-control {
    flex-direction: column;
    gap: 10px;
  }
  
  .volume-slider {
    width: 200px;
  }
  
  .player-actions {
    flex-wrap: wrap;
    gap: 12px;
  }
}
</style>