import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from '../player'

describe('Player Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('初始狀態正確', () => {
    const store = usePlayerStore()
    
    expect(store.currentVideoId).toBe('')
    expect(store.isPlaying).toBe(false)
    expect(store.currentTime).toBe(0)
    expect(store.duration).toBe(0)
    expect(store.volume).toBe(100)
    expect(store.isMuted).toBe(false)
    expect(store.playlist).toEqual([])
    expect(store.currentIndex).toBe(0)
    expect(store.repeatMode).toBe('none')
    expect(store.isShuffled).toBe(false)
  })

  it('載入影片', () => {
    const store = usePlayerStore()
    const videoData = {
      id: 'dQw4w9WgXcQ',
      title: 'Never Gonna Give You Up',
      duration: 213,
      thumbnail: 'https://example.com/thumb.jpg'
    }
    
    store.loadVideo(videoData)
    
    expect(store.currentVideoId).toBe('dQw4w9WgXcQ')
    expect(store.currentVideo).toEqual(videoData)
    expect(store.duration).toBe(213)
  })

  it('播放/暫停切換', () => {
    const store = usePlayerStore()
    
    store.togglePlayPause()
    expect(store.isPlaying).toBe(true)
    
    store.togglePlayPause()
    expect(store.isPlaying).toBe(false)
  })

  it('設定播放狀態', () => {
    const store = usePlayerStore()
    
    store.setIsPlaying(true)
    expect(store.isPlaying).toBe(true)
    
    store.setIsPlaying(false)
    expect(store.isPlaying).toBe(false)
  })

  it('更新播放時間', () => {
    const store = usePlayerStore()
    
    store.updateCurrentTime(45)
    expect(store.currentTime).toBe(45)
    expect(store.progress).toBe(0) // duration為0時
    
    store.setDuration(100)
    store.updateCurrentTime(25)
    expect(store.progress).toBe(25)
  })

  it('計算播放進度百分比', () => {
    const store = usePlayerStore()
    
    store.setDuration(200)
    store.updateCurrentTime(50)
    
    expect(store.progress).toBe(25) // 50/200 * 100 = 25%
    
    store.updateCurrentTime(100)
    expect(store.progress).toBe(50) // 100/200 * 100 = 50%
  })

  it('音量控制', () => {
    const store = usePlayerStore()
    
    store.setVolume(50)
    expect(store.volume).toBe(50)
    expect(store.isMuted).toBe(false)
    
    store.setVolume(0)
    expect(store.volume).toBe(0)
    
    store.setVolume(150) // 超過最大值
    expect(store.volume).toBe(100)
  })

  it('靜音切換', () => {
    const store = usePlayerStore()
    
    store.setVolume(75)
    store.toggleMute()
    expect(store.isMuted).toBe(true)
    
    store.toggleMute()
    expect(store.isMuted).toBe(false)
  })

  it('播放清單操作', () => {
    const store = usePlayerStore()
    const playlist = [
      { id: '1', title: 'Song 1', duration: 180 },
      { id: '2', title: 'Song 2', duration: 200 },
      { id: '3', title: 'Song 3', duration: 240 }
    ]
    
    store.setPlaylist(playlist)
    expect(store.playlist).toEqual(playlist)
    expect(store.canGoNext).toBe(true)
    expect(store.canGoPrevious).toBe(false)
    
    store.nextTrack()
    expect(store.currentIndex).toBe(1)
    expect(store.canGoPrevious).toBe(true)
    expect(store.canGoNext).toBe(true)
    
    store.nextTrack()
    expect(store.currentIndex).toBe(2)
    expect(store.canGoNext).toBe(false)
    
    store.previousTrack()
    expect(store.currentIndex).toBe(1)
  })

  it('跳轉到指定歌曲', () => {
    const store = usePlayerStore()
    const playlist = [
      { id: '1', title: 'Song 1', duration: 180 },
      { id: '2', title: 'Song 2', duration: 200 },
      { id: '3', title: 'Song 3', duration: 240 }
    ]
    
    store.setPlaylist(playlist)
    store.jumpToTrack(2)
    
    expect(store.currentIndex).toBe(2)
    expect(store.currentVideo).toEqual(playlist[2])
  })

  it('重複模式切換', () => {
    const store = usePlayerStore()
    
    expect(store.repeatMode).toBe('none')
    
    store.toggleRepeatMode()
    expect(store.repeatMode).toBe('one')
    
    store.toggleRepeatMode()
    expect(store.repeatMode).toBe('all')
    
    store.toggleRepeatMode()
    expect(store.repeatMode).toBe('none')
  })

  it('隨機播放', () => {
    const store = usePlayerStore()
    const playlist = Array.from({ length: 10 }, (_, i) => ({ 
      id: i.toString(), 
      title: `Song ${i}`,
      duration: 180 + i * 10
    }))
    
    store.setPlaylist(playlist)
    store.toggleShuffle()
    
    expect(store.isShuffled).toBe(true)
    expect(store.shuffledPlaylist).not.toEqual(playlist)
    expect(store.shuffledPlaylist).toHaveLength(playlist.length)
    
    // 確保包含所有原始歌曲
    playlist.forEach(song => {
      expect(store.shuffledPlaylist).toContainEqual(song)
    })
  })

  it('清理播放器狀態', () => {
    const store = usePlayerStore()
    
    // 設定一些狀態
    store.loadVideo({ id: 'test', title: 'Test', duration: 100 })
    store.setIsPlaying(true)
    store.setVolume(50)
    store.updateCurrentTime(30)
    
    // 清理狀態
    store.clearPlayer()
    
    expect(store.currentVideoId).toBe('')
    expect(store.isPlaying).toBe(false)
    expect(store.currentTime).toBe(0)
    expect(store.duration).toBe(0)
    expect(store.currentVideo).toBeNull()
  })

  it('播放歷史記錄', () => {
    const store = usePlayerStore()
    const video1 = { id: '1', title: 'Video 1', duration: 180 }
    const video2 = { id: '2', title: 'Video 2', duration: 200 }
    
    store.addToHistory(video1)
    store.addToHistory(video2)
    
    expect(store.playHistory).toHaveLength(2)
    expect(store.playHistory[0]).toEqual(video2) // 最新的在前
    expect(store.playHistory[1]).toEqual(video1)
    
    // 重複添加相同影片應該移到最前面
    store.addToHistory(video1)
    expect(store.playHistory).toHaveLength(2)
    expect(store.playHistory[0]).toEqual(video1)
  })

  it('播放速度控制', () => {
    const store = usePlayerStore()
    
    expect(store.playbackRate).toBe(1)
    
    store.setPlaybackRate(1.5)
    expect(store.playbackRate).toBe(1.5)
    
    store.setPlaybackRate(0.5)
    expect(store.playbackRate).toBe(0.5)
    
    // 無效速度應該不改變
    store.setPlaybackRate(3)
    expect(store.playbackRate).toBe(0.5)
  })

  it('音質設定', () => {
    const store = usePlayerStore()
    
    expect(store.quality).toBe('auto')
    
    store.setQuality('hd720')
    expect(store.quality).toBe('hd720')
    
    store.setQuality('hd1080')
    expect(store.quality).toBe('hd1080')
  })

  it('自動播放下一首', () => {
    const store = usePlayerStore()
    const playlist = [
      { id: '1', title: 'Song 1', duration: 180 },
      { id: '2', title: 'Song 2', duration: 200 },
      { id: '3', title: 'Song 3', duration: 240 }
    ]
    
    store.setPlaylist(playlist)
    store.setAutoPlay(true)
    
    expect(store.autoPlay).toBe(true)
    
    // 模擬歌曲結束
    store.onTrackEnded()
    expect(store.currentIndex).toBe(1) // 應該自動播放下一首
  })

  it('重複播放模式 - 單曲重複', () => {
    const store = usePlayerStore()
    const playlist = [
      { id: '1', title: 'Song 1', duration: 180 },
      { id: '2', title: 'Song 2', duration: 200 }
    ]
    
    store.setPlaylist(playlist)
    store.setRepeatMode('one')
    
    // 歌曲結束時應該重複播放同一首
    store.onTrackEnded()
    expect(store.currentIndex).toBe(0)
  })

  it('重複播放模式 - 播放清單重複', () => {
    const store = usePlayerStore()
    const playlist = [
      { id: '1', title: 'Song 1', duration: 180 },
      { id: '2', title: 'Song 2', duration: 200 }
    ]
    
    store.setPlaylist(playlist)
    store.setRepeatMode('all')
    store.jumpToTrack(1) // 跳到最後一首
    
    // 最後一首結束時應該跳回第一首
    store.onTrackEnded()
    expect(store.currentIndex).toBe(0)
  })
})