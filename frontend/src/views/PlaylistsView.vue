<template>
  <div class="playlists-page">
    <header class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1>MyTune</h1>
          <nav class="header-nav">
            <router-link to="/dashboard" class="nav-link">儀表板</router-link>
            <router-link to="/playlists" class="nav-link">播放清單</router-link>
          </nav>
        </div>
        <div class="user-info">
          <span>{{ user?.nickname }}</span>
          <button @click="handleLogout" class="logout-btn">登出</button>
        </div>
      </div>
    </header>
    
    <div class="playlists-container">
    <div class="playlists-header">
      <h1>我的播放清單</h1>
      <div class="header-actions">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜尋播放清單..."
            class="search-input"
          />
          <i class="search-icon">🔍</i>
        </div>
        <button 
          @click="showCreateModal = true"
          class="btn-primary"
        >
          <i class="plus-icon">+</i>
          建立播放清單
        </button>
      </div>
    </div>

    <div class="playlists-grid" v-if="!isLoading && playlists.length > 0">
      <div
        v-for="playlist in filteredPlaylists"
        :key="playlist.id"
        class="playlist-card"
        @click="goToPlaylist(playlist.id)"
      >
        <div class="playlist-cover">
          <img
            v-if="playlist.coverUrl"
            :src="playlist.coverUrl"
            :alt="playlist.name"
            class="cover-image"
          />
          <div v-else class="cover-placeholder">
            <i class="music-icon">🎵</i>
          </div>
          <div class="playlist-overlay">
            <button 
              @click.stop="playPlaylist(playlist)"
              class="play-button"
            >
              ▶️
            </button>
          </div>
        </div>
        
        <div class="playlist-info">
          <h3 class="playlist-name">{{ playlist.name }}</h3>
          <p class="playlist-description">{{ playlist.description || '無描述' }}</p>
          <p class="playlist-stats">{{ playlist._count.songs }} 首歌曲</p>
        </div>

        <div class="playlist-actions">
          <button 
            @click.stop="editPlaylist(playlist)"
            class="action-button"
            title="編輯"
          >
            ✏️
          </button>
          <button 
            @click.stop="deletePlaylist(playlist)"
            class="action-button delete"
            title="刪除"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="!isLoading && playlists.length === 0" class="empty-state">
      <div class="empty-icon">🎵</div>
      <h3>還沒有播放清單</h3>
      <p>建立您的第一個播放清單來開始收藏音樂</p>
      <button 
        @click="showCreateModal = true"
        class="btn-primary"
      >
        建立播放清單
      </button>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>載入播放清單中...</p>
    </div>

    <!-- 分頁控制 -->
    <div v-if="pagination.totalPages > 1" class="pagination">
      <button 
        @click="changePage(pagination.page - 1)"
        :disabled="!pagination.hasPrev"
        class="page-button"
      >
        上一頁
      </button>
      <span class="page-info">
        第 {{ pagination.page }} 頁，共 {{ pagination.totalPages }} 頁
      </span>
      <button 
        @click="changePage(pagination.page + 1)"
        :disabled="!pagination.hasNext"
        class="page-button"
      >
        下一頁
      </button>
    </div>

    <!-- 建立/編輯播放清單 Modal -->
    <PlaylistModal
      v-if="showCreateModal || editingPlaylist"
      :playlist="editingPlaylist"
      @close="closeModal"
      @saved="onPlaylistSaved"
    />

    <!-- 刪除確認 Modal -->
    <ConfirmModal
      v-if="deletingPlaylist"
      :title="`刪除播放清單 \"${deletingPlaylist.name}\"`"
      message="此操作無法復原，確定要刪除嗎？"
      @confirm="confirmDelete"
      @cancel="deletingPlaylist = null"
    />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlaylistStore } from '@/stores/playlist'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore } from '@/stores/auth'
import PlaylistModal from '@/components/playlist/PlaylistModal.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const router = useRouter()
const playlistStore = usePlaylistStore()
const playerStore = usePlayerStore()
const authStore = useAuthStore()

const searchQuery = ref('')
const showCreateModal = ref(false)
const editingPlaylist = ref(null)
const deletingPlaylist = ref(null)
const isLoading = ref(false)

const user = computed(() => authStore.user)
const playlists = computed(() => playlistStore.playlists)
const pagination = computed(() => playlistStore.pagination)

