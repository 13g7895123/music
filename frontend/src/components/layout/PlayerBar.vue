<template>
  <div 
    v-if="showPlayer && currentSong"
    class="player-bar"
    :class="{ 'expanded': isExpanded }"
  >
    <div class="player-bar-content">
      <!-- 歌曲資訊區 -->
      <div class="song-info-section" @click="goToPlayerPage">
        <div class="song-thumbnail">
          <img
            v-if="currentSong.thumbnailUrl"
            :src="currentSong.thumbnailUrl"
            :alt="currentSong.title"
            class="thumbnail-img"
          />
          <div v-else class="thumbnail-placeholder">🎵</div>
          
          <!-- 播放動畫 -->
          <div v-if="isPlaying" class="playing-animation">
            <div class="wave"></div>
            <div class="wave"></div>
            <div class="wave"></div>
          </div>
        </div>
        
        <div class="song-details">
          <h4 class="song-title">{{ currentSong.title }}</h4>
          <p class="song-artist">{{ currentSong.artist || '未知藝術家' }}</p>
          <div class="song-progress">
            <div 
              class="progress-bar-mini"
              :style="{ width: `${progress}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 主要控制區 -->
      <div class="main-controls-section">
        <button
          @click="playPrev"
          :disabled="!hasPrev"
          class="control-btn-mini"
          title="上一首"
        >
          ⏮️
        </button>
        
        <button
          @click="togglePlay"
          class="control-btn-mini play-btn-main"
          :title="isPlaying ? '暫停' : '播放'"
        >
          {{ isPlaying ? '⏸️' : '▶️' }}
        </button>
        
        <button
          @click="playNext"
          :disabled="!hasNext && queue.length === 0"
          class="control-btn-mini"
          title="下一首"
        >
          ⏭️
        </button>
      </div>

      <!-- 輔助控制區 -->
      <div class="secondary-controls-section">
        <div class="volume-section">
          <button
            @click="toggleMute"
            class="control-btn-mini"
            :title="isMuted ? '取消靜音' : '靜音'"
          >
            {{ getVolumeIcon() }}
          </button>
          
          <div class="volume-slider-mini">
            <input
              type="range"
              min="0"
              max="100"
              :value="displayVolume"
              @input="onVolumeChange"
              class="volume-input-mini"
            />
          </div>
        </div>
        
        <button
          @click="toggleExpanded"
          class="control-btn-mini expand-btn"
          :title="isExpanded ? '收合' : '展開'"
        >
          {{ isExpanded ? '🔽' : '🔼' }}
        </button>
        
        <router-link
          to="/player"
          class="control-btn-mini fullscreen-btn"
          title="全螢幕播放器"
        >
          ⛶
        </router-link>
      </div>
    </div>

    <!-- 展開區域 -->
    <div v-if="isExpanded" class="expanded-section">
      <PlaybackControls />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import PlaybackControls from '@/components/player/PlaybackControls.vue'

const router = useRouter()
const playerStore = usePlayerStore()

const isExpanded = ref(false)
const isMuted = ref(false)

// Computed
const showPlayer = computed(() => playerStore.showPlayer)
const currentSong = computed(() => playerStore.currentSong)
const isPlaying = computed(() => playerStore.isPlaying)
const progress = computed(() => playerStore.progress)
const volume = computed(() => playerStore.volume)
const queue = computed(() => playerStore.queue)
const hasNext = computed(() => playerStore.hasNext)
const hasPrev = computed(() => playerStore.hasPrev)

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

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

const goToPlayerPage = () => {
  router.push('/player')
}
</script>

<style scoped>
.player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  z-index: 1000;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.player-bar-content {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  min-height: 72px;
}

.song-info-section {
  display: flex;
  align-items: center;
  flex: 1;
  cursor: pointer;
  transition: opacity 0.2s;
}

.song-info-section:hover {
  opacity: 0.8;
}

.song-thumbnail {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  margin-right: 12px;
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  font-size: 1.5rem;
}

.playing-animation {
  position: absolute;
  bottom: 4px;
  left: 4px;
  display: flex;
  gap: 2px;
}

.wave {
  width: 3px;
  height: 12px;
  background: #fff;
  animation: wave 1.5s ease-in-out infinite;
}

.wave:nth-child(2) {
  animation-delay: 0.2s;
}

.wave:nth-child(3) {
  animation-delay: 0.4s;
}

.song-details {
  flex: 1;
  min-width: 0;
}

.song-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 12px;
  opacity: 0.8;
  margin: 2px 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-progress {
  width: 100%;
  height: 2px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 1px;
  overflow: hidden;
}

.progress-bar-mini {
  height: 100%;
  background: #fff;
  transition: width 0.1s ease;
}

.main-controls-section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 24px;
}

.secondary-controls-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-btn-mini {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.control-btn-mini:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.control-btn-mini:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-btn-main {
  padding: 12px;
  font-size: 16px;
}

.volume-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.volume-slider-mini {
  width: 80px;
}

.volume-input-mini {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  outline: none;
  border-radius: 2px;
}

.expanded-section {
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding: 16px;
}

@keyframes wave {
  0%, 100% {
    transform: scaleY(0.5);
  }
  50% {
    transform: scaleY(1);
  }
}

/* 響應式設計 */
@media (max-width: 768px) {
  .player-bar-content {
    padding: 8px 12px;
  }
  
  .main-controls-section {
    margin: 0 16px;
  }
  
  .volume-section {
    display: none;
  }
  
  .song-title {
    font-size: 13px;
  }
  
  .song-artist {
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .secondary-controls-section .volume-section {
    display: none;
  }
  
  .expand-btn {
    display: none;
  }
}
</style>