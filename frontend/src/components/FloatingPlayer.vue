<template>
  <Teleport to="body">
    <Transition name="pl-pop">
      <div
        v-if="playerStore.isVisible && playerStore.currentVideo"
        class="pl-player"
        :class="{
          mini: playerStore.isMinimized,
          expanded: !playerStore.isMinimized,
          fullscreen: isFullscreen && !playerStore.isMinimized,
          'queue-open': showQueue && !playerStore.isMinimized
        }"
        role="region"
        aria-label="播放器"
      >
        <!-- 迷你模式頂部的細進度線 -->
        <div
          class="pl-miniprogress"
          aria-hidden="true"
        >
          <span :style="{ width: progressPercent + '%' }" />
        </div>

        <div class="pl-shell">
          <!-- ===== 影片舞台（永遠留在同一個 DOM 位置，切換大小不會重載） ===== -->
          <div
            class="pl-stage"
            @click="playerStore.isMinimized && playerStore.maximize()"
          >
            <div class="pl-stage-inner">
              <div id="pl-yt-player" />
            </div>
            <div
              v-if="playerStore.isMinimized"
              class="pl-stage-veil"
            >
              <ChevronUpIcon class="icon-sm" />
            </div>
          </div>

          <!-- ===== 標題 ===== -->
          <div class="pl-head">
            <div class="pl-titlewrap">
              <h3
                class="pl-title"
                :title="playerStore.currentVideo.title"
              >
                {{ playerStore.currentVideo.title }}
              </h3>
              <p class="pl-sub">
                <span
                  v-if="playerStore.hasPlaylist"
                  class="pl-count"
                >
                  {{ playerStore.currentIndex + 1 }} / {{ playerStore.playlistLength }}
                </span>
                <span
                  v-if="playerStore.hasPlaylist && playerStore.shuffleEnabled"
                  class="pl-chip"
                >隨機</span>
                <span
                  v-if="playerStore.hasPlaylist && playerStore.loopMode === 'single'"
                  class="pl-chip"
                >單曲循環</span>
              </p>
            </div>
          </div>

          <!-- ===== 視窗操作 ===== -->
          <div class="pl-window">
            <button
              v-if="playerStore.hasPlaylist"
              v-tooltip="'待播清單 (Q)'"
              class="pl-iconbtn pl-only-expanded"
              :class="{ on: showQueue }"
              :aria-pressed="showQueue"
              aria-label="待播清單"
              @click="showQueue = !showQueue"
            >
              <QueueListIcon class="icon-sm" />
            </button>
            <button
              v-tooltip="isFullscreen ? '退出滿版 (F)' : '滿版 (F)'"
              class="pl-iconbtn pl-only-expanded"
              :aria-label="isFullscreen ? '退出滿版' : '滿版'"
              @click="toggleFullscreen"
            >
              <ArrowsPointingInIcon
                v-if="isFullscreen"
                class="icon-sm"
              />
              <ArrowsPointingOutIcon
                v-else
                class="icon-sm"
              />
            </button>
            <button
              v-tooltip="playerStore.isMinimized ? '展開' : '縮小'"
              class="pl-iconbtn"
              :aria-label="playerStore.isMinimized ? '展開播放器' : '縮小播放器'"
              @click="playerStore.isMinimized ? playerStore.maximize() : playerStore.minimize()"
            >
              <ChevronUpIcon
                v-if="playerStore.isMinimized"
                class="icon-sm"
              />
              <ChevronDownIcon
                v-else
                class="icon-sm"
              />
            </button>
            <button
              v-tooltip="'關閉'"
              class="pl-iconbtn pl-close"
              aria-label="關閉播放器"
              @click="playerStore.close()"
            >
              <XMarkIcon class="icon-sm" />
            </button>
          </div>

          <!-- ===== 待播清單 ===== -->
          <aside
            v-if="playerStore.hasPlaylist"
            class="pl-queue"
            aria-label="待播清單"
          >
            <div class="pl-queue-head">
              <span>待播清單</span>
              <span class="pl-queue-count">{{ playerStore.playlistLength }} 首</span>
            </div>
            <ul class="pl-queue-list">
              <li
                v-for="(item, index) in playerStore.currentPlaylist.items"
                :key="item.id ?? index"
              >
                <button
                  class="pl-queue-item"
                  :class="{ current: index === playerStore.currentIndex }"
                  :aria-current="index === playerStore.currentIndex ? 'true' : undefined"
                  @click="playerStore.playAt(index)"
                >
                  <span class="pl-queue-index">
                    <SpeakerWaveIcon
                      v-if="index === playerStore.currentIndex"
                      class="icon-xs"
                    />
                    <template v-else>{{ index + 1 }}</template>
                  </span>
                  <span class="pl-queue-title">{{ item.title }}</span>
                  <span class="pl-queue-time">{{ formatDuration(item.duration) }}</span>
                </button>
              </li>
            </ul>
          </aside>

          <!-- ===== 進度 + 控制 ===== -->
          <div class="pl-transport">
            <!-- 進度條 -->
            <div class="pl-progress pl-only-expanded">
              <span class="pl-time">{{ formatTime(displayTime) }}</span>
              <div class="pl-track">
                <div
                  class="pl-track-fill"
                  :style="{ width: progressPercent + '%' }"
                />
                <input
                  type="range"
                  class="pl-range"
                  min="0"
                  :max="duration || 0"
                  step="0.1"
                  :value="displayTime"
                  :disabled="!duration"
                  :aria-label="'播放進度：' + formatTime(displayTime) + ' / ' + formatTime(duration)"
                  @input="onSeekInput"
                  @change="onSeekCommit"
                >
              </div>
              <span class="pl-time">{{ formatTime(duration) }}</span>
            </div>

            <!-- 按鈕列 -->
            <div class="pl-buttons">
              <div class="pl-modes pl-only-expanded">
                <button
                  v-if="playerStore.hasPlaylist"
                  v-tooltip="playerStore.shuffleEnabled ? '隨機播放：開 (S)' : '隨機播放：關 (S)'"
                  class="pl-iconbtn"
                  :class="{ on: playerStore.shuffleEnabled }"
                  :aria-pressed="playerStore.shuffleEnabled"
                  aria-label="隨機播放"
                  @click="playerStore.toggleShuffle()"
                >
                  <ArrowsRightLeftIcon class="icon-sm" />
                </button>
                <button
                  v-if="playerStore.hasPlaylist"
                  v-tooltip="playerStore.loopMode === 'single' ? '單曲循環 (R)' : '清單循環 (R)'"
                  class="pl-iconbtn"
                  :class="{ on: playerStore.loopMode === 'single' }"
                  :aria-pressed="playerStore.loopMode === 'single'"
                  aria-label="循環模式"
                  @click="playerStore.toggleLoopMode()"
                >
                  <ArrowPathRoundedSquareIcon
                    v-if="playerStore.loopMode === 'single'"
                    class="icon-sm"
                  />
                  <ArrowPathIcon
                    v-else
                    class="icon-sm"
                  />
                </button>
              </div>

              <div class="pl-playback">
                <button
                  v-if="playerStore.hasPlaylist"
                  v-tooltip="prevTooltip"
                  class="pl-iconbtn pl-step"
                  :disabled="!playerStore.canGoPrevious"
                  aria-label="上一首"
                  @click="playerStore.previous()"
                >
                  <BackwardIcon class="icon" />
                </button>
                <button
                  v-tooltip="playerStore.isPlaying ? '暫停 (空白鍵)' : '播放 (空白鍵)'"
                  class="pl-playbtn"
                  :aria-label="playerStore.isPlaying ? '暫停' : '播放'"
                  :aria-pressed="playerStore.isPlaying"
                  @click="playerStore.togglePlay()"
                >
                  <PauseIcon
                    v-if="playerStore.isPlaying"
                    class="icon"
                  />
                  <PlayIcon
                    v-else
                    class="icon"
                  />
                </button>
                <button
                  v-if="playerStore.hasPlaylist"
                  v-tooltip="'下一首'"
                  class="pl-iconbtn pl-step"
                  aria-label="下一首"
                  @click="playerStore.next()"
                >
                  <ForwardIcon class="icon" />
                </button>
              </div>

              <div class="pl-volume pl-only-expanded">
                <button
                  v-tooltip="playerStore.isMuted ? '取消靜音 (M)' : '靜音 (M)'"
                  class="pl-iconbtn"
                  :class="{ muted: playerStore.isMuted }"
                  :aria-label="playerStore.isMuted ? '取消靜音' : '靜音'"
                  :aria-pressed="playerStore.isMuted"
                  @click="playerStore.toggleMute()"
                >
                  <SpeakerXMarkIcon
                    v-if="playerStore.isMuted || playerStore.volume === 0"
                    class="icon-sm"
                  />
                  <SpeakerWaveIcon
                    v-else
                    class="icon-sm"
                  />
                </button>
                <input
                  type="range"
                  class="pl-range pl-volume-range"
                  min="0"
                  max="100"
                  :value="playerStore.isMuted ? 0 : playerStore.volume"
                  :style="{ '--pct': (playerStore.isMuted ? 0 : playerStore.volume) + '%' }"
                  :aria-label="'音量：' + playerStore.volume + '%'"
                  @input="onVolumeInput"
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useGlobalPlayerStore } from '@/stores/globalPlayerStore'
import {
  PlayIcon,
  PauseIcon,
  BackwardIcon,
  ForwardIcon,
  ArrowPathIcon,
  ArrowPathRoundedSquareIcon,
  ArrowsRightLeftIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  QueueListIcon
} from '@heroicons/vue/24/solid'

