import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/services/api'

interface Song {
  id: number
  youtubeId: string
  title: string
  artist?: string
  duration?: number
  thumbnailUrl?: string
}

interface PlaylistSong {
  id: number
  playlistId: number
  songId: number
  position: number
  addedAt: string
  song: Song
}

interface Playlist {
  id: number
  name: string
  description?: string
  songs: PlaylistSong[]
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
  const currentPlaylist = ref<Playlist | null>(null)
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

  const canPlayNext = computed(() => {
    return queue.value.length > 0 || hasNext.value || repeatMode.value === 'all' || repeatMode.value === 'one'
  })

  const canPlayPrev = computed(() => {
    return hasPrev.value || repeatMode.value === 'all'
  })

  // Actions
  const loadPlaylist = async (playlistId: number, shuffle = false) => {
    try {
      isLoading.value = true
      
      const response = await api.get(`/playlists/${playlistId}`)
      currentPlaylist.value = response.data
      
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

  const playSong = (song: Song) => {
    if (currentSong.value) {
      history.value.push(currentSong.value)
    }
    
    currentSong.value = song
    showPlayer.value = true
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

  const updateQueue = (newQueue: Song[]) => {
    queue.value = newQueue
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

  const setFullscreen = (fullscreen: boolean) => {
    isFullscreen.value = fullscreen
  }

  const clearCommands = () => {
    playerCommands.value = null
  }

  const reset = () => {
    currentSong.value = null
    currentPlaylist.value = null
    currentIndex.value = 0
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    showPlayer.value = false
    clearQueue()
    history.value = []
  }

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '--:--'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }
  }

  const togglePlayPause = () => {
    if (isPlaying.value) {
      pause()
    } else {
      play()
    }
  }

  // 獲取播放狀態描述
  const getRepeatModeText = computed(() => {
    switch (repeatMode.value) {
      case 'one':
        return '單曲循環'
      case 'all':
        return '列表循環'
      default:
        return '不循環'
    }
  })

  const getShuffleModeText = computed(() => {
    return isShuffle.value ? '隨機播放' : '順序播放'
  })

  // 更新播放進度 (通常由播放器組件定期調用)
  const updateProgress = (time: number, total: number) => {
    setCurrentTime(time)
    if (total !== duration.value) {
      setDuration(total)
    }
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
    canPlayNext,
    canPlayPrev,
    getRepeatModeText,
    getShuffleModeText,

    // Actions
    loadPlaylist,
    play,
    pause,
    playNext,
    playPrev,
    playAt,
    playSong,
    setVolume,
    seekTo,
    addToQueue,
    removeFromQueue,
    clearQueue,
    updateQueue,
    shufflePlaylist,
    toggleShuffle,
    toggleRepeat,
    setPlaying,
    setCurrentTime,
    setDuration,
    setVideoVisible,
    setFullscreen,
    clearCommands,
    reset,
    formatTime,
    togglePlayPause,
    updateProgress
  }
})