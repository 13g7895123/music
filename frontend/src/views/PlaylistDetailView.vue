<template>
  <div class="playlist-detail-page">
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
    
    <div class="playlist-detail-container">
    <div v-if="playlist" class="playlist-header">
      <div class="playlist-cover-large">
        <img
          v-if="playlist.coverUrl"
          :src="playlist.coverUrl"
          :alt="playlist.name"
          class="cover-image"
        />
        <div v-else class="cover-placeholder-large">
          <i class="music-icon">🎵</i>
        </div>
      </div>
      
      <div class="playlist-info">
        <h1>{{ playlist.name }}</h1>
        <p v-if="playlist.description" class="description">{{ playlist.description }}</p>
        <div class="playlist-meta">
          <span class="song-count">{{ playlist._count.songs }} 首歌曲</span>
          <span class="owner">建立者：{{ playlist.user.nickname }}</span>
          <span class="created-date">建立於：{{ formatDate(playlist.createdAt) }}</span>
        </div>
        
        <div class="playlist-actions">
          <button 
            @click="playAllSongs"
            :disabled="playlist._count.songs === 0"
            class="btn-primary play-all"
          >
            <i class="play-icon">▶️</i>
            播放全部
          </button>
          <button 
            @click="shufflePlay"
            :disabled="playlist._count.songs === 0"
            class="btn-secondary"
          >
            <i class="shuffle-icon">🔀</i>
            隨機播放
          </button>
          <button 
            v-if="isOwner"
            @click="showAddSongModal = true"
            class="btn-secondary"
          >
            <i class="add-icon">+</i>
            添加歌曲
          </button>
        </div>
      </div>
    </div>

    <div class="songs-section">
      <div class="songs-header">
        <h3>歌曲列表</h3>
        <div class="songs-controls">
          <input
            v-model="songSearchQuery"
            type="text"
            placeholder="搜尋歌曲..."
            class="search-input small"
          />
          <select v-model="sortBy" class="sort-select">
            <option value="position">預設順序</option>
            <option value="title">標題</option>
            <option value="artist">藝術家</option>
            <option value="addedAt">添加時間</option>
          </select>
        </div>
      </div>

      <div v-if="filteredSongs.length > 0" class="songs-list">
        <draggable
          v-model="songs"
          :disabled="!isOwner || sortBy !== 'position'"
          @end="onSongReorder"
          item-key="id"
        >
          <template #item="{ element: song, index }">
            <div
              class="song-item"
              :class="{ 
                'playing': currentSong?.id === song.song.id,
                'draggable': isOwner && sortBy === 'position'
              }"
              @dblclick="playSong(song, index)"
            >
              <div class="song-index">
                {{ index + 1 }}
              </div>
              
              <div class="song-thumbnail">
                <img
                  v-if="song.song.thumbnailUrl"
                  :src="song.song.thumbnailUrl"
                  :alt="song.song.title"
                  class="thumbnail"
                />
                <div v-else class="thumbnail-placeholder">🎵</div>
                <div class="song-overlay">
                  <button 
                    @click="playSong(song, index)"
                    class="play-button-small"
                  >
                    {{ currentSong?.id === song.song.id && isPlaying ? '⏸️' : '▶️' }}
                  </button>
                </div>
              </div>

              <div class="song-info">
                <h4 class="song-title">{{ song.song.title }}</h4>
                <p class="song-artist">{{ song.song.artist || '未知藝術家' }}</p>
              </div>

              <div class="song-duration">
                {{ formatDuration(song.song.duration) }}
              </div>

              <div class="song-actions">
                <button 
                  @click="addToQueue(song.song)"
                  class="action-button"
                  title="加入播放佇列"
                >
                  📋
                </button>
                <button 
                  v-if="isOwner"
                  @click="removeSong(song)"
                  class="action-button delete"
                  title="從播放清單移除"
                >
                  ❌
                </button>
              </div>
            </div>
          </template>
        </draggable>
      </div>

      <div v-else-if="playlist && playlist._count.songs === 0" class="empty-songs">
        <div class="empty-icon">🎵</div>
        <h3>播放清單是空的</h3>
        <p>添加一些歌曲來開始享受音樂</p>
        <button 
          v-if="isOwner"
          @click="showAddSongModal = true"
          class="btn-primary"
        >
          添加歌曲
        </button>
      </div>
    </div>

    <!-- 添加歌曲 Modal -->
    <AddSongModal
      v-if="showAddSongModal"
      :playlist-id="playlistId"
      @close="showAddSongModal = false"
      @added="onSongAdded"
    />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlaylistStore } from '@/stores/playlist'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore } from '@/stores/auth'
import draggable from 'vuedraggable'
import AddSongModal from '@/components/playlist/AddSongModal.vue'

const route = useRoute()
const playlistStore = usePlaylistStore()
const playerStore = usePlayerStore()
const authStore = useAuthStore()
const playlistId = computed(() => parseInt(route.params.id as string))
const playlist = computed(() => playlistStore.currentPlaylist)
const songs = computed({
  get: () => playlist.value?.songs || [],
  set: (value) => {
    if (playlist.value) {
      playlist.value.songs = value
    }
  }
})

const user = computed(() => authStore.user)
const currentSong = computed(() => playerStore.currentSong)
const isPlaying = computed(() => playerStore.isPlaying)
const isOwner = computed(() => 
  authStore.user?.id === playlist.value?.userId
)

const songSearchQuery = ref('')
const sortBy = ref('position')
const showAddSongModal = ref(false)

