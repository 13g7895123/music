import { PrismaClient, PlaylistSong, Song } from '@prisma/client'
import { AppError } from '../middleware/error.middleware'
import { logger } from '../utils/logger'

export interface AddSongData {
  songId: number
  position?: number
}

export interface ReorderSongData {
  songId: number
  position: number
}

export interface PlaylistSongResponse extends PlaylistSong {
  song: Song
}

export class PlaylistSongService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async checkPlaylistOwnership(playlistId: number, userId: number): Promise<boolean> {
    try {
      const playlist = await this.prisma.playlist.findFirst({
        where: { 
          id: playlistId, 
          userId 
        }
      })

      return !!playlist
    } catch (error) {
      logger.error('Failed to check playlist ownership', { 
        playlistId,
        userId,
        error: (error as Error).message 
      })
      return false
    }
  }

  async addSongToPlaylist(playlistId: number, userId: number, data: AddSongData): Promise<PlaylistSongResponse> {
    try {
      // 檢查播放清單權限
      const hasOwnership = await this.checkPlaylistOwnership(playlistId, userId)
      if (!hasOwnership) {
        throw new AppError('Playlist not found or access denied', 404, 'PLAYLIST_NOT_FOUND')
      }

      // 檢查歌曲是否已存在
      const existingSong = await this.prisma.playlistSong.findUnique({
        where: {
          playlistId_songId: {
            playlistId,
            songId: data.songId
          }
        }
      })

      if (existingSong) {
        throw new AppError('Song already exists in playlist', 409, 'SONG_ALREADY_EXISTS')
      }

      // 確定插入位置
      let insertPosition = data.position
      if (!insertPosition) {
        const lastSong = await this.prisma.playlistSong.findFirst({
          where: { playlistId },
          orderBy: { position: 'desc' }
        })
        insertPosition = (lastSong?.position || 0) + 1
      }

      // 使用事務處理位置調整和插入
      const playlistSong = await this.prisma.$transaction(async (tx) => {
        // 如果指定位置，需要調整其他歌曲位置
        if (data.position) {
          await tx.playlistSong.updateMany({
            where: {
              playlistId,
              position: { gte: data.position }
            },
            data: {
              position: { increment: 1 }
            }
          })
        }

        // 插入新歌曲
        return await tx.playlistSong.create({
          data: {
            playlistId,
            songId: data.songId,
            position: insertPosition!,
            addedBy: userId
          },
          include: {
            song: true
          }
        })
      })

      logger.info(`Song added to playlist`, { 
        playlistId,
        songId: data.songId,
        userId 
      })

      return playlistSong
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      
      logger.error('Failed to add song to playlist', { 
        playlistId,
        userId,
        data,
        error: (error as Error).message 
      })
      
      throw new AppError('Failed to add song to playlist', 500, 'SONG_ADD_FAILED')
    }
  }

  async removeSongFromPlaylist(playlistId: number, songId: number, userId: number): Promise<void> {
    try {
      // 檢查播放清單權限
      const hasOwnership = await this.checkPlaylistOwnership(playlistId, userId)
      if (!hasOwnership) {
        throw new AppError('Playlist not found or access denied', 404, 'PLAYLIST_NOT_FOUND')
      }

      // 檢查歌曲是否存在於播放清單
      const playlistSong = await this.prisma.playlistSong.findUnique({
        where: {
          playlistId_songId: {
            playlistId,
            songId
          }
        }
      })

      if (!playlistSong) {
        throw new AppError('Song not found in playlist', 404, 'SONG_NOT_FOUND')
      }

      // 使用事務處理刪除和位置調整
      await this.prisma.$transaction(async (tx) => {
        // 刪除歌曲
        await tx.playlistSong.delete({
          where: {
            playlistId_songId: {
              playlistId,
              songId
            }
          }
        })

        // 調整後續歌曲位置
        await tx.playlistSong.updateMany({
          where: {
            playlistId,
            position: { gt: playlistSong.position }
          },
          data: {
            position: { decrement: 1 }
          }
        })
      })

      logger.info(`Song removed from playlist`, { 
        playlistId,
        songId,
        userId 
      })
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      
      logger.error('Failed to remove song from playlist', { 
        playlistId,
        songId,
        userId,
        error: (error as Error).message 
      })
      
      throw new AppError('Failed to remove song from playlist', 500, 'SONG_REMOVE_FAILED')
    }
  }

  async reorderPlaylistSongs(playlistId: number, userId: number, songOrders: ReorderSongData[]): Promise<PlaylistSongResponse[]> {
    try {
      // 檢查播放清單權限
      const hasOwnership = await this.checkPlaylistOwnership(playlistId, userId)
      if (!hasOwnership) {
        throw new AppError('Playlist not found or access denied', 404, 'PLAYLIST_NOT_FOUND')
      }

      // 驗證輸入
      if (!Array.isArray(songOrders) || songOrders.length === 0) {
        throw new AppError('songOrders must be a non-empty array', 400, 'INVALID_INPUT')
      }

      // 驗證所有歌曲都屬於該播放清單
      const songIds = songOrders.map(order => order.songId)
      const existingSongs = await this.prisma.playlistSong.findMany({
        where: {
          playlistId,
          songId: { in: songIds }
        }
      })

      if (existingSongs.length !== songIds.length) {
        throw new AppError('Some songs do not exist in the playlist', 400, 'SONGS_NOT_FOUND')
      }

      // 使用事務更新所有位置
      await this.prisma.$transaction(
        songOrders.map(({ songId, position }) =>
          this.prisma.playlistSong.update({
            where: {
              playlistId_songId: {
                playlistId,
                songId
              }
            },
            data: { position }
          })
        )
      )

      const updatedSongs = await this.prisma.playlistSong.findMany({
        where: { playlistId },
        include: { song: true },
        orderBy: { position: 'asc' }
      })

      logger.info(`Playlist songs reordered`, { 
        playlistId,
        userId,
        songCount: songOrders.length 
      })

      return updatedSongs
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      
      logger.error('Failed to reorder playlist songs', { 
        playlistId,
        userId,
        songOrders,
        error: (error as Error).message 
      })
      
      throw new AppError('Failed to reorder playlist songs', 500, 'REORDER_FAILED')
    }
  }

  async batchAddSongs(playlistId: number, userId: number, songIds: number[]): Promise<{
    addedSongs: PlaylistSongResponse[]
    skippedCount: number
  }> {
    try {
      // 檢查播放清單權限
      const hasOwnership = await this.checkPlaylistOwnership(playlistId, userId)
      if (!hasOwnership) {
        throw new AppError('Playlist not found or access denied', 404, 'PLAYLIST_NOT_FOUND')
      }

      // 驗證輸入
      if (!Array.isArray(songIds) || songIds.length === 0) {
        throw new AppError('songIds must be a non-empty array', 400, 'INVALID_INPUT')
      }

      // 檢查哪些歌曲已經存在
      const existingSongs = await this.prisma.playlistSong.findMany({
        where: {
          playlistId,
          songId: { in: songIds }
        },
        select: { songId: true }
      })

      const existingSongIds = existingSongs.map(s => s.songId)
      const newSongIds = songIds.filter(id => !existingSongIds.includes(id))

      if (newSongIds.length === 0) {
        throw new AppError('All songs already exist in playlist', 409, 'ALL_SONGS_EXIST')
      }

      // 獲取當前最大位置
      const lastSong = await this.prisma.playlistSong.findFirst({
        where: { playlistId },
        orderBy: { position: 'desc' }
      })

      let currentPosition = (lastSong?.position || 0) + 1

      // 批量插入新歌曲
      const playlistSongs = newSongIds.map(songId => ({
        playlistId,
        songId,
        position: currentPosition++,
        addedBy: userId
      }))

      await this.prisma.playlistSong.createMany({
        data: playlistSongs
      })

      const addedSongs = await this.prisma.playlistSong.findMany({
        where: {
          playlistId,
          songId: { in: newSongIds }
        },
        include: { song: true },
        orderBy: { position: 'asc' }
      })

      logger.info(`Batch added songs to playlist`, { 
        playlistId,
        userId,
        addedCount: newSongIds.length,
        skippedCount: existingSongIds.length
      })

      return {
        addedSongs,
        skippedCount: existingSongIds.length
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      
      logger.error('Failed to batch add songs', { 
        playlistId,
        userId,
        songIds,
        error: (error as Error).message 
      })
      
      throw new AppError('Failed to batch add songs', 500, 'BATCH_ADD_FAILED')
    }
  }

  async getPlaylistSongs(playlistId: number, userId?: number): Promise<PlaylistSongResponse[]> {
    try {
      // 如果提供了userId，檢查是否有權限查看
      if (userId) {
        const playlist = await this.prisma.playlist.findFirst({
          where: {
            id: playlistId,
            OR: [
              { userId },
              { isPublic: true }
            ]
          }
        })

        if (!playlist) {
          throw new AppError('Playlist not found', 404, 'PLAYLIST_NOT_FOUND')
        }
      } else {
        // 如果沒有提供userId，只能查看公開播放清單
        const playlist = await this.prisma.playlist.findFirst({
          where: {
            id: playlistId,
            isPublic: true
          }
        })

        if (!playlist) {
          throw new AppError('Playlist not found', 404, 'PLAYLIST_NOT_FOUND')
        }
      }

      const songs = await this.prisma.playlistSong.findMany({
        where: { playlistId },
        include: { song: true },
        orderBy: { position: 'asc' }
      })

      return songs
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      
      logger.error('Failed to get playlist songs', { 
        playlistId,
        userId,
        error: (error as Error).message 
      })
      
      throw new AppError('Failed to get playlist songs', 500, 'SONGS_FETCH_FAILED')
    }
  }
}