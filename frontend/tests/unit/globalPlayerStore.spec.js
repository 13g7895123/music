import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGlobalPlayerStore } from '@/stores/globalPlayerStore'

const makePlaylist = (n) => ({
  id: 1,
  name: 'test',
  items: Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    video_id: `vid${i}`,
    title: `歌 ${i + 1}`
  }))
})

describe('globalPlayerStore 播放導覽', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useGlobalPlayerStore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('順序播放', () => {
    it('next 依序前進，到底回到第一首', async () => {
      store.playPlaylist(makePlaylist(3), 0)
      await store.next()
      expect(store.currentIndex).toBe(1)
      await store.next()
      expect(store.currentIndex).toBe(2)
      await store.next()
      expect(store.currentIndex).toBe(0)
    })

    it('previous 依序後退，第一首往前回到最後一首', async () => {
      store.playPlaylist(makePlaylist(3), 0)
      await store.previous()
      expect(store.currentIndex).toBe(2)
      await store.previous()
      expect(store.currentIndex).toBe(1)
    })

    it('順序模式永遠可以按上一首', () => {
      store.playPlaylist(makePlaylist(3), 0)
      expect(store.canGoPrevious).toBe(true)
    })
  })

  describe('隨機播放', () => {
    it('上一首會沿著實際播過的路徑退回，而不是清單上一首', async () => {
      store.playPlaylist(makePlaylist(6), 0)
      store.toggleShuffle()

      const path = [0]
      for (let i = 0; i < 4; i++) {
        await store.next()
        path.push(store.currentIndex)
      }

      // 一路退回去，順序必須跟播過的完全相反
      for (let i = path.length - 2; i >= 0; i--) {
        await store.previous()
        expect(store.currentIndex).toBe(path[i])
      }
    })

    it('按了上一首之後再按下一首，會回到原本那首而不是重新抽', async () => {
      store.playPlaylist(makePlaylist(8), 0)
      store.toggleShuffle()

      await store.next()
      const second = store.currentIndex
      await store.next()
      const third = store.currentIndex

      await store.previous()
      expect(store.currentIndex).toBe(second)

      await store.next()
      expect(store.currentIndex).toBe(third)
    })

    it('一輪之內每首只會播到一次，播完才重新洗牌', async () => {
      const size = 6
      store.playPlaylist(makePlaylist(size), 0)
      store.toggleShuffle()

      const played = [0]
      for (let i = 0; i < size - 1; i++) {
        await store.next()
        played.push(store.currentIndex)
      }

      expect(new Set(played).size).toBe(size)
    })

    it('沒有播放歷史時不會亂跳到清單上一首', async () => {
      store.playPlaylist(makePlaylist(5), 2)
      store.toggleShuffle()

      expect(store.canGoPrevious).toBe(false)
      await store.previous()
      expect(store.currentIndex).toBe(2)
    })

    it('切換隨機模式會清掉舊的導覽歷史', async () => {
      store.playPlaylist(makePlaylist(5), 0)
      await store.next()
      await store.next()
      expect(store.playHistory.length).toBe(2)

      store.toggleShuffle()
      expect(store.playHistory.length).toBe(0)
      expect(store.canGoPrevious).toBe(false)
    })

    it('清單只有一首時 next 不會壞掉', async () => {
      store.playPlaylist(makePlaylist(1), 0)
      store.toggleShuffle()
      await store.next()
      expect(store.currentIndex).toBe(0)
    })
  })

  describe('playAt 直接點播', () => {
    it('會把目前這首記進歷史，之後可以退回來', async () => {
      store.playPlaylist(makePlaylist(5), 0)
      store.toggleShuffle()

      await store.playAt(3)
      expect(store.currentIndex).toBe(3)

      await store.previous()
      expect(store.currentIndex).toBe(0)
    })

    it('點播過的那首不會在同一輪隨機再被抽到', async () => {
      const size = 5
      store.playPlaylist(makePlaylist(size), 0)
      store.toggleShuffle()

      await store.playAt(3)
      const played = [0, 3]
      for (let i = 0; i < size - 2; i++) {
        await store.next()
        played.push(store.currentIndex)
      }

      expect(new Set(played).size).toBe(size)
    })

    it('超出範圍或點到目前這首時不動作', async () => {
      store.playPlaylist(makePlaylist(3), 1)
      await store.playAt(1)
      expect(store.playHistory.length).toBe(0)
      await store.playAt(99)
      expect(store.currentIndex).toBe(1)
    })
  })
})
