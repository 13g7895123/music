# Story 12: 歌曲新增介面

## 📋 基本資訊
- **Story ID**: YMP-012
- **Epic**: 播放清單管理
- **優先級**: Must Have (P0)
- **預估點數**: 6 points
- **預估時間**: 1-2 天
- **依賴關係**: Story 10, Story 11
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 已登入用戶  
**我希望** 能夠輕鬆地透過YouTube URL添加歌曲到播放清單  
**以便** 快速建立我的音樂收藏

## 📝 詳細需求

### 核心功能需求
1. **URL輸入**: 支援各種YouTube URL格式
2. **即時預覽**: 輸入URL後立即顯示歌曲資訊
3. **批量添加**: 支援一次添加多個URL
4. **錯誤處理**: 清楚的錯誤提示和重試機制
5. **快速操作**: 從其他播放清單複製歌曲

### 技術規格

**添加歌曲Modal組件**:
```vue
<!-- frontend/src/components/playlist/AddSongModal.vue -->
<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>添加歌曲</h2>
        <button @click="closeModal" class="close-button">✕</button>
      </div>

      <div class="modal-body">
        <div class="add-methods">
          <div class="method-tabs">
            <button
              :class="{ active: activeTab === 'url' }"
              @click="activeTab = 'url'"
              class="tab-button"
            >
              YouTube URL
            </button>
            <button
              :class="{ active: activeTab === 'copy' }"
              @click="activeTab = 'copy'"
              class="tab-button"
            >
              從其他播放清單
            </button>
          </div>

          <!-- YouTube URL 添加 -->
          <div v-if="activeTab === 'url'" class="url-section">
            <div class="url-input-section">
              <label for="youtube-url">YouTube URL</label>
              <div class="input-group">
                <input
                  id="youtube-url"
                  v-model="currentUrl"
                  type="text"
                  placeholder="請輸入 YouTube 影片連結..."
                  class="url-input"
                  @paste="onUrlPaste"
                  @keyup.enter="addUrl"
                />
                <button
                  @click="addUrl"
                  :disabled="!currentUrl || isValidating"
                  class="add-url-button"
                >
                  {{ isValidating ? '驗證中...' : '添加' }}
                </button>
              </div>
              <p class="input-hint">
                支援格式：youtube.com/watch?v=xxx, youtu.be/xxx 等
              </p>
            </div>

            <!-- 批量添加 -->
            <div class="batch-section">
              <button
                @click="showBatchInput = !showBatchInput"
                class="toggle-batch"
              >
                {{ showBatchInput ? '隱藏' : '顯示' }}批量添加
              </button>
              
              <div v-if="showBatchInput" class="batch-input">
                <label for="batch-urls">批量添加 (每行一個URL)</label>
                <textarea
                  id="batch-urls"
                  v-model="batchUrls"
                  placeholder="https://www.youtube.com/watch?v=xxx&#10;https://youtu.be/xxx&#10;..."
                  rows="5"
                  class="batch-textarea"
                ></textarea>
                <button
                  @click="processBatchUrls"
                  :disabled="!batchUrls.trim() || isProcessing"
                  class="btn-secondary"
                >
                  {{ isProcessing ? '處理中...' : '批量添加' }}
                </button>
              </div>
            </div>

            <!-- 待添加歌曲列表 -->
            <div v-if="pendingSongs.length > 0" class="pending-songs">
              <h3>待添加歌曲 ({{ pendingSongs.length }})</h3>
              <div class="pending-list">
                <div
                  v-for="(song, index) in pendingSongs"
                  :key="index"
                  class="pending-item"
                  :class="{ error: song.error }"
                >
                  <div class="song-thumbnail">
                    <img
                      v-if="song.thumbnailUrl && !song.error"
                      :src="song.thumbnailUrl"
                      :alt="song.title"
                    />
                    <div v-else class="thumbnail-placeholder">
                      {{ song.error ? '❌' : '🎵' }}
                    </div>
                  </div>
                  
                  <div class="song-info">
                    <h4>{{ song.error ? '無法載入' : song.title }}</h4>
                    <p>{{ song.error || song.artist || '未知藝術家' }}</p>
                    <small v-if="song.url">{{ song.url }}</small>
                  </div>
                  
                  <button
                    @click="removePendingSong(index)"
                    class="remove-button"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 從其他播放清單複製 -->
          <div v-if="activeTab === 'copy'" class="copy-section">
            <div class="source-playlist-selector">
              <label for="source-playlist">選擇來源播放清單</label>
              <select
                id="source-playlist"
                v-model="selectedSourcePlaylist"
                class="playlist-select"
                @change="loadSourcePlaylistSongs"
              >
                <option value="">請選擇播放清單</option>
                <option
                  v-for="playlist in availablePlaylists"
                  :key="playlist.id"
                  :value="playlist.id"
                >
                  {{ playlist.name }} ({{ playlist._count.songs }} 首歌)
                </option>
              </select>
            </div>

            <div v-if="sourceSongs.length > 0" class="source-songs">
              <div class="songs-header">
                <h3>選擇要複製的歌曲</h3>
                <div class="select-actions">
                  <button @click="selectAllSourceSongs" class="btn-link">
                    全選
                  </button>
                  <button @click="deselectAllSourceSongs" class="btn-link">
                    取消全選
                  </button>
                </div>
              </div>
              
              <div class="source-songs-list">
                <div
                  v-for="song in sourceSongs"
                  :key="song.id"
                  class="source-song-item"
                  :class="{ selected: selectedSongs.includes(song.song.id) }"
                  @click="toggleSongSelection(song.song.id)"
                >
                  <input
                    type="checkbox"
                    :checked="selectedSongs.includes(song.song.id)"
                    @change="toggleSongSelection(song.song.id)"
                  />
                  <div class="song-thumbnail">
                    <img
                      v-if="song.song.thumbnailUrl"
                      :src="song.song.thumbnailUrl"
                      :alt="song.song.title"
                    />
                    <div v-else class="thumbnail-placeholder">🎵</div>
                  </div>
                  <div class="song-info">
                    <h4>{{ song.song.title }}</h4>
                    <p>{{ song.song.artist || '未知藝術家' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <div class="footer-info">
          <span v-if="activeTab === 'url' && pendingSongs.length > 0">
            將添加 {{ pendingSongs.filter(s => !s.error).length }} 首歌曲
          </span>
          <span v-if="activeTab === 'copy' && selectedSongs.length > 0">
            已選擇 {{ selectedSongs.length }} 首歌曲
          </span>
        </div>
        <div class="footer-actions">
          <button @click="closeModal" class="btn-secondary">
            取消
          </button>
          <button
            @click="confirmAdd"
            :disabled="!canConfirm || isAdding"
            class="btn-primary"
          >
            {{ isAdding ? '添加中...' : '確定添加' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePlaylistStore } from '@/stores/playlist'
import { useYouTubeService } from '@/services/youtube'

interface Props {
  playlistId: number
}

interface PendingSong {
  title: string
  artist?: string
  thumbnailUrl?: string
  url: string
  youtubeId: string
  error?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  added: []
}>()

const playlistStore = usePlaylistStore()
const youtubeService = useYouTubeService()

const activeTab = ref<'url' | 'copy'>('url')
const currentUrl = ref('')
const batchUrls = ref('')
const showBatchInput = ref(false)
const isValidating = ref(false)
const isProcessing = ref(false)
const isAdding = ref(false)

const pendingSongs = ref<PendingSong[]>([])
const availablePlaylists = ref([])
const selectedSourcePlaylist = ref('')
const sourceSongs = ref([])
const selectedSongs = ref<number[]>([])

const canConfirm = computed(() => {
  if (activeTab.value === 'url') {
    return pendingSongs.value.some(song => !song.error)
  } else {
    return selectedSongs.value.length > 0
  }
})

const addUrl = async () => {
  if (!currentUrl.value || isValidating.value) return

  isValidating.value = true
  try {
    const videoInfo = await youtubeService.parseUrl(currentUrl.value)
    
    // 檢查是否已經存在
    const exists = pendingSongs.value.some(song => song.youtubeId === videoInfo.id)
    if (exists) {
      throw new Error('這首歌曲已經在待添加列表中')
    }

    pendingSongs.value.push({
      title: videoInfo.title,
      artist: videoInfo.artist,
      thumbnailUrl: videoInfo.thumbnailUrl,
      url: currentUrl.value,
      youtubeId: videoInfo.id
    })

    currentUrl.value = ''
  } catch (error: any) {
    pendingSongs.value.push({
      title: '',
      url: currentUrl.value,
      youtubeId: '',
      error: error.message || '無法解析此URL'
    })
  } finally {
    isValidating.value = false
  }
}

const onUrlPaste = async (event: ClipboardEvent) => {
  const pastedText = event.clipboardData?.getData('text')
  if (pastedText) {
    // 檢查是否包含多個URL
    const urls = pastedText.split('\n').filter(url => url.trim())
    if (urls.length > 1) {
      batchUrls.value = pastedText
      showBatchInput.value = true
      currentUrl.value = ''
    }
  }
}

const processBatchUrls = async () => {
  const urls = batchUrls.value
    .split('\n')
    .map(url => url.trim())
    .filter(url => url)

  if (urls.length === 0) return

  isProcessing.value = true
  try {
    const results = await youtubeService.parseBatch(urls)
    
    results.successful.forEach(videoInfo => {
      const exists = pendingSongs.value.some(song => song.youtubeId === videoInfo.id)
      if (!exists) {
        pendingSongs.value.push({
          title: videoInfo.title,
          artist: videoInfo.artist,
          thumbnailUrl: videoInfo.thumbnailUrl,
          url: urls.find(url => url.includes(videoInfo.id)) || '',
          youtubeId: videoInfo.id
        })
      }
    })

    results.failed.forEach(failure => {
      pendingSongs.value.push({
        title: '',
        url: failure.url,
        youtubeId: '',
        error: failure.error
      })
    })

    batchUrls.value = ''
    showBatchInput.value = false
  } catch (error: any) {
    console.error('Batch processing failed:', error)
  } finally {
    isProcessing.value = false
  }
}

const removePendingSong = (index: number) => {
  pendingSongs.value.splice(index, 1)
}

const loadAvailablePlaylists = async () => {
  try {
    await playlistStore.fetchPlaylists({ page: 1, limit: 100 })
    availablePlaylists.value = playlistStore.playlists.filter(
      p => p.id !== props.playlistId
    )
  } catch (error) {
    console.error('Failed to load playlists:', error)
  }
}

const loadSourcePlaylistSongs = async () => {
  if (!selectedSourcePlaylist.value) return

  try {
    const playlist = await playlistStore.fetchPlaylistDetail(
      parseInt(selectedSourcePlaylist.value)
    )
    sourceSongs.value = playlist.songs || []
    selectedSongs.value = []
  } catch (error) {
    console.error('Failed to load source playlist songs:', error)
  }
}

const toggleSongSelection = (songId: number) => {
  const index = selectedSongs.value.indexOf(songId)
  if (index > -1) {
    selectedSongs.value.splice(index, 1)
  } else {
    selectedSongs.value.push(songId)
  }
}

const selectAllSourceSongs = () => {
  selectedSongs.value = sourceSongs.value.map(song => song.song.id)
}

const deselectAllSourceSongs = () => {
  selectedSongs.value = []
}

const confirmAdd = async () => {
  isAdding.value = true
  
  try {
    if (activeTab.value === 'url') {
      // 添加URL解析的歌曲
      const validSongs = pendingSongs.value.filter(song => !song.error)
      
      for (const song of validSongs) {
        await playlistStore.addSongToPlaylist(props.playlistId, {
          youtubeUrl: song.url
        })
      }
    } else {
      // 複製選中的歌曲
      const songIds = selectedSongs.value
      await playlistStore.addMultipleSongsToPlaylist(props.playlistId, songIds)
    }

    emit('added')
  } catch (error: any) {
    console.error('Failed to add songs:', error)
    // 可以顯示錯誤提示
  } finally {
    isAdding.value = false
  }
}

const closeModal = () => {
  emit('close')
}

onMounted(() => {
  loadAvailablePlaylists()
})
</script>
```

**YouTube服務整合**:
```typescript
// frontend/src/services/youtube.ts
import { api } from './api'

export interface YouTubeVideoInfo {
  id: string
  title: string
  artist?: string
  duration: number
  thumbnailUrl: string
}

export interface BatchParseResult {
  successful: YouTubeVideoInfo[]
  failed: { url: string; error: string }[]
}

export const useYouTubeService = () => {
  const parseUrl = async (url: string): Promise<YouTubeVideoInfo> => {
    const response = await api.post('/youtube/parse', { url })
    return response.data.data
  }

  const parseBatch = async (urls: string[]): Promise<BatchParseResult> => {
    const response = await api.post('/youtube/parse-batch', { urls })
    return response.data.data
  }

  const validateUrl = async (url: string): Promise<{
    isValid: boolean
    videoId: string | null
  }> => {
    const response = await api.post('/youtube/validate', { url })
    return response.data.data
  }

  return {
    parseUrl,
    parseBatch,
    validateUrl
  }
}
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `frontend/src/components/playlist/AddSongModal.vue` - 添加歌曲Modal組件
- `frontend/src/services/youtube.ts` - YouTube服務前端整合
- `frontend/src/components/playlist/BatchAddModal.vue` - 批量添加組件
- `frontend/src/composables/useClipboard.ts` - 剪貼簿工具

**更新檔案**:
- `frontend/src/stores/playlist.ts` - 添加歌曲管理方法
- `frontend/src/views/PlaylistDetailView.vue` - 整合添加歌曲功能

## ✅ 驗收條件

### 功能驗收
- [ ] 可以透過YouTube URL添加單首歌曲
- [ ] 支援各種YouTube URL格式
- [ ] 批量添加功能正常運作
- [ ] 從其他播放清單複製歌曲功能正常
- [ ] 即時URL驗證和預覽

### UI/UX驗收
- [ ] Modal介面美觀易用
- [ ] 載入狀態有適當反饋
- [ ] 錯誤提示清晰明確
- [ ] 批量操作有進度提示

### 整合驗收
- [ ] 與YouTube解析API正常整合
- [ ] 與播放清單管理API正常整合
- [ ] 重複歌曲有適當處理

## 🚀 實作指引

### Step 1: 建立服務整合
實作youtube.ts前端服務

### Step 2: 建立添加歌曲Modal
按照技術規格建立AddSongModal.vue

### Step 3: 整合到播放清單頁面
在PlaylistDetailView中集成添加功能

### Step 4: 測試各種URL格式
測試不同的YouTube URL格式

## 📊 預期成果
- ✅ 直觀的歌曲添加介面
- ✅ 強大的URL解析能力
- ✅ 高效的批量操作
- ✅ 靈活的歌曲複製功能
- ✅ 完善的錯誤處理