const playerStore = useGlobalPlayerStore()

const isFullscreen = ref(false)
const showQueue = ref(true)
const currentTime = ref(0)
const duration = ref(0)
const seekPreview = ref(null) // 拖曳中的暫時值，放開才真的 seek

let ytPlayer = null
let apiReady = false
let playerReady = false
let pollTimer = null
let initPromise = null
let isUpdatingFromYouTube = false

/* ---------------- computed ---------------- */

const displayTime = computed(() => seekPreview.value ?? currentTime.value)

const progressPercent = computed(() => {
  if (!duration.value) return 0
  return Math.min(100, (displayTime.value / duration.value) * 100)
})

const prevTooltip = computed(() => {
  if (playerStore.canGoPrevious) return '上一首'
  return '隨機播放中，還沒有播過的上一首'
})

/* ---------------- helpers ---------------- */

const extractVideoId = (url) => {
  if (!url) return null
  const match = url.match(/[?&]v=([^&]+)/)
  return match ? match[1] : null
}

const resolveVideoId = () => {
  const video = playerStore.currentVideo
  if (!video) return null
  return video.video_id || extractVideoId(video.youtube_url)
}

const formatTime = (seconds) => {
  if (!seconds || Number.isNaN(seconds)) return '0:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

const formatDuration = (value) => {
  if (!value) return ''
  // 後端可能給秒數，也可能給 "3:45" 這種字串
  if (typeof value === 'string' && value.includes(':')) return value
  return formatTime(Number(value))
}

/* ---------------- YouTube API ---------------- */

const loadYouTubeAPI = () => {
  return new Promise((resolve, reject) => {
    if (window.YT && window.YT.Player) {
      apiReady = true
      resolve()
      return
    }

    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval)
          apiReady = true
          resolve()
        }
      }, 100)
      return
    }

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.onerror = () => reject(new Error('Failed to load YouTube API'))

    window.onYouTubeIframeAPIReady = () => {
      apiReady = true
      resolve()
    }

    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
  })
}

