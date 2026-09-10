import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import FloatingPlayer from '@/components/FloatingPlayer.vue'
import { useGlobalPlayerStore } from '@/stores/globalPlayerStore'

const makePlaylist = (n) => ({
  id: 1,
  name: 'test',
  items: Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    video_id: `vid${i}`,
    title: `歌 ${i + 1}`,
    duration: 200 + i,
    thumbnail_url: ''
  }))
})

// 假的 YouTube IFrame API，讓元件走完初始化流程
const installFakeYT = () => {
  const instance = {
    playVideo: vi.fn(),
    pauseVideo: vi.fn(),
    loadVideoById: vi.fn(),
    seekTo: vi.fn(),
    setVolume: vi.fn(),
    mute: vi.fn(),
    unMute: vi.fn(),
    destroy: vi.fn(),
    getCurrentTime: vi.fn(() => 12),
    getDuration: vi.fn(() => 200)
  }
  window.YT = {
    Player: vi.fn(function () { return instance }),
    PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2 }
  }
  return instance
}

describe('FloatingPlayer', () => {
  let store
  let wrapper

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useGlobalPlayerStore()
    installFakeYT()
    vi.stubGlobal('scrollTo', vi.fn())
  })

  afterEach(() => {
    wrapper?.unmount()
    delete window.YT
    vi.unstubAllGlobals()
  })

  const mountPlayer = () => mount(FloatingPlayer, {
    attachTo: document.body,
    global: {
      directives: { tooltip: {} }
    }
  })

  it('播放器沒開的時候不算數渲染', () => {
    wrapper = mountPlayer()
    expect(document.querySelector('.pl-player')).toBeNull()
  })

  it('開始播放清單後會渲染，而且待播清單列出每一首', async () => {
    store.playPlaylist(makePlaylist(4), 0)
    wrapper = mountPlayer()
    await nextTick()

    expect(document.querySelector('.pl-player')).not.toBeNull()
    const items = document.querySelectorAll('.pl-queue-item')
    expect(items.length).toBe(4)
    expect(items[0].classList.contains('current')).toBe(true)
    expect(items[0].textContent).toContain('歌 1')
  })

  it('點待播清單裡的某一首會跳過去，而且記進歷史', async () => {
    store.playPlaylist(makePlaylist(4), 0)
    store.toggleShuffle()
    wrapper = mountPlayer()
    await nextTick()

    const items = document.querySelectorAll('.pl-queue-item')
    items[2].click()
    await nextTick()

    expect(store.currentIndex).toBe(2)
    expect(store.canGoPrevious).toBe(true)
  })

  it('隨機播放且沒有歷史時，上一首按鈕是停用的', async () => {
    store.playPlaylist(makePlaylist(4), 0)
    store.toggleShuffle()
    wrapper = mountPlayer()
    await nextTick()

    const prev = document.querySelector('.pl-playback .pl-step')
    expect(prev.disabled).toBe(true)

    await store.next()
    await nextTick()
    const prevAfter = document.querySelector('.pl-playback .pl-step')
    expect(prevAfter.disabled).toBe(false)
  })

  it('順序播放時上一首永遠可以按', async () => {
    store.playPlaylist(makePlaylist(4), 0)
    wrapper = mountPlayer()
    await nextTick()

    expect(document.querySelector('.pl-playback .pl-step').disabled).toBe(false)
  })

  it('空白鍵切換播放／暫停，輸入框內則不攔截', async () => {
    store.playPlaylist(makePlaylist(3), 0)
    wrapper = mountPlayer()
    await nextTick()

    expect(store.isPlaying).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    await nextTick()
    expect(store.isPlaying).toBe(false)

    // 焦點在輸入框時不應該被攔截
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    await nextTick()
    expect(store.isPlaying).toBe(false)
    input.remove()
  })

  it('S 切隨機、R 切循環模式', async () => {
    store.playPlaylist(makePlaylist(3), 0)
    wrapper = mountPlayer()
    await nextTick()

    expect(store.shuffleEnabled).toBe(false)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))
    await nextTick()
    expect(store.shuffleEnabled).toBe(true)

    expect(store.loopMode).toBe('playlist')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }))
    await nextTick()
    expect(store.loopMode).toBe('single')
  })

  it('迷你／展開切換不會把影片容器換掉（不會重載 iframe）', async () => {
    store.playPlaylist(makePlaylist(3), 0)
    wrapper = mountPlayer()
    await nextTick()

    const stageBefore = document.getElementById('pl-yt-player')
    expect(stageBefore).not.toBeNull()

    store.minimize()
    await nextTick()
    expect(document.querySelector('.pl-player').classList.contains('mini')).toBe(true)

    const stageAfter = document.getElementById('pl-yt-player')
    expect(stageAfter).toBe(stageBefore)
  })

  it('關閉播放器後不再渲染', async () => {
    store.playPlaylist(makePlaylist(3), 0)
    wrapper = mountPlayer()
    await nextTick()
    expect(document.querySelector('.pl-player')).not.toBeNull()

    store.close()
    await nextTick()
    expect(document.querySelector('.pl-player')).toBeNull()
  })
})
