# Story 11: 播放清單前端管理介面

## 📋 基本資訊
- **Story ID**: YMP-011
- **Epic**: 播放清單管理
- **優先級**: Must Have (P0)
- **預估點數**: 10 points
- **預估時間**: 2-3 天
- **依賴關係**: Story 7, Story 8, Story 9
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 已登入用戶  
**我希望** 有美觀易用的播放清單管理介面  
**以便** 方便地建立、編輯和管理我的音樂播放清單

## 📝 詳細需求

### 核心功能需求
1. **播放清單列表**: 顯示用戶所有播放清單
2. **播放清單詳情**: 顯示播放清單中的所有歌曲
3. **CRUD操作**: 建立、編輯、刪除播放清單
4. **歌曲管理**: 添加、移除、重新排序歌曲
5. **搜尋過濾**: 搜尋播放清單和歌曲

### 技術規格

**播放清單列表組件**:
```vue
<!-- frontend/src/views/PlaylistsView.vue -->
<template>
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
      :title="`刪除播放清單 "${deletingPlaylist.name}"`"
      message="此操作無法復原，確定要刪除嗎？"
      @confirm="confirmDelete"
      @cancel="deletingPlaylist = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlaylistStore } from '@/stores/playlist'
import { usePlayerStore } from '@/stores/player'
import PlaylistModal from '@/components/playlist/PlaylistModal.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const router = useRouter()
const playlistStore = usePlaylistStore()
const playerStore = usePlayerStore()

const searchQuery = ref('')
const showCreateModal = ref(false)
const editingPlaylist = ref(null)
const deletingPlaylist = ref(null)
const isLoading = ref(false)

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

onMounted(() => {
  loadPlaylists()
})
</script>
```

**播放清單詳情組件**:
```vue
<!-- frontend/src/views/PlaylistDetailView.vue -->
<template>
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
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

onMounted(() => {
  loadPlaylist()
})

watch(() => route.params.id, () => {
  if (route.params.id) {
    loadPlaylist()
  }
})
</script>
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `frontend/src/views/PlaylistsView.vue` - 播放清單列表頁面
- `frontend/src/views/PlaylistDetailView.vue` - 播放清單詳情頁面
- `frontend/src/components/playlist/PlaylistModal.vue` - 播放清單建立/編輯Modal
- `frontend/src/components/playlist/AddSongModal.vue` - 添加歌曲Modal
- `frontend/src/stores/playlist.ts` - 播放清單狀態管理
- `frontend/src/components/common/ConfirmModal.vue` - 確認對話框

**更新檔案**:
- `frontend/src/router/index.ts` - 添加播放清單相關路由
- `frontend/src/components/layout/Sidebar.vue` - 添加播放清單導航

## ✅ 驗收條件

### 功能驗收
- [ ] 播放清單列表正常顯示和分頁
- [ ] 可以建立、編輯、刪除播放清單
- [ ] 播放清單詳情頁面功能完整
- [ ] 歌曲拖拽重新排序功能正常
- [ ] 搜尋和過濾功能正常運作

### UI/UX驗收
- [ ] 響應式設計在各種螢幕尺寸正常
- [ ] 載入狀態有適當的視覺回饋
- [ ] 空狀態有友好的提示
- [ ] 操作有清楚的視覺回饋

### 整合驗收
- [ ] 與後端API正常整合
- [ ] 與播放器狀態正常同步
- [ ] 路由導航正常運作

## 🚀 實作指引

### Step 1: 安裝依賴
```bash
cd frontend
npm install vuedraggable
npm install -D @types/sortablejs
```

### Step 2: 建立狀態管理
實作playlist.ts store

### Step 3: 建立組件
按照技術規格建立所有Vue組件

### Step 4: 配置路由
更新router配置

## 📊 預期成果
- ✅ 完整的播放清單管理介面
- ✅ 直觀的拖拽操作體驗
- ✅ 強大的搜尋過濾功能
- ✅ 優秀的響應式設計
- ✅ 流暢的用戶操作體驗