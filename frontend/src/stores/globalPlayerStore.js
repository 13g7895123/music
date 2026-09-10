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

  // 播放導覽歷史
  // playHistory：實際播過、位於目前這首之前的索引（最近的在最後）
  // playForward：按「上一首」退回時，被留在前方待重播的索引（下一個要回去的在最後）
  // shuffleBag：本輪隨機尚未播到的索引，播完一輪才會重新洗牌，避免同一首一直重複
  const playHistory = ref([])
  const playForward = ref([])
  const shuffleBag = ref([])

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

  const playlistLength = computed(() => currentPlaylist.value?.items?.length ?? 0)

  // 隨機模式下還有沒有「上一首」可以退回；順序模式永遠可以退
  const canGoPrevious = computed(() => {
    if (!hasPlaylist.value) return false
    if (!shuffleEnabled.value) return true
    return playHistory.value.length > 0
  })

  const resetNavigationHistory = () => {
    playHistory.value = []
    playForward.value = []
    shuffleBag.value = []
  }

  /**
   * 重新洗一輪隨機順序（Fisher-Yates），排除目前正在播的那首。
   * 一輪之內每首只會播到一次，播完才重新洗牌。
   */
  const refillShuffleBag = (excludeIndex = currentIndex.value) => {
    const bag = []
    for (let i = 0; i < playlistLength.value; i++) {
      if (i !== excludeIndex) bag.push(i)
    }
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[bag[i], bag[j]] = [bag[j], bag[i]]
    }
    shuffleBag.value = bag
  }

  const transitionToIndex = async (targetIndex) => {
    isPlaying.value = false
    currentIndex.value = targetIndex
    currentVideo.value = currentPlaylist.value.items[targetIndex]
    await nextTick()
    isPlaying.value = true
  }

  // 重播目前這首（清單只剩一首、或單曲循環時使用）
  const replayCurrent = async () => {
    currentVideo.value = { ...currentPlaylist.value.items[currentIndex.value] }
    await nextTick()
    isPlaying.value = true
  }

  // Actions
  const playVideo = (videoInfo) => {
    currentVideo.value = videoInfo
    currentPlaylist.value = null
    currentIndex.value = 0
    resetNavigationHistory()
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
    resetNavigationHistory()
    if (shuffleEnabled.value) refillShuffleBag(startIndex)
    isPlaying.value = true
    isVisible.value = true
    isMinimized.value = false
  }

  /**
   * 從清單中直接點播某一首：算是一次正常的前進，
   * 所以把目前這首推進歷史，並清掉前方待重播的紀錄。
   */
  const playAt = async (index) => {
    if (!hasPlaylist.value) return
    if (index < 0 || index >= playlistLength.value) return
    if (index === currentIndex.value) return

    playHistory.value.push(currentIndex.value)
    playForward.value = []
    if (shuffleEnabled.value) {
      // 手動點播的那首要從本輪隨機池移除，免得等一下又抽到
      shuffleBag.value = shuffleBag.value.filter(i => i !== index)
    }
    await transitionToIndex(index)
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

  const next = async () => {
    if (!hasPlaylist.value) return

    const length = playlistLength.value

    if (shuffleEnabled.value) {
      // 先前按過「上一首」的話，下一首要走回原本那條路，而不是重抽
      if (playForward.value.length > 0) {
        const forwardIndex = playForward.value.pop()
        playHistory.value.push(currentIndex.value)
        await transitionToIndex(forwardIndex)
        return
      }

      if (length <= 1) {
        await replayCurrent()
        return
      }

      if (shuffleBag.value.length === 0) {
        refillShuffleBag(currentIndex.value)
      }
      const nextIndex = shuffleBag.value.shift()
      if (nextIndex === undefined) {
        await replayCurrent()
        return
      }

      playHistory.value.push(currentIndex.value)
      await transitionToIndex(nextIndex)
      return
    }

    // 順序播放：清單循環回到第一首
    playHistory.value.push(currentIndex.value)
    playForward.value = []
    const nextIndex = (currentIndex.value + 1) % length
    await transitionToIndex(nextIndex)
  }

  const previous = async () => {
    if (!hasPlaylist.value) return

    if (shuffleEnabled.value) {
      // 隨機模式只沿著實際播過的路徑往回走；沒有歷史就代表沒有「上一首」
      if (playHistory.value.length === 0) return
      const previousIndex = playHistory.value.pop()
      playForward.value.push(currentIndex.value)
      await transitionToIndex(previousIndex)
      return
    }

    playForward.value = []
    if (playHistory.value.length > 0) playHistory.value.pop()

    const prevIndex = currentIndex.value - 1
    if (prevIndex >= 0) {
      await transitionToIndex(prevIndex)
    } else {
      // Loop to last video
      await transitionToIndex(playlistLength.value - 1)
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
    resetNavigationHistory()
  }

  const clear = () => {
    currentVideo.value = null
    currentPlaylist.value = null
    currentIndex.value = 0
    resetNavigationHistory()
    isPlaying.value = false
    isVisible.value = false
    isMinimized.value = false
  }

  const toggleLoopMode = () => {
    loopMode.value = loopMode.value === 'playlist' ? 'single' : 'playlist'
  }

  const toggleShuffle = () => {
    shuffleEnabled.value = !shuffleEnabled.value
    // 切換模式等於重新開始一段路徑，舊的前進／後退紀錄不再適用
    resetNavigationHistory()
    if (shuffleEnabled.value && hasPlaylist.value) {
      refillShuffleBag(currentIndex.value)
    }
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
    playHistory,
    playForward,
    shuffleBag,
    playerStatus,
    volume,
    isMuted,
    // Computed
    hasVideo,
    hasPlaylist,
    isPlayerReady,
    playlistLength,
    canGoPrevious,
    // Actions
    playVideo,
    playPlaylist,
    playAt,
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