const disposePlayer = () => {
  stopPolling()
  initPromise = null
  if (ytPlayer && typeof ytPlayer.destroy === 'function') {
    try {
      ytPlayer.destroy()
    } catch (error) {
      console.warn('FloatingPlayer: 銷毀播放器失敗', error)
    }
  }
  ytPlayer = null
  playerReady = false
  currentTime.value = 0
  duration.value = 0
}

const startPolling = () => {
  if (pollTimer) return
  pollTimer = setInterval(() => {
    if (!ytPlayer || !playerReady) return
    if (seekPreview.value !== null) return // 使用者正在拖曳，別覆蓋
    try {
      currentTime.value = ytPlayer.getCurrentTime() || 0
      const d = ytPlayer.getDuration() || 0
      if (d && d !== duration.value) duration.value = d
    } catch {
      /* 播放器還沒準備好，下一輪再試 */
    }
  }, 250)
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// 初始化的唯一入口：同時有多個 watcher 想建立播放器時，
// 只會真的建立一次（否則兩個 YT.Player 會搶同一個 DOM 節點，
// 互相把對方的 iframe 取代掉，畫面就變成空的）
const ensurePlayer = (videoId) => {
  if (!videoId) return Promise.resolve()
  if (ytPlayer) return Promise.resolve()
  if (initPromise) return initPromise
  initPromise = initPlayer(videoId).finally(() => { initPromise = null })
  return initPromise
}

const initPlayer = async (videoId) => {
  if (!videoId) return
  if (ytPlayer) return
  if (!apiReady) {
    try {
      await loadYouTubeAPI()
    } catch (error) {
      console.error('FloatingPlayer: YouTube API 載入失敗', error)
      return
    }
  }
  if (!playerStore.isVisible) return

  await nextTick()
  if (ytPlayer) return
  const container = document.getElementById('pl-yt-player')
  if (!container) return

  playerReady = false
  ytPlayer = new window.YT.Player('pl-yt-player', {
    height: '100%',
    width: '100%',
    videoId,
    playerVars: {
      autoplay: playerStore.isPlaying ? 1 : 0,
      controls: 1,
      modestbranding: 1,
      rel: 0,
      playsinline: 1,
      // 某些網域下沒帶 origin 會被 YouTube 擋掉
      origin: window.location.origin
    },
    events: {
      onReady: (event) => {
        playerReady = true
        event.target.setVolume(playerStore.volume)
        if (playerStore.isMuted) event.target.mute()
        duration.value = event.target.getDuration() || 0
        if (playerStore.isPlaying) event.target.playVideo()
        startPolling()
      },
      onStateChange: (event) => {
        const YT = window.YT.PlayerState
        if (event.data === YT.ENDED) {
          handleEnded()
        } else if (event.data === YT.PLAYING) {
          duration.value = ytPlayer.getDuration() || duration.value
          isUpdatingFromYouTube = true
          playerStore.play()
          setTimeout(() => { isUpdatingFromYouTube = false }, 50)
          startPolling()
        } else if (event.data === YT.PAUSED) {
          isUpdatingFromYouTube = true
          playerStore.pause()
          setTimeout(() => { isUpdatingFromYouTube = false }, 50)
        }
      },
      onError: (event) => {
        console.error('FloatingPlayer: 播放發生錯誤', event.data)
        // 影片無法播放時自動跳下一首，避免整個清單卡住
        if (playerStore.hasPlaylist) playerStore.next()
      }
    }
  })
}

const handleEnded = () => {
  if (playerStore.hasPlaylist && playerStore.loopMode !== 'single' && playerStore.playlistLength > 1) {
    playerStore.next()
    return
  }
  // 單曲循環、單一影片、或清單只剩一首 → 直接重播
  try {
    ytPlayer.seekTo(0)
    ytPlayer.playVideo()
  } catch (error) {
    console.warn('FloatingPlayer: 重播失敗', error)
  }
}

/* ---------------- 互動 ---------------- */

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

const onSeekInput = (event) => {
  seekPreview.value = Number(event.target.value)
}

const onSeekCommit = (event) => {
  const target = Number(event.target.value)
  seekPreview.value = null
  currentTime.value = target
  if (ytPlayer && playerReady) {
    try {
      ytPlayer.seekTo(target, true)
    } catch (error) {
      console.warn('FloatingPlayer: seek 失敗', error)
    }
  }
}

const seekBy = (delta) => {
  if (!ytPlayer || !playerReady || !duration.value) return
  const target = Math.max(0, Math.min(duration.value, currentTime.value + delta))
  currentTime.value = target
  try {
    ytPlayer.seekTo(target, true)
  } catch (error) {
    console.warn('FloatingPlayer: seek 失敗', error)
  }
}

const onVolumeInput = (event) => {
  playerStore.setVolume(Number(event.target.value))
}

/* ---------------- 鍵盤快捷鍵 ---------------- */

const isTypingTarget = (el) => {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

const onKeydown = (event) => {
  if (!playerStore.isVisible || !playerStore.currentVideo) return
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (isTypingTarget(event.target)) return

  const key = event.key.toLowerCase()

  switch (key) {
    case ' ':
    case 'k':
      event.preventDefault()
      playerStore.togglePlay()
      break
    case 'arrowleft':
      event.preventDefault()
      if (event.shiftKey) playerStore.previous()
      else seekBy(-5)
      break
    case 'arrowright':
      event.preventDefault()
      if (event.shiftKey) playerStore.next()
      else seekBy(5)
      break
    case 'j':
      event.preventDefault()
      seekBy(-10)
      break
    case 'l':
      event.preventDefault()
      seekBy(10)
      break
    case 'm':
      event.preventDefault()
      playerStore.toggleMute()
      break
    case 's':
      if (playerStore.hasPlaylist) {
        event.preventDefault()
        playerStore.toggleShuffle()
      }
      break
    case 'r':
      if (playerStore.hasPlaylist) {
        event.preventDefault()
        playerStore.toggleLoopMode()
      }
      break
    case 'q':
      if (playerStore.hasPlaylist && !playerStore.isMinimized) {
        event.preventDefault()
        showQueue.value = !showQueue.value
      }
      break
    case 'f':
      if (!playerStore.isMinimized) {
        event.preventDefault()
        toggleFullscreen()
      }
      break
    case 'escape':
      if (isFullscreen.value) {
        event.preventDefault()
        isFullscreen.value = false
      } else if (!playerStore.isMinimized) {
        event.preventDefault()
        playerStore.minimize()
      }
      break
    default:
      break
  }
}

/* ---------------- watchers ---------------- */

watch(() => playerStore.currentVideo?.video_id, (newId, oldId) => {
  if (!newId || newId === oldId) return
  const videoId = resolveVideoId()
  if (!videoId) return

  currentTime.value = 0
  duration.value = 0
  seekPreview.value = null

  if (ytPlayer && playerReady) {
    try {
      ytPlayer.loadVideoById(videoId)
      if (playerStore.isPlaying) ytPlayer.playVideo()
      return
    } catch (error) {
      console.warn('FloatingPlayer: 載入影片失敗，重建播放器', error)
      disposePlayer()
    }
  }
  ensurePlayer(videoId)
})

watch(() => playerStore.isPlaying, (isPlaying) => {
  if (isUpdatingFromYouTube) return
  if (!ytPlayer || !playerReady) return
  try {
    if (isPlaying) ytPlayer.playVideo()
    else ytPlayer.pauseVideo()
  } catch (error) {
    console.warn('FloatingPlayer: 控制播放失敗', error)
  }
})

watch(() => playerStore.volume, (value) => {
  if (ytPlayer && playerReady) {
    try { ytPlayer.setVolume(value) } catch { /* ignore */ }
  }
})

watch(() => playerStore.isMuted, (muted) => {
  if (ytPlayer && playerReady) {
    try { muted ? ytPlayer.mute() : ytPlayer.unMute() } catch { /* ignore */ }
  }
})

watch(() => playerStore.isVisible, async (visible) => {
  if (!visible) {
    disposePlayer()
    isFullscreen.value = false
    return
  }
  await nextTick()
  ensurePlayer(resolveVideoId())
})

/* ---------------- lifecycle ---------------- */

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  if (playerStore.isVisible && playerStore.currentVideo) {
    await nextTick()
    ensurePlayer(resolveVideoId())
  } else {
    loadYouTubeAPI().catch(() => {})
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  disposePlayer()
})
</script>

<style scoped>
/* ============================================================
   FloatingPlayer — 暖陽奶油
   影片舞台永遠留在同一個 DOM 節點，只用 CSS 改變尺寸，
   所以在迷你／展開之間切換時 iframe 不會重新載入。
   ============================================================ */

.pl-player {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 9999;
  font-family: var(--font-family-base, 'Nunito', -apple-system, sans-serif);
  color: var(--pl-ink-900, #3D332B);
}

.pl-shell {
  display: grid;
  background: var(--pl-surface, #FFFDF9);
  border: 1px solid var(--pl-line, #EBDFCC);
  box-shadow: 0 24px 56px rgba(122, 88, 56, 0.18);
  overflow: hidden;
}

.icon {
  width: 22px;
  height: 22px;
}
.icon-sm {
  width: 18px;
  height: 18px;
}
.icon-xs {
  width: 14px;
  height: 14px;
}

/* ---------------- 版面：展開 ---------------- */
.pl-player.expanded .pl-shell {
  width: min(940px, calc(100vw - 40px));
  border-radius: 24px;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'head      window'
    'stage     queue'
    'transport queue';
}

/* ---------------- 版面：迷你 ---------------- */
.pl-player.mini .pl-shell {
  width: min(440px, calc(100vw - 24px));
  border-radius: 18px;
  padding: 8px 10px 8px 8px;
  gap: 10px;
  align-items: center;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  grid-template-areas: 'stage head transport window';
}

.pl-player.mini .pl-only-expanded {
  display: none;
}

/* ---------------- 影片舞台 ---------------- */
.pl-stage {
  grid-area: stage;
  position: relative;
  overflow: hidden;
  background: #17120E;
}

.pl-player.expanded .pl-stage {
  width: 100%;
  aspect-ratio: 16 / 9;
}

/* 舊瀏覽器不支援 aspect-ratio 時，高度會變成 0、影片整個看不見 */
@supports not (aspect-ratio: 16 / 9) {
  .pl-player.expanded .pl-stage {
    height: 0;
    padding-bottom: 56.25%;
  }
}

.pl-stage-inner {
  position: absolute;
  inset: 0;
}

.pl-stage-inner :deep(iframe),
.pl-stage-inner > div {
  width: 100%;
  height: 100%;
  display: block;
  border: 0;
}

/* 迷你模式把 256x144 的 iframe 等比縮進 68x38 的小框，
   iframe 本身仍維持足夠尺寸，YouTube 才會正常播放 */
.pl-player.mini .pl-stage {
  width: 68px;
  height: 38px;
  border-radius: 10px;
  cursor: pointer;
  flex: none;
}

.pl-player.mini .pl-stage-inner {
  inset: auto;
  top: 0;
  left: 0;
  width: 256px;
  height: 144px;
  transform: scale(0.2656);
  transform-origin: top left;
  pointer-events: none;
}

.pl-stage-veil {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(23, 18, 14, 0.42);
  opacity: 0;
  transition: opacity var(--transition-fast, 160ms) ease;
}

.pl-stage:hover .pl-stage-veil {
  opacity: 1;
}

/* ---------------- 標題 ---------------- */
.pl-head {
  grid-area: head;
  min-width: 0;
}

.pl-player.expanded .pl-head {
  padding: 18px 8px 12px 22px;
}

.pl-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: var(--pl-ink-900, #3D332B);
}

.pl-player.expanded .pl-title {
  font-size: 17px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pl-player.mini .pl-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pl-sub {
  margin: 5px 0 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--pl-ink-300, #AC9B88);
}

.pl-sub:empty {
  display: none;
}

.pl-count {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.pl-chip {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(224, 141, 90, 0.14);
  color: var(--pl-amber-700, #A85C31);
  font-size: 11px;
  font-weight: 700;
}

/* ---------------- 視窗操作 ---------------- */
.pl-window {
  grid-area: window;
  display: flex;
  align-items: center;
  gap: 2px;
}

.pl-player.expanded .pl-window {
  align-self: start;
  padding: 16px 16px 0 0;
}

/* ---------------- 按鈕 ---------------- */
.pl-iconbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--pl-ink-500, #877565);
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, transform 160ms ease;
}

.pl-iconbtn:hover:not(:disabled) {
  background: var(--pl-cream-300, #F0E4D2);
  color: var(--pl-ink-900, #3D332B);
}

.pl-iconbtn:active:not(:disabled) {
  transform: scale(0.94);
}

.pl-iconbtn:disabled {
  opacity: 0.32;
  cursor: not-allowed;
}

.pl-iconbtn.on {
  background: rgba(224, 141, 90, 0.16);
  color: var(--pl-amber-700, #A85C31);
}

.pl-iconbtn.muted {
  color: var(--pl-terracotta, #D4634F);
}

.pl-close:hover {
  background: rgba(212, 99, 79, 0.14);
  color: var(--pl-terracotta, #D4634F);
}

.pl-player.mini .pl-iconbtn {
  width: 32px;
  height: 32px;
}

.pl-playbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 999px;
  color: #fff;
  background: var(--pl-accent-gradient, linear-gradient(135deg, #EDA97B, #E08D5A));
  box-shadow: 0 6px 16px rgba(201, 116, 66, 0.32);
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.pl-playbtn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(201, 116, 66, 0.38);
}

.pl-playbtn:active {
  transform: scale(0.95);
}

.pl-player.mini .pl-playbtn {
  width: 38px;
  height: 38px;
}

.pl-player.mini .pl-playbtn .icon {
  width: 18px;
  height: 18px;
}

/* ---------------- 進度 + 控制列 ---------------- */
.pl-transport {
  grid-area: transport;
}

.pl-player.expanded .pl-transport {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 22px 20px;
}

.pl-player.mini .pl-transport {
  display: flex;
  align-items: center;
  gap: 2px;
}

.pl-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pl-time {
  min-width: 42px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--pl-ink-300, #AC9B88);
}

.pl-time:last-child {
  text-align: right;
}

.pl-track {
  position: relative;
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: var(--pl-cream-300, #F0E4D2);
}

.pl-track-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  border-radius: 999px;
  background: var(--pl-accent-gradient, linear-gradient(135deg, #EDA97B, #E08D5A));
  pointer-events: none;
}

.pl-track-fill::after {
  content: '';
  position: absolute;
  right: -6px;
  top: 50%;
  width: 13px;
  height: 13px;
  border-radius: 999px;
  background: #fff;
  border: 2px solid var(--pl-amber-500, #E08D5A);
  transform: translateY(-50%) scale(0);
  transition: transform 160ms ease;
}

.pl-track:hover .pl-track-fill::after,
.pl-track:focus-within .pl-track-fill::after {
  transform: translateY(-50%) scale(1);
}

/* 透明的 range 疊在視覺軌道上負責互動 */
.pl-track .pl-range {
  position: absolute;
  top: -9px;
  left: 0;
  width: 100%;
  height: 24px;
  margin: 0;
  padding: 0;
  opacity: 0;
  cursor: pointer;
  background: none;
  border: none;
}

.pl-track .pl-range:disabled {
  cursor: default;
}

.pl-buttons {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pl-modes,
.pl-volume {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 0;
  min-width: 0;
}

.pl-volume {
  justify-content: flex-end;
}

.pl-playback {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pl-volume-range {
  -webkit-appearance: none;
  appearance: none;
  width: 92px;
  height: 6px;
  border-radius: 999px;
  cursor: pointer;
  background: linear-gradient(
    to right,
    var(--pl-amber-500, #E08D5A) var(--pct, 100%),
    var(--pl-cream-300, #F0E4D2) var(--pct, 100%)
  );
}

.pl-volume-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: #fff;
  border: 2px solid var(--pl-amber-500, #E08D5A);
  box-shadow: 0 1px 3px rgba(122, 88, 56, 0.3);
}

.pl-volume-range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: #fff;
  border: 2px solid var(--pl-amber-500, #E08D5A);
}

/* ---------------- 迷你模式的細進度線 ---------------- */
.pl-miniprogress {
  display: none;
}

.pl-player.mini .pl-miniprogress {
  display: block;
  position: absolute;
  top: 0;
  left: 18px;
  right: 18px;
  height: 3px;
  border-radius: 999px;
  background: var(--pl-cream-300, #F0E4D2);
  overflow: hidden;
  z-index: 2;
}

.pl-player.mini .pl-miniprogress span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--pl-accent-gradient, linear-gradient(135deg, #EDA97B, #E08D5A));
  transition: width 240ms linear;
}

/* ---------------- 待播清單 ---------------- */
.pl-queue {
  grid-area: queue;
  width: 300px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--pl-line, #EBDFCC);
  background: var(--pl-cream-100, #FDF8F0);
  min-height: 0;
}

.pl-player:not(.queue-open) .pl-queue {
  display: none;
}

.pl-queue-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 16px 18px 10px;
  font-size: 13px;
  font-weight: 700;
  color: var(--pl-ink-700, #5C4F44);
}

.pl-queue-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--pl-ink-300, #AC9B88);
}

.pl-queue-list {
  list-style: none;
  margin: 0;
  padding: 0 10px 12px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.pl-queue-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: 12px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: var(--pl-ink-700, #5C4F44);
  font-family: inherit;
  transition: background 160ms ease, color 160ms ease;
}

.pl-queue-item:hover {
  background: var(--pl-cream-300, #F0E4D2);
  color: var(--pl-ink-900, #3D332B);
}

.pl-queue-item.current {
  background: rgba(224, 141, 90, 0.14);
  color: var(--pl-amber-700, #A85C31);
}

.pl-queue-index {
  flex: none;
  width: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--pl-ink-300, #AC9B88);
}

.pl-queue-item.current .pl-queue-index {
  color: var(--pl-amber-600, #C97442);
}

.pl-queue-title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pl-queue-time {
  flex: none;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--pl-ink-300, #AC9B88);
}

/* ---------------- 滿版 ---------------- */
.pl-player.fullscreen {
  inset: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(61, 51, 43, 0.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.pl-player.fullscreen .pl-shell {
  width: min(1440px, 100%);
  max-height: calc(100vh - 48px);
}

.pl-player.fullscreen .pl-queue-list {
  max-height: none;
}

/* ---------------- 進場動畫 ---------------- */
.pl-pop-enter-active,
.pl-pop-leave-active {
  transition: opacity 240ms cubic-bezier(0.32, 0.72, 0, 1),
    transform 240ms cubic-bezier(0.32, 0.72, 0, 1);
}

.pl-pop-enter-from,
.pl-pop-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.98);
}

/* ---------------- 響應式 ---------------- */
@media (max-width: 760px) {
  .pl-player {
    right: 10px;
    bottom: 10px;
  }

  .pl-player.expanded {
    left: 10px;
  }

  .pl-player.expanded .pl-shell {
    width: 100%;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'head      window'
      'stage     stage'
      'transport transport'
      'queue     queue';
  }

  .pl-queue {
    width: auto;
    border-left: none;
    border-top: 1px solid var(--pl-line, #EBDFCC);
    max-height: 200px;
  }

  .pl-player.expanded .pl-head {
    padding: 14px 8px 10px 16px;
  }

  .pl-player.expanded .pl-window {
    padding: 12px 12px 0 0;
  }

  .pl-player.expanded .pl-transport {
    padding: 12px 16px 16px;
  }

  .pl-modes,
  .pl-volume {
    flex: 0 0 auto;
  }

  .pl-volume-range {
    width: 64px;
  }
}

@media (max-width: 480px) {
  .pl-volume-range {
    display: none;
  }
}
</style>
