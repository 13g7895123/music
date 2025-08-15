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
import type { YT, YouTubeErrorCode } from '@/types/youtube'

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
  ready: [player: YT.Player]
  stateChange: [state: number]
  error: [error: any]
}>()

const route = useRoute()
const playerStore = usePlayerStore()

const player = ref<YT.Player | null>(null)
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
  const errorCode = event.data as YouTubeErrorCode
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