const filteredSongs = computed(() => {
  let filtered = songs.value

  // 搜尋過濾
  if (songSearchQuery.value) {
    const query = songSearchQuery.value.toLowerCase()
    filtered = filtered.filter(song =>
      song.song.title.toLowerCase().includes(query) ||
      (song.song.artist && song.song.artist.toLowerCase().includes(query))
    )
  }

  // 排序
  switch (sortBy.value) {
    case 'title':
      filtered = [...filtered].sort((a, b) => 
        a.song.title.localeCompare(b.song.title)
      )
      break
    case 'artist':
      filtered = [...filtered].sort((a, b) => 
        (a.song.artist || '').localeCompare(b.song.artist || '')
      )
      break
    case 'addedAt':
      filtered = [...filtered].sort((a, b) => 
        new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      )
      break
    default: // position
      filtered = [...filtered].sort((a, b) => a.position - b.position)
  }

  return filtered
})

const loadPlaylist = async () => {
  try {
    await playlistStore.fetchPlaylistDetail(playlistId.value)
  } catch (error) {
    console.error('Failed to load playlist:', error)
  }
}

const playAllSongs = async () => {
  if (!playlist.value || playlist.value._count.songs === 0) return
  
  try {
    await playerStore.loadPlaylist(playlist.value.id)
    await playerStore.play()
  } catch (error) {
    console.error('Failed to play playlist:', error)
  }
}

const shufflePlay = async () => {
  if (!playlist.value || playlist.value._count.songs === 0) return
  
  try {
    await playerStore.loadPlaylist(playlist.value.id, true) // shuffle = true
    await playerStore.play()
  } catch (error) {
    console.error('Failed to shuffle play:', error)
  }
}

const playSong = async (playlistSong: any, index: number) => {
  try {
    await playerStore.loadPlaylist(playlist.value.id)
    await playerStore.playAt(index)
  } catch (error) {
    console.error('Failed to play song:', error)
  }
}

const addToQueue = (song: any) => {
  playerStore.addToQueue(song)
}

const removeSong = async (playlistSong: any) => {
  try {
    await playlistStore.removeSongFromPlaylist(
      playlist.value.id, 
      playlistSong.song.id
    )
    await loadPlaylist()
  } catch (error) {
    console.error('Failed to remove song:', error)
  }
}

const onSongReorder = async () => {
  if (!isOwner.value || sortBy.value !== 'position') return
  
  try {
    const songOrders = songs.value.map((song, index) => ({
      songId: song.song.id,
      position: index + 1
    }))
    
    await playlistStore.reorderPlaylistSongs(playlist.value.id, songOrders)
  } catch (error) {
    console.error('Failed to reorder songs:', error)
  }
}

const onSongAdded = () => {
  showAddSongModal.value = false
  loadPlaylist()
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-TW')
}

const formatDuration = (seconds: number) => {
  if (!seconds) return '--:--'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
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
  loadPlaylist()
})

watch(() => route.params.id, () => {
  if (route.params.id) {
    loadPlaylist()
  }
})
</script>

<style scoped>
.playlist-detail-page {
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

.playlist-detail-container {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.playlist-header {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 1rem;
  color: white;
}

.playlist-cover-large {
  flex-shrink: 0;
  width: 200px;
  height: 200px;
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder-large {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
}

.playlist-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.playlist-info h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
}

.description {
  font-size: 1.125rem;
  opacity: 0.9;
  margin: 0 0 1rem 0;
}

.playlist-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  opacity: 0.8;
  margin-bottom: 1.5rem;
}

.playlist-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-primary, .btn-secondary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 2rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: white;
  color: #1f2937;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}

.btn-primary:disabled, .btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.songs-section {
  background: white;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.songs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.songs-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.songs-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-input.small {
  padding: 0.375rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  width: 200px;
}

.sort-select {
  padding: 0.375rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
}

.songs-list {
  max-height: 600px;
  overflow-y: auto;
}

.song-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.2s;
  cursor: pointer;
}

.song-item:hover {
  background: #f9fafb;
}

.song-item.playing {
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
}

.song-item.draggable {
  cursor: grab;
}

.song-item.draggable:active {
  cursor: grabbing;
}

.song-index {
  width: 24px;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
}

.song-thumbnail {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 0.375rem;
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

.song-overlay {
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

.song-item:hover .song-overlay {
  opacity: 1;
}

.play-button-small {
  background: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  font-size: 0.75rem;
  cursor: pointer;
}

.song-info {
  flex: 1;
  min-width: 0;
}

.song-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1f2937;
  margin: 0 0 0.25rem 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-artist {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-duration {
  color: #6b7280;
  font-size: 0.875rem;
  min-width: 40px;
}

.song-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.song-item:hover .song-actions {
  opacity: 1;
}

.action-button {
  background: none;
  border: none;
  padding: 0.25rem;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background 0.2s;
}

.action-button:hover {
  background: #f3f4f6;
}

.action-button.delete:hover {
  background: #fef2f2;
  color: #dc2626;
}

.empty-songs {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-songs h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.empty-songs p {
  margin: 0 0 1.5rem 0;
}

@media (max-width: 768px) {
  .playlist-header {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }

  .playlist-cover-large {
    width: 150px;
    height: 150px;
    align-self: center;
  }

  .playlist-info h1 {
    font-size: 2rem;
  }

  .playlist-actions {
    flex-wrap: wrap;
    justify-content: center;
  }

  .songs-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .songs-controls {
    flex-direction: column;
    gap: 0.75rem;
  }

  .search-input.small {
    width: 100%;
  }

  .song-item {
    padding: 0.75rem;
    gap: 0.75rem;
  }

  .song-info {
    min-width: 120px;
  }
}
</style>