const filteredPlaylists = computed(() => {
  if (!searchQuery.value) return playlists.value
  
  return playlists.value.filter(playlist =>
    playlist.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    (playlist.description && playlist.description.toLowerCase().includes(searchQuery.value.toLowerCase()))
  )
})

const loadPlaylists = async (page = 1) => {
  isLoading.value = true
  try {
    await playlistStore.fetchPlaylists({
      page,
      search: searchQuery.value
    })
  } catch (error) {
    console.error('Failed to load playlists:', error)
  } finally {
    isLoading.value = false
  }
}

const goToPlaylist = (playlistId: number) => {
  router.push(`/playlists/${playlistId}`)
}

const playPlaylist = async (playlist: any) => {
  try {
    await playerStore.loadPlaylist(playlist.id)
    await playerStore.play()
  } catch (error) {
    console.error('Failed to play playlist:', error)
  }
}

const editPlaylist = (playlist: any) => {
  editingPlaylist.value = playlist
}

const deletePlaylist = (playlist: any) => {
  deletingPlaylist.value = playlist
}

const confirmDelete = async () => {
  if (!deletingPlaylist.value) return
  
  try {
    await playlistStore.deletePlaylist(deletingPlaylist.value.id)
    deletingPlaylist.value = null
    await loadPlaylists()
  } catch (error) {
    console.error('Failed to delete playlist:', error)
  }
}

const closeModal = () => {
  showCreateModal.value = false
  editingPlaylist.value = null
}

const onPlaylistSaved = async () => {
  closeModal()
  await loadPlaylists()
}

const changePage = (page: number) => {
  loadPlaylists(page)
}

const handleLogout = async () => {
  try {
    await authStore.logout()
    router.push('/auth/login')
  } catch (error) {
    console.error('Logout failed:', error)
    router.push('/auth/login')
  }
}

onMounted(() => {
  loadPlaylists()
})
</script>

<style scoped>
.playlists-page {
  min-height: 100vh;
  background: #f9fafb;
}

.page-header {
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid #e5e7eb;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.header-nav {
  display: flex;
  gap: 1rem;
}

.nav-link {
  color: #6b7280;
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: color 0.2s;
  border-bottom: 2px solid transparent;
}

.nav-link:hover {
  color: #1f2937;
}

.nav-link.router-link-active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info span {
  color: #374151;
  font-size: 0.875rem;
}

.logout-btn {
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.2s;
}

.logout-btn:hover {
  background: #b91c1c;
}

.playlists-container {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.playlists-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.playlists-header h1 {
  font-size: 2rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-box {
  position: relative;
}

.search-input {
  padding: 0.5rem 1rem 0.5rem 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  width: 250px;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #2563eb;
}

.playlists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.playlist-card {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.playlist-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.playlist-cover {
  position: relative;
  width: 100%;
  height: 180px;
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
}

.playlist-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.playlist-card:hover .playlist-overlay {
  opacity: 1;
}

.play-button {
  background: white;
  border: none;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  font-size: 1.5rem;
  cursor: pointer;
  transition: transform 0.2s;
}

.play-button:hover {
  transform: scale(1.1);
}

.playlist-info {
  padding: 1rem;
}

.playlist-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlist-description {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0 0 0.5rem 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.playlist-stats {
  color: #9ca3af;
  font-size: 0.75rem;
  margin: 0;
}

.playlist-actions {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.playlist-card:hover .playlist-actions {
  opacity: 1;
}

.action-button {
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 0.25rem;
  width: 32px;
  height: 32px;
  cursor: pointer;
  transition: background 0.2s;
}

.action-button:hover {
  background: white;
}

.action-button.delete:hover {
  background: #fef2f2;
  color: #dc2626;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  margin: 0 0 1.5rem 0;
}

.loading-state {
  text-align: center;
  padding: 3rem;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}

.page-button {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.2s;
}

.page-button:hover:not(:disabled) {
  background: #f9fafb;
}

.page-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #6b7280;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .playlists-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .header-actions {
    flex-direction: column;
    gap: 0.75rem;
  }

  .search-input {
    width: 100%;
  }

  .playlists-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
  }

  .pagination {
    flex-direction: column;
    gap: 0.75rem;
  }
}
</style>