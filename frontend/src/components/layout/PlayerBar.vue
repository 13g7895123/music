<template>
  <div
    v-if="showPlayer"
    class="player-bar"
    :class="{ 'compact': isCompact, 'expanded': isExpanded }"
  >
    <!-- 緊湊模式播放控制 -->
    <div v-if="isCompact" class="compact-player">
      <div class="compact-song-info" @click="toggleExpanded">
        <div class="compact-thumbnail">
          <img
            v-if="currentSong?.thumbnailUrl"
            :src="currentSong.thumbnailUrl"
            :alt="currentSong.title"
            class="thumbnail-image"
          />
          <div v-else class="thumbnail-placeholder">🎵</div>
        </div>
        
        <div class="compact-details">
          <h4 class="compact-title">{{ currentSong?.title || '未選擇歌曲' }}</h4>
          <p class="compact-artist">{{ currentSong?.artist || '未知藝術家' }}</p>
        </div>
      </div>

      <div class="compact-controls">
        <button
          @click="playPrev"
          :disabled="!hasPrev"
          class="compact-btn"
          title="上一首"
        >
          ⏮️
        </button>

        <button
          @click="togglePlay"
          :disabled="!currentSong"
          class="compact-btn play-btn"
          :title="isPlaying ? '暫停' : '播放'"
        >
          {{ isPlaying ? '⏸️' : '▶️' }}
        </button>

        <button
          @click="playNext"
          :disabled="!hasNext && queue.length === 0"
          class="compact-btn"
          title="下一首"
        >
          ⏭️
        </button>
      </div>

      <div class="compact-secondary">
        <div class="compact-progress">
          <div class="mini-progress-bar">
            <div
              class="mini-progress-fill"
              :style="{ width: `${progress}%` }"
            ></div>
          </div>
          <span class="compact-time">
            {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
          </span>
        </div>

        <div class="compact-actions">
          <button
            @click="toggleQueue"
            :class="{ active: showQueue }"
            class="compact-btn"
            :title="`播放佇列 (${queue.length})`"
          >
            📋 {{ queue.length > 0 ? queue.length : '' }}
          </button>

          <button
            @click="toggleExpanded"
            class="compact-btn"
            title="展開播放器"
          >
            ⬆️
          </button>
        </div>
      </div>
    </div>

    <!-- 展開模式播放控制 -->
    <div v-else class="expanded-player">
      <div class="expanded-header">
        <h3>正在播放</h3>
        <button @click="toggleExpanded" class="close-btn">
          ⬇️
        </button>
      </div>

      <PlaybackControls />
    </div>

    <!-- YouTube 播放器組件 -->
    <div v-if="currentSong" class="youtube-player-wrapper">
      <YouTubePlayer
        :video-id="currentSong.youtubeId"
        :show-video="isVideoVisible"
        :width="isExpanded ? 640 : 0"
        :height="isExpanded ? 360 : 0"
        @ready="onPlayerReady"
        @state-change="onPlayerStateChange"
        @error="onPlayerError"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePlayerStore } from '@/stores/player'
import PlaybackControls from '@/components/player/PlaybackControls.vue'
import YouTubePlayer from '@/components/player/YouTubePlayer.vue'

const playerStore = usePlayerStore()

// Refs
const isExpanded = ref(false)
const showQueue = ref(false)

// Computed
const showPlayer = computed(() => playerStore.showPlayer)
const currentSong = computed(() => playerStore.currentSong)
const isPlaying = computed(() => playerStore.isPlaying)
const currentTime = computed(() => playerStore.currentTime)
const duration = computed(() => playerStore.duration)
const progress = computed(() => playerStore.progress)
const queue = computed(() => playerStore.queue)
const hasNext = computed(() => playerStore.hasNext)
const hasPrev = computed(() => playerStore.hasPrev)
const isVideoVisible = computed(() => playerStore.isVideoVisible)

const isCompact = computed(() => !isExpanded.value)

// Methods
const togglePlay = () => {
  playerStore.togglePlayPause()
}

const playNext = () => {
  playerStore.playNext()
}

const playPrev = () => {
  playerStore.playPrev()
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

const toggleQueue = () => {
  showQueue.value = !showQueue.value
}

const formatTime = (seconds: number): string => {
  return playerStore.formatTime(seconds)
}

// YouTube Player 事件處理
const onPlayerReady = (player: any) => {
  console.log('YouTube Player ready in PlayerBar')
}

const onPlayerStateChange = (state: number) => {
  console.log('YouTube Player state changed:', state)
}

const onPlayerError = (error: any) => {
  console.error('YouTube Player error:', error)
}

// 監聽路由變化，自動收起播放器
watch(() => window.location.pathname, () => {
  if (isExpanded.value) {
    isExpanded.value = false
  }
})
</script>

<style scoped>
.player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #e5e7eb;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transition: all 0.3s ease;
}

.player-bar.compact {
  height: 80px;
}

.player-bar.expanded {
  height: 60vh;
  min-height: 400px;
  max-height: 80vh;
}

.compact-player {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  height: 100%;
  gap: 1rem;
}

.compact-song-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
  cursor: pointer;
  transition: opacity 0.2s;
}

.compact-song-info:hover {
  opacity: 0.8;
}

.compact-thumbnail {
  width: 48px;
  height: 48px;
  border-radius: 6px;
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
  font-size: 1.25rem;
  color: #6b7280;
}

.compact-details {
  flex: 1;
  min-width: 0;
}

.compact-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
  margin: 0 0 0.125rem 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-artist {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.compact-btn {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.375rem;
  border-radius: 50%;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.compact-btn:hover:not(:disabled) {
  background: #f3f4f6;
  transform: scale(1.1);
}

.compact-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.compact-btn.active {
  background: #3b82f6;
  color: white;
}

.compact-btn.play-btn {
  background: #3b82f6;
  color: white;
  font-size: 1.125rem;
  width: 36px;
  height: 36px;
}

.compact-btn.play-btn:hover:not(:disabled) {
  background: #2563eb;
}

.compact-secondary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 120px;
}

.compact-progress {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.mini-progress-bar {
  height: 2px;
  background: #e5e7eb;
  border-radius: 1px;
  overflow: hidden;
}

.mini-progress-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.1s linear;
}

.compact-time {
  font-size: 0.625rem;
  color: #6b7280;
  font-family: 'Monaco', 'Consolas', monospace;
  text-align: center;
}

.compact-actions {
  display: flex;
  justify-content: center;
  gap: 0.25rem;
}

.expanded-player {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.expanded-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.expanded-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #e5e7eb;
}

.youtube-player-wrapper {
  position: absolute;
  top: -1000px;
  left: -1000px;
  opacity: 0;
  pointer-events: none;
}

@media (max-width: 768px) {
  .compact-player {
    padding: 0.5rem;
    gap: 0.75rem;
  }
  
  .compact-song-info {
    gap: 0.5rem;
  }
  
  .compact-thumbnail {
    width: 40px;
    height: 40px;
  }
  
  .compact-controls {
    gap: 0.375rem;
  }
  
  .compact-btn {
    width: 28px;
    height: 28px;
    font-size: 0.875rem;
  }
  
  .compact-btn.play-btn {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }
  
  .compact-secondary {
    min-width: 100px;
  }
}

@media (max-width: 480px) {
  .compact-player {
    flex-wrap: wrap;
    height: auto;
    min-height: 80px;
  }
  
  .compact-song-info {
    flex: 1 1 100%;
    margin-bottom: 0.5rem;
  }
  
  .compact-controls {
    flex: 1;
    justify-content: center;
  }
  
  .compact-secondary {
    flex: 1;
    min-width: auto;
  }
  
  .player-bar.compact {
    height: auto;
    min-height: 100px;
  }
}
</style>