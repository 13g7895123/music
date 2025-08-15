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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '@/stores/player'
import YouTubePlayer from './YouTubePlayer.vue'

const playerStore = usePlayerStore()
const globalPlayer = ref()
const syncInterval = ref()

// 計算屬性
const currentSong = computed(() => playerStore.currentSong)

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