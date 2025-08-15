import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import YouTubePlayer from '../YouTubePlayer.vue'
import { usePlayerStore } from '@/stores/player'

describe('YouTubePlayer', () => {
  let wrapper: any
  let playerStore: any

  beforeEach(() => {
    setActivePinia(createPinia())
    playerStore = usePlayerStore()
    
    // Mock store methods
    playerStore.setIsPlaying = vi.fn()
    playerStore.updateCurrentTime = vi.fn()
    playerStore.setDuration = vi.fn()
    playerStore.setPlayerState = vi.fn()
    playerStore.onTrackEnded = vi.fn()
    
    wrapper = mount(YouTubePlayer, {
      props: {
        videoId: 'dQw4w9WgXcQ',
        width: 640,
        height: 360
      }
    })
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('渲染YouTube播放器容器', () => {
    expect(wrapper.find('.youtube-player').exists()).toBe(true)
    expect(wrapper.find('#youtube-player').exists()).toBe(true)
  })

  it('設定正確的容器尺寸', () => {
    const container = wrapper.find('.youtube-player')
    expect(container.attributes('style')).toContain('width: 640px')
    expect(container.attributes('style')).toContain('height: 360px')
  })

  it('初始化YouTube播放器', async () => {
    await wrapper.vm.initPlayer()
    expect(window.YT.Player).toHaveBeenCalledWith('youtube-player', {
      width: 640,
      height: 360,
      videoId: 'dQw4w9WgXcQ',
      playerVars: expect.objectContaining({
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        showinfo: 0
      }),
      events: expect.objectContaining({
        onReady: expect.any(Function),
        onStateChange: expect.any(Function),
        onError: expect.any(Function)
      })
    })
  })

  it('播放影片時更新Store狀態', async () => {
    const mockPlayer = {
      playVideo: vi.fn(),
      getCurrentTime: vi.fn(() => 10),
      getDuration: vi.fn(() => 100),
      getPlayerState: vi.fn(() => 1)
    }
    wrapper.vm.player = mockPlayer
    
    await wrapper.vm.play()
    
    expect(mockPlayer.playVideo).toHaveBeenCalled()
    expect(playerStore.setIsPlaying).toHaveBeenCalledWith(true)
  })

  it('暫停影片時更新Store狀態', async () => {
    const mockPlayer = {
      pauseVideo: vi.fn(),
      getPlayerState: vi.fn(() => 2)
    }
    wrapper.vm.player = mockPlayer
    
    await wrapper.vm.pause()
    
    expect(mockPlayer.pauseVideo).toHaveBeenCalled()
    expect(playerStore.setIsPlaying).toHaveBeenCalledWith(false)
  })

  it('跳轉到指定時間', async () => {
    const mockPlayer = {
      seekTo: vi.fn(),
      getCurrentTime: vi.fn(() => 50)
    }
    wrapper.vm.player = mockPlayer
    
    await wrapper.vm.seekTo(50)
    
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(50, true)
  })

  it('設定音量', async () => {
    const mockPlayer = {
      setVolume: vi.fn(),
      getVolume: vi.fn(() => 75)
    }
    wrapper.vm.player = mockPlayer
    
    await wrapper.vm.setVolume(75)
    
    expect(mockPlayer.setVolume).toHaveBeenCalledWith(75)
  })

  it('靜音和取消靜音', async () => {
    const mockPlayer = {
      mute: vi.fn(),
      unMute: vi.fn(),
      isMuted: vi.fn()
    }
    wrapper.vm.player = mockPlayer
    
    // 靜音
    mockPlayer.isMuted.mockReturnValue(false)
    await wrapper.vm.toggleMute()
    expect(mockPlayer.mute).toHaveBeenCalled()
    
    // 取消靜音
    mockPlayer.isMuted.mockReturnValue(true)
    await wrapper.vm.toggleMute()
    expect(mockPlayer.unMute).toHaveBeenCalled()
  })

  it('設定播放速度', async () => {
    const mockPlayer = {
      setPlaybackRate: vi.fn(),
      getPlaybackRate: vi.fn(() => 1.5)
    }
    wrapper.vm.player = mockPlayer
    
    await wrapper.vm.setPlaybackRate(1.5)
    
    expect(mockPlayer.setPlaybackRate).toHaveBeenCalledWith(1.5)
  })

  it('處理播放器狀態變更 - 播放中', async () => {
    const mockEvent = { data: 1 } // YT.PlayerState.PLAYING
    
    await wrapper.vm.onPlayerStateChange(mockEvent)
    
    expect(playerStore.setIsPlaying).toHaveBeenCalledWith(true)
    expect(playerStore.setPlayerState).toHaveBeenCalledWith(1)
  })

  it('處理播放器狀態變更 - 暫停', async () => {
    const mockEvent = { data: 2 } // YT.PlayerState.PAUSED
    
    await wrapper.vm.onPlayerStateChange(mockEvent)
    
    expect(playerStore.setIsPlaying).toHaveBeenCalledWith(false)
    expect(playerStore.setPlayerState).toHaveBeenCalledWith(2)
  })

  it('處理播放器狀態變更 - 結束', async () => {
    const mockEvent = { data: 0 } // YT.PlayerState.ENDED
    
    await wrapper.vm.onPlayerStateChange(mockEvent)
    
    expect(playerStore.setIsPlaying).toHaveBeenCalledWith(false)
    expect(playerStore.onTrackEnded).toHaveBeenCalled()
  })

  it('處理播放器準備就緒事件', async () => {
    const mockEvent = {
      target: {
        getDuration: vi.fn(() => 180),
        getCurrentTime: vi.fn(() => 0)
      }
    }
    
    await wrapper.vm.onPlayerReady(mockEvent)
    
    expect(playerStore.setDuration).toHaveBeenCalledWith(180)
  })

  it('處理播放器錯誤', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const mockEvent = { data: 2 } // 無效的影片ID
    
    await wrapper.vm.onPlayerError(mockEvent)
    
    expect(consoleSpy).toHaveBeenCalledWith('YouTube Player Error:', 2)
    consoleSpy.mockRestore()
  })

  it('載入新影片', async () => {
    const mockPlayer = {
      loadVideoById: vi.fn(),
      getDuration: vi.fn(() => 200),
      getCurrentTime: vi.fn(() => 0)
    }
    wrapper.vm.player = mockPlayer
    
    await wrapper.setProps({ videoId: 'newVideoId' })
    
    expect(mockPlayer.loadVideoById).toHaveBeenCalledWith('newVideoId')
  })

  it('更新播放器時間', async () => {
    const mockPlayer = {
      getCurrentTime: vi.fn(() => 45),
      getDuration: vi.fn(() => 180)
    }
    wrapper.vm.player = mockPlayer
    
    await wrapper.vm.updateTime()
    
    expect(playerStore.updateCurrentTime).toHaveBeenCalledWith(45)
  })

  it('獲取播放器資訊', async () => {
    const mockPlayer = {
      getCurrentTime: vi.fn(() => 30),
      getDuration: vi.fn(() => 120),
      getVolume: vi.fn(() => 80),
      getPlaybackRate: vi.fn(() => 1.25),
      isMuted: vi.fn(() => false),
      getPlayerState: vi.fn(() => 1)
    }
    wrapper.vm.player = mockPlayer
    
    const info = await wrapper.vm.getPlayerInfo()
    
    expect(info).toEqual({
      currentTime: 30,
      duration: 120,
      volume: 80,
      playbackRate: 1.25,
      isMuted: false,
      playerState: 1
    })
  })

  it('清理播放器資源', async () => {
    const mockPlayer = {
      destroy: vi.fn()
    }
    wrapper.vm.player = mockPlayer
    
    wrapper.unmount()
    
    expect(mockPlayer.destroy).toHaveBeenCalled()
  })

  it('處理視窗大小變更', async () => {
    const mockPlayer = {
      setSize: vi.fn()
    }
    wrapper.vm.player = mockPlayer
    
    await wrapper.setProps({ width: 800, height: 450 })
    
    expect(mockPlayer.setSize).toHaveBeenCalledWith(800, 450)
  })

  it('支援響應式設計', async () => {
    await wrapper.setProps({ responsive: true })
    const container = wrapper.find('.youtube-player')
    
    expect(container.classes()).toContain('responsive')
  })

  it('載入播放器API失敗時顯示錯誤訊息', async () => {
    // 模擬API載入失敗
    delete (window as any).YT
    
    await wrapper.vm.initPlayer()
    
    expect(wrapper.find('.error-message').exists()).toBe(true)
    expect(wrapper.find('.error-message').text()).toContain('YouTube API 載入失敗')
  })

  it('支援自訂播放器參數', async () => {
    const customPlayerVars = {
      autoplay: 1,
      loop: 1,
      playlist: 'dQw4w9WgXcQ'
    }
    
    await wrapper.setProps({ playerVars: customPlayerVars })
    await wrapper.vm.initPlayer()
    
    expect(window.YT.Player).toHaveBeenCalledWith('youtube-player', 
      expect.objectContaining({
        playerVars: expect.objectContaining(customPlayerVars)
      })
    )
  })
})