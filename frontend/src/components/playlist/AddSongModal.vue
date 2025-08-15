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
            :class="['tab-button', { active: activeTab === 'youtube' }]"
            @click="activeTab = 'youtube'"
          >
            YouTube URL
          </button>
          <button
            :class="['tab-button', { active: activeTab === 'search' }]"
            @click="activeTab = 'search'"
          >
            搜尋歌曲
          </button>
        </div>

        <!-- YouTube URL 選項卡 -->
        <div v-if="activeTab === 'youtube'" class="tab-content">
          <div class="form-group">
            <label>YouTube 網址</label>
            <textarea
              v-model="youtubeUrls"
              placeholder="輸入 YouTube 網址，每行一個&#10;例如：&#10;https://www.youtube.com/watch?v=dQw4w9WgXcQ&#10;https://youtu.be/dQw4w9WgXcQ"
              class="form-textarea"
              rows="6"
            />
            <div class="field-hint">
              每行輸入一個 YouTube 網址，最多 10 個
            </div>
          </div>

          <div class="form-actions">
            <button
              @click="validateUrls"
              :disabled="!youtubeUrls.trim() || isValidating"
              class="btn-secondary"
            >
              <span v-if="isValidating" class="loading-spinner"></span>
              {{ isValidating ? '驗證中...' : '驗證網址' }}
            </button>
            <button
              @click="addFromYoutube"
              :disabled="!validUrls.length || isSubmitting"
              class="btn-primary"
            >
              <span v-if="isSubmitting" class="loading-spinner"></span>
              {{ isSubmitting ? '添加中...' : `添加 ${validUrls.length} 首歌曲` }}
            </button>
          </div>

          <!-- URL 驗證結果 -->
          <div v-if="urlValidationResults.length > 0" class="validation-results">
            <h4>驗證結果</h4>
            <div class="url-results">
              <div
                v-for="result in urlValidationResults"
                :key="result.url"
                :class="['url-result', { valid: result.isValid, invalid: !result.isValid }]"
              >
                <div class="url-info">
                  <span class="url-status">{{ result.isValid ? '✅' : '❌' }}</span>
                  <span class="url-text">{{ result.url }}</span>
                </div>
                <div v-if="result.error" class="url-error">{{ result.error }}</div>
                <div v-if="result.videoInfo" class="video-info">
                  <img
                    v-if="result.videoInfo.thumbnailUrl"
                    :src="result.videoInfo.thumbnailUrl"
                    :alt="result.videoInfo.title"
                    class="video-thumbnail"
                  />
                  <div class="video-details">
                    <div class="video-title">{{ result.videoInfo.title }}</div>
                    <div class="video-artist">{{ result.videoInfo.artist || '未知藝術家' }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 搜尋歌曲選項卡 -->
        <div v-if="activeTab === 'search'" class="tab-content">
          <div class="form-group">
            <label>搜尋歌曲</label>
            <div class="search-container">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="輸入歌曲名稱或藝術家"
                class="form-input"
                @keyup.enter="searchSongs"
              />
              <button
                @click="searchSongs"
                :disabled="!searchQuery.trim() || isSearching"
                class="search-button"
              >
                🔍
              </button>
            </div>
          </div>

          <!-- 搜尋結果 -->
          <div v-if="isSearching" class="loading-state">
            <div class="spinner"></div>
            <p>搜尋中...</p>
          </div>

          <div v-else-if="searchResults.length > 0" class="search-results">
            <h4>搜尋結果</h4>
            <div class="song-list">
              <div
                v-for="song in searchResults"
                :key="song.id"
                class="song-item"
                :class="{ selected: selectedSongs.includes(song.id) }"
                @click="toggleSongSelection(song)"
              >
                <div class="song-checkbox">
                  <input
                    type="checkbox"
                    :checked="selectedSongs.includes(song.id)"
                    @change="toggleSongSelection(song)"
                  />
                </div>
                <div class="song-thumbnail">
                  <img
                    v-if="song.thumbnailUrl"
                    :src="song.thumbnailUrl"
                    :alt="song.title"
                    class="thumbnail"
                  />
                  <div v-else class="thumbnail-placeholder">🎵</div>
                </div>
                <div class="song-info">
                  <div class="song-title">{{ song.title }}</div>
                  <div class="song-artist">{{ song.artist || '未知藝術家' }}</div>
                </div>
                <div class="song-duration">
                  {{ formatDuration(song.duration) }}
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button
                @click="addSelectedSongs"
                :disabled="selectedSongs.length === 0 || isSubmitting"
                class="btn-primary"
              >
                <span v-if="isSubmitting" class="loading-spinner"></span>
                {{ isSubmitting ? '添加中...' : `添加 ${selectedSongs.length} 首歌曲` }}
              </button>
            </div>
          </div>

          <div v-else-if="searchQuery && !isSearching" class="empty-state">
            <div class="empty-icon">🔍</div>
            <p>沒有找到相關歌曲</p>
            <p class="empty-hint">試試其他關鍵字或使用 YouTube URL 添加</p>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePlaylistStore } from '@/stores/playlist'
import { api } from '@/services/api'

interface Props {
  playlistId: number
}

interface Emits {
  (e: 'close'): void
  (e: 'added'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const playlistStore = usePlaylistStore()

const activeTab = ref<'youtube' | 'search'>('youtube')
const youtubeUrls = ref('')
const searchQuery = ref('')
const selectedSongs = ref<number[]>([])
const searchResults = ref<any[]>([])
const urlValidationResults = ref<any[]>([])
const isSubmitting = ref(false)
const isSearching = ref(false)
const isValidating = ref(false)
const error = ref('')
const successMessage = ref('')

const validUrls = computed(() => {
  return urlValidationResults.value
    .filter(result => result.isValid)
    .map(result => result.url)
})

const closeModal = () => {
  emit('close')
}

const validateUrls = async () => {
  if (!youtubeUrls.value.trim()) return

  isValidating.value = true
  error.value = ''
  urlValidationResults.value = []

  try {
    const urls = youtubeUrls.value
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0)
      .slice(0, 10) // 限制最多 10 個

    if (urls.length === 0) {
      error.value = '請輸入至少一個 YouTube 網址'
      return
    }

    const results = []
    for (const url of urls) {
      try {
        const response = await api.post('/youtube/validate', { url })
        
        if (response.data.data.isValid) {
          // 嘗試獲取影片資訊
          try {
            const parseResponse = await api.post('/youtube/parse', { url })
            results.push({
              url,
              isValid: true,
              videoInfo: parseResponse.data.data
            })
          } catch (parseError: any) {
            results.push({
              url,
              isValid: true,
              error: parseError.response?.data?.message || '無法獲取影片資訊'
            })
          }
        } else {
          results.push({
            url,
            isValid: false,
            error: '無效的 YouTube 網址'
          })
        }
      } catch (err: any) {
        results.push({
          url,
          isValid: false,
          error: err.response?.data?.message || '驗證失敗'
        })
      }
    }

    urlValidationResults.value = results
  } catch (err: any) {
    error.value = err.response?.data?.message || '驗證失敗'
  } finally {
    isValidating.value = false
  }
}

const addFromYoutube = async () => {
  if (validUrls.value.length === 0) return

  isSubmitting.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const result = await playlistStore.addSongsByYouTubeUrls(props.playlistId, validUrls.value)
    
    successMessage.value = `成功添加 ${result.successful?.length || 0} 首歌曲`
    
    if (result.failed?.length > 0) {
      error.value = `${result.failed.length} 個網址添加失敗`
    }

    // 清空表單
    youtubeUrls.value = ''
    urlValidationResults.value = []
    
    setTimeout(() => {
      emit('added')
    }, 1500)
  } catch (err: any) {
    error.value = err.response?.data?.message || '添加失敗'
  } finally {
    isSubmitting.value = false
  }
}

const searchSongs = async () => {
  if (!searchQuery.value.trim()) return

  isSearching.value = true
  error.value = ''
  searchResults.value = []
  selectedSongs.value = []

  try {
    const result = await playlistStore.searchSongs(searchQuery.value.trim())
    searchResults.value = result.songs || []
  } catch (err: any) {
    error.value = err.response?.data?.message || '搜尋失敗'
  } finally {
    isSearching.value = false
  }
}

const toggleSongSelection = (song: any) => {
  const index = selectedSongs.value.indexOf(song.id)
  if (index > -1) {
    selectedSongs.value.splice(index, 1)
  } else {
    selectedSongs.value.push(song.id)
  }
}

const addSelectedSongs = async () => {
  if (selectedSongs.value.length === 0) return

  isSubmitting.value = true
  error.value = ''
  successMessage.value = ''

  try {
    for (const songId of selectedSongs.value) {
      await playlistStore.addSongToPlaylist(props.playlistId, { songId })
    }
    
    successMessage.value = `成功添加 ${selectedSongs.value.length} 首歌曲`
    
    // 清空選擇
    selectedSongs.value = []
    
    setTimeout(() => {
      emit('added')
    }, 1500)
  } catch (err: any) {
    error.value = err.response?.data?.message || '添加失敗'
  } finally {
    isSubmitting.value = false
  }
}

const formatDuration = (seconds: number) => {
  if (!seconds) return '--:--'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
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