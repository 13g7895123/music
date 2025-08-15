import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/services/api'

interface Song {
  id: number
  youtubeId: string
  title: string
  artist?: string
  duration?: number
  thumbnailUrl?: string
  viewCount?: number
  createdAt: string
}

interface PlaylistSong {
  id: number
  playlistId: number
  songId: number
  position: number
  addedAt: string
  song: Song
}

interface Playlist {
  id: number
  name: string
  description?: string
  coverUrl?: string
  isPublic: boolean
  userId: number
  createdAt: string
  updatedAt: string
  user: {
    id: number
    nickname: string
  }
  songs: PlaylistSong[]
  _count: {
    songs: number
  }
}

interface PlaylistCreateData {
  name: string
  description?: string
  isPublic?: boolean
}

interface PlaylistUpdateData {
  name?: string
  description?: string
  isPublic?: boolean
}

interface PaginationData {
  page: number
  totalPages: number
  totalCount: number
  hasNext: boolean
  hasPrev: boolean
}

export const usePlaylistStore = defineStore('playlist', () => {
  const playlists = ref<Playlist[]>([])
  const currentPlaylist = ref<Playlist | null>(null)
  const pagination = ref<PaginationData>({
    page: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false
  })
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const playlistCount = computed(() => playlists.value.length)
  const currentPlaylistSongs = computed(() => currentPlaylist.value?.songs || [])

  // Actions
  const fetchPlaylists = async (params: {
    page?: number
    limit?: number
    search?: string
    userId?: number
  } = {}) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.get('/playlists', { params })
      playlists.value = response.data.playlists
      pagination.value = response.data.pagination
    } catch (err: any) {
      error.value = err.response?.data?.message || '獲取播放清單失敗'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const fetchPlaylistDetail = async (id: number) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.get(`/playlists/${id}`)
      currentPlaylist.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || '獲取播放清單詳情失敗'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const createPlaylist = async (data: PlaylistCreateData) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.post('/playlists', data)
      const newPlaylist = response.data
      playlists.value.unshift(newPlaylist)
      return newPlaylist
    } catch (err: any) {
      error.value = err.response?.data?.message || '建立播放清單失敗'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const updatePlaylist = async (id: number, data: PlaylistUpdateData) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.put(`/playlists/${id}`, data)
      const updatedPlaylist = response.data
      
      // Update in playlists array
      const index = playlists.value.findIndex(p => p.id === id)
      if (index !== -1) {
        playlists.value[index] = updatedPlaylist
      }
      
      // Update current playlist if it's the same
      if (currentPlaylist.value?.id === id) {
        currentPlaylist.value = updatedPlaylist
      }
      
      return updatedPlaylist
    } catch (err: any) {
      error.value = err.response?.data?.message || '更新播放清單失敗'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const deletePlaylist = async (id: number) => {
    isLoading.value = true
    error.value = null
    
    try {
      await api.delete(`/playlists/${id}`)
      
      // Remove from playlists array
      playlists.value = playlists.value.filter(p => p.id !== id)
      
      // Clear current playlist if it's the same
      if (currentPlaylist.value?.id === id) {
        currentPlaylist.value = null
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || '刪除播放清單失敗'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const addSongToPlaylist = async (playlistId: number, songData: any) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.post(`/playlists/${playlistId}/songs`, songData)
      
      // Update current playlist if it's the same
      if (currentPlaylist.value?.id === playlistId) {
        await fetchPlaylistDetail(playlistId)
      }
      
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || '添加歌曲失敗'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const removeSongFromPlaylist = async (playlistId: number, songId: number) => {
    isLoading.value = true
    error.value = null
    
    try {
      await api.delete(`/playlists/${playlistId}/songs/${songId}`)
      
      // Update current playlist if it's the same
      if (currentPlaylist.value?.id === playlistId) {
        currentPlaylist.value.songs = currentPlaylist.value.songs.filter(
          ps => ps.song.id !== songId
        )
        currentPlaylist.value._count.songs -= 1
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || '移除歌曲失敗'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const reorderPlaylistSongs = async (playlistId: number, songOrders: Array<{ songId: number; position: number }>) => {
    isLoading.value = true
    error.value = null
    
    try {
      await api.put(`/playlists/${playlistId}/songs/reorder`, { songOrders })
      
      // Update current playlist if it's the same
      if (currentPlaylist.value?.id === playlistId) {
        await fetchPlaylistDetail(playlistId)
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || '重新排序失敗'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const addSongsByYouTubeUrls = async (playlistId: number, urls: string[]) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.post(`/playlists/${playlistId}/songs/youtube`, { urls })
      
      // Update current playlist if it's the same
      if (currentPlaylist.value?.id === playlistId) {
        await fetchPlaylistDetail(playlistId)
      }
      
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || '添加YouTube歌曲失敗'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const searchSongs = async (query: string, params: any = {}) => {
    try {
      const response = await api.get('/songs/search', {
        params: { q: query, ...params }
      })
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || '搜尋歌曲失敗'
      throw err
    }
  }

  const addMultipleSongsToPlaylist = async (playlistId: number, songIds: number[]) => {
    isLoading.value = true
    error.value = null
    
    try {
      await api.post(`/playlists/${playlistId}/songs/multiple`, { songIds })
      
      // Update current playlist if it's the same
      if (currentPlaylist.value?.id === playlistId) {
        await fetchPlaylistDetail(playlistId)
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || '批量添加歌曲失敗'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const duplicatePlaylist = async (sourcePlaylistId: number, newName?: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await api.post(`/playlists/${sourcePlaylistId}/duplicate`, {
        name: newName
      })
      const newPlaylist = response.data
      playlists.value.unshift(newPlaylist)
      return newPlaylist
    } catch (err: any) {
      error.value = err.response?.data?.message || '複製播放清單失敗'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const getPlaylistSummary = async (playlistId: number) => {
    try {
      const response = await api.get(`/playlists/${playlistId}/summary`)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || '獲取播放清單摘要失敗'
      throw err
    }
  }

  const exportPlaylist = async (playlistId: number, format: 'json' | 'csv' | 'm3u') => {
    try {
      const response = await api.get(`/playlists/${playlistId}/export`, {
        params: { format },
        responseType: 'blob'
      })
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || '導出播放清單失敗'
      throw err
    }
  }

  const importPlaylist = async (file: File, format: 'json' | 'csv' | 'm3u') => {
    isLoading.value = true
    error.value = null
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('format', format)
      
      const response = await api.post('/playlists/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      const newPlaylist = response.data
      playlists.value.unshift(newPlaylist)
      return newPlaylist
    } catch (err: any) {
      error.value = err.response?.data?.message || '導入播放清單失敗'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const getRecommendedSongs = async (playlistId: number, limit = 10) => {
    try {
      const response = await api.get(`/playlists/${playlistId}/recommendations`, {
        params: { limit }
      })
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || '獲取推薦歌曲失敗'
      throw err
    }
  }

  const clearError = () => {
    error.value = null
  }

  const clearCurrentPlaylist = () => {
    currentPlaylist.value = null
  }

  return {
    // State
    playlists,
    currentPlaylist,
    pagination,
    isLoading,
    error,
    
    // Getters
    playlistCount,
    currentPlaylistSongs,
    
    // Actions
    fetchPlaylists,
    fetchPlaylistDetail,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    reorderPlaylistSongs,
    addSongsByYouTubeUrls,
    addMultipleSongsToPlaylist,
    duplicatePlaylist,
    getPlaylistSummary,
    exportPlaylist,
    importPlaylist,
    getRecommendedSongs,
    searchSongs,
    clearError,
    clearCurrentPlaylist
  }
})