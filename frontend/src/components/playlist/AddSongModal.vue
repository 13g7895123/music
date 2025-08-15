<template>
  <div class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>添加歌曲到播放清單</h2>
        <button @click="closeModal" class="close-button">×</button>
      </div>

      <div class="modal-body">
        <!-- 選項卡 -->
        <div class="tab-container">
          <button
            :class="['tab-button', { active: activeTab === 'url' }]"
            @click="activeTab = 'url'"
          >
            YouTube URL
          </button>
          <button
            :class="['tab-button', { active: activeTab === 'copy' }]"
            @click="activeTab = 'copy'"
          >
            從其他播放清單
          </button>
        </div>

        <!-- YouTube URL 選項卡 -->
        <div v-if="activeTab === 'url'" class="tab-content">
          <!-- 單個URL輸入 -->
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
              <button
                @click="autoFillFromClipboard"
                :disabled="!clipboardSupported"
                class="clipboard-button"
                title="從剪貼簿自動填入"
              >
                📋
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
                @paste="onBatchPaste"
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
        <div v-if="activeTab === 'copy'" class="tab-content">
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

        <!-- 錯誤訊息 -->
        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <!-- 成功訊息 -->
        <div v-if="successMessage" class="success-message">
          {{ successMessage }}
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
import { useClipboard } from '@/composables/useClipboard'

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
const clipboard = useClipboard()

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
const error = ref('')
const successMessage = ref('')

const clipboardSupported = computed(() => clipboard.isSupported.value)

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
    const urls = pastedText.split('\n').filter(url => url.trim())
    if (urls.length > 1) {
      batchUrls.value = pastedText
      showBatchInput.value = true
      currentUrl.value = ''
    }
  }
}

const onBatchPaste = (event: ClipboardEvent) => {
  const pastedText = event.clipboardData?.getData('text')
  if (pastedText) {
    const urls = youtubeService.extractUrlsFromText(pastedText)
    if (urls.length > 0) {
      batchUrls.value = urls.join('\n')
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

const autoFillFromClipboard = async () => {
  try {
    const result = await clipboard.autoFillFromClipboard()
    if (result.success && result.urls.length > 0) {
      if (result.urls.length === 1) {
        currentUrl.value = result.urls[0]
      } else {
        batchUrls.value = result.urls.join('\n')
        showBatchInput.value = true
      }
      successMessage.value = result.message
    } else {
      error.value = result.message
    }
  } catch (error: any) {
    error.value = '無法讀取剪貼簿內容'
  }
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
    await playlistStore.fetchPlaylistDetail(parseInt(selectedSourcePlaylist.value))
    sourceSongs.value = playlistStore.currentPlaylist?.songs || []
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
      const validSongs = pendingSongs.value.filter(song => !song.error)
      const urls = validSongs.map(song => song.url)
      
      if (urls.length > 0) {
        await playlistStore.addSongsByYouTubeUrls(props.playlistId, urls)
        successMessage.value = `成功添加 ${urls.length} 首歌曲`
      }
    } else {
      const songIds = selectedSongs.value
      await playlistStore.addMultipleSongsToPlaylist(props.playlistId, songIds)
      successMessage.value = `成功添加 ${songIds.length} 首歌曲`
    }

    setTimeout(() => {
      emit('added')
    }, 1500)
  } catch (error: any) {
    error.value = error.response?.data?.message || '添加失敗'
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

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: background 0.2s;
}

.close-button:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.tab-container {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1.5rem;
}

.tab-button {
  flex: 1;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-button.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.tab-button:hover:not(.active) {
  color: #374151;
}

.tab-content {
  min-height: 300px;
}

.url-input-section {
  margin-bottom: 1.5rem;
}

.input-group {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.url-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.add-url-button,
.clipboard-button {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.2s;
}

.add-url-button {
  background: #3b82f6;
  color: white;
}

.add-url-button:hover:not(:disabled) {
  background: #2563eb;
}

.add-url-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clipboard-button {
  background: #6b7280;
  color: white;
}

.clipboard-button:hover:not(:disabled) {
  background: #4b5563;
}

.clipboard-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.batch-section {
  margin-bottom: 1.5rem;
}

.toggle-batch {
  background: none;
  border: 1px solid #d1d5db;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.toggle-batch:hover {
  background: #f9fafb;
}

.batch-input {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.batch-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  resize: vertical;
  margin-bottom: 0.75rem;
  font-family: inherit;
}

.pending-songs {
  margin-top: 1.5rem;
}

.pending-songs h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 1rem 0;
}

.pending-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.pending-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  align-items: center;
}

.pending-item:last-child {
  border-bottom: none;
}

.pending-item.error {
  background: #fef2f2;
  border-left: 3px solid #ef4444;
}

.pending-item .song-thumbnail {
  width: 48px;
  height: 48px;
  border-radius: 0.25rem;
  overflow: hidden;
  flex-shrink: 0;
}

.pending-item .song-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pending-item .thumbnail-placeholder {
  width: 100%;
  height: 100%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.pending-item .song-info {
  flex: 1;
  min-width: 0;
}

.pending-item .song-info h4 {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
  margin: 0 0 0.25rem 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-item .song-info p {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0 0 0.25rem 0;
}

.pending-item .song-info small {
  font-size: 0.625rem;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.remove-button {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: background 0.2s;
}

.remove-button:hover {
  background: #f3f4f6;
  color: #dc2626;
}

.source-playlist-selector {
  margin-bottom: 1.5rem;
}

.playlist-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: white;
}

.source-songs {
  margin-top: 1.5rem;
}

.songs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.songs-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.select-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-link {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  transition: background 0.2s;
}

.btn-link:hover {
  background: #eff6ff;
}

.source-songs-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.source-song-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.2s;
  align-items: center;
}

.source-song-item:hover,
.source-song-item.selected {
  background: #f9fafb;
}

.source-song-item:last-child {
  border-bottom: none;
}

.source-song-item input[type="checkbox"] {
  margin: 0;
}

.source-song-item .song-thumbnail {
  width: 48px;
  height: 48px;
  border-radius: 0.25rem;
  overflow: hidden;
  flex-shrink: 0;
}

.source-song-item .song-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.source-song-item .thumbnail-placeholder {
  width: 100%;
  height: 100%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.source-song-item .song-info {
  flex: 1;
  min-width: 0;
}

.source-song-item .song-info h4 {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
  margin: 0 0 0.25rem 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-song-item .song-info p {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.footer-info {
  font-size: 0.875rem;
  color: #6b7280;
}

.footer-actions {
  display: flex;
  gap: 0.75rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.field-hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.search-container {
  display: flex;
  gap: 0.5rem;
}

.search-button {
  padding: 0.75rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.search-button:hover:not(:disabled) {
  background: #2563eb;
}

.search-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.validation-results,
.search-results {
  margin-top: 1.5rem;
}

.validation-results h4,
.search-results h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 1rem 0;
}

.url-results,
.song-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.url-result {
  padding: 1rem;
  border-bottom: 1px solid #f3f4f6;
}

.url-result:last-child {
  border-bottom: none;
}

.url-result.valid {
  background: #f0fdf4;
  border-left: 3px solid #22c55e;
}

.url-result.invalid {
  background: #fef2f2;
  border-left: 3px solid #ef4444;
}

.url-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.url-text {
  font-size: 0.875rem;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.url-error {
  font-size: 0.75rem;
  color: #dc2626;
  margin-top: 0.25rem;
}

.video-info {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.video-thumbnail {
  width: 60px;
  height: 45px;
  object-fit: cover;
  border-radius: 0.25rem;
  flex-shrink: 0;
}

.video-details {
  flex: 1;
  min-width: 0;
}

.video-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-artist {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.125rem;
}

.song-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.2s;
}

.song-item:hover,
.song-item.selected {
  background: #f9fafb;
}

.song-item:last-child {
  border-bottom: none;
}

.song-checkbox {
  flex-shrink: 0;
}

.song-thumbnail {
  width: 48px;
  height: 48px;
  border-radius: 0.25rem;
  overflow: hidden;
  flex-shrink: 0;
}

.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.song-info {
  flex: 1;
  min-width: 0;
}

.song-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-artist {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.125rem;
}

.song-duration {
  color: #6b7280;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.loading-state {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-hint {
  font-size: 0.75rem;
  opacity: 0.8;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  color: #dc2626;
  font-size: 0.875rem;
}

.success-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 0.5rem;
  color: #16a34a;
  font-size: 0.875rem;
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: 0.5rem;
  }

  .modal-header {
    padding: 1rem 1rem 0.75rem;
  }

  .modal-body {
    padding: 1rem;
  }

  .search-container {
    flex-direction: column;
  }

  .form-actions {
    flex-direction: column;
    gap: 0.5rem;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
    justify-content: center;
  }
}
</style>