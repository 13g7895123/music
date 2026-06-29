import { defineStore } from 'pinia'
import { ref, computed, nextTick } from 'vue'

export const useGlobalPlayerStore = defineStore('globalPlayer', () => {
  // State
  const isPlaying = ref(false)
  const currentVideo = ref(null)
  const currentPlaylist = ref(null)
  const currentIndex = ref(0)
  const isMinimized = ref(false)
  const isVisible = ref(false)
  const loopMode = ref('playlist') // 'playlist' | 'single' | 'all'
  const shuffleEnabled = ref(false)
  const shuffleHistory = ref([])

  // 音量控制狀態
  const volume = ref(parseInt(localStorage.getItem('playerVolume')) || 100)
  const isMuted = ref(localStorage.getItem('playerMuted') === 'true')

  // Task 6: 改進狀態同步 - 添加播放器狀態管理
  const playerStatus = ref({
    state: 'UNINITIALIZED', // UNINITIALIZED, LOADING, READY, ERROR
    error: null,
    retryCount: 0
  })

  // Computed
  const hasVideo = computed(() => currentVideo.value !== null)
  const hasPlaylist = computed(() => currentPlaylist.value !== null && currentPlaylist.value.items?.length > 0)
  const isPlayerReady = computed(() => playerStatus.value.state === 'READY')

  const resetShuffleHistory = () => {
    shuffleHistory.value = []
  }

  const transitionToIndex = async (targetIndex) => {
    isPlaying.value = false
    currentIndex.value = targetIndex
    currentVideo.value = currentPlaylist.value.items[targetIndex]
    await nextTick()
    isPlaying.value = true
  }

  // Actions
  const playVideo = (videoInfo) => {
    currentVideo.value = videoInfo
    currentPlaylist.value = null
    currentIndex.value = 0
    resetShuffleHistory()
    isPlaying.value = true
    isVisible.value = true
    isMinimized.value = false
  }

  const playPlaylist = (playlist, startIndex = 0) => {
    if (!playlist || !playlist.items || playlist.items.length === 0) {
      return
    }
    currentPlaylist.value = playlist
    currentIndex.value = startIndex
    currentVideo.value = playlist.items[startIndex]
    resetShuffleHistory()
    isPlaying.value = true
    isVisible.value = true
    isMinimized.value = false
  }

  const play = () => {
    isPlaying.value = true
  }

  const pause = () => {
    isPlaying.value = false
  }

  const togglePlay = () => {
    isPlaying.value = !isPlaying.value
  }

  // Task 4: 改進 next() 函數，添加 async/await 和更好的狀態管理
  const next = async () => {
    if (!hasPlaylist.value) return

    const playlistLength = currentPlaylist.value.items.length

    // 隨機播放邏輯
    let nextIndex
    if (shuffleEnabled.value) {
      const availableIndices = Array.from({ length: playlistLength }, (_, i) => i)
        .filter(i => i !== currentIndex.value)

      if (availableIndices.length === 0) {
        currentVideo.value = { ...currentPlaylist.value.items[currentIndex.value] }
        await nextTick()
        isPlaying.value = true
        return
      }

      shuffleHistory.value.push(currentIndex.value)
      nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
    } else {
      // 順序播放
      nextIndex = currentIndex.value + 1
      if (nextIndex >= playlistLength) {
        // 播放清單循環：回到第一首（預設行為）
        nextIndex = 0
      }
    }

    await transitionToIndex(nextIndex)
  }

  const previous = async () => {
    if (!hasPlaylist.value) return

    if (shuffleEnabled.value && shuffleHistory.value.length > 0) {
      const previousShuffleIndex = shuffleHistory.value.pop()
      await transitionToIndex(previousShuffleIndex)
      return
    }

    const prevIndex = currentIndex.value - 1
    if (prevIndex >= 0) {
      await transitionToIndex(prevIndex)
    } else {
      // Loop to last video
      const lastIndex = currentPlaylist.value.items.length - 1
      await transitionToIndex(lastIndex)
    }
  }

  const minimize = () => {
    isMinimized.value = true
  }

  const maximize = () => {
    isMinimized.value = false
  }

  const close = () => {
    isVisible.value = false
    isPlaying.value = false
    resetShuffleHistory()
  }

  const clear = () => {
    currentVideo.value = null
    currentPlaylist.value = null
    currentIndex.value = 0
    resetShuffleHistory()
    isPlaying.value = false
    isVisible.value = false
    isMinimized.value = false
  }

  const toggleLoopMode = () => {
    const oldMode = loopMode.value
    loopMode.value = loopMode.value === 'playlist' ? 'single' : 'playlist'
    console.log('toggleLoopMode: changed from', oldMode, 'to', loopMode.value)
  }

  const toggleShuffle = () => {
    const oldValue = shuffleEnabled.value
    shuffleEnabled.value = !shuffleEnabled.value
    resetShuffleHistory()
    console.log('toggleShuffle: changed from', oldValue, 'to', shuffleEnabled.value)
  }

  // 音量控制方法
  const setVolume = (newVolume) => {
    const clampedVolume = Math.max(0, Math.min(100, newVolume))
    volume.value = clampedVolume
    localStorage.setItem('playerVolume', clampedVolume.toString())

    // 如果設定音量大於 0，自動取消靜音
    if (clampedVolume > 0 && isMuted.value) {
      isMuted.value = false
      localStorage.setItem('playerMuted', 'false')
    }
  }

  const toggleMute = () => {
    isMuted.value = !isMuted.value
    localStorage.setItem('playerMuted', isMuted.value.toString())
  }

  // Task 6: 狀態更新函數
  const updatePlayerStatus = (state, error = null) => {
    playerStatus.value = {
      state,
      error,
      retryCount: state === 'ERROR' ? playerStatus.value.retryCount + 1 : 0
    }
  }

  return {
    // State
    isPlaying,
    currentVideo,
    currentPlaylist,
    currentIndex,
    isMinimized,
    isVisible,
    loopMode,
    shuffleEnabled,
    playerStatus,
    volume,
    isMuted,
    // Computed
    hasVideo,
    hasPlaylist,
    isPlayerReady,
    // Actions
    playVideo,
    playPlaylist,
    play,
    pause,
    togglePlay,
    next,
    previous,
    minimize,
    maximize,
    close,
    clear,
    toggleLoopMode,
    toggleShuffle,
    setVolume,
    toggleMute,
    updatePlayerStatus
  }
})
