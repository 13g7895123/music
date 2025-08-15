import { PrismaClient, Playlist } from '@prisma/client'
import { AppError } from '../middleware/error.middleware'
import { logger } from '../utils/logger'

export interface CreatePlaylistData {
  name: string
  description?: string
  isPublic?: boolean
}

export interface UpdatePlaylistData {
  name?: string
  description?: string | null
  isPublic?: boolean
}

export interface PlaylistQuery {
  page?: number
  limit?: number
  search?: string
}

export interface PlaylistResponse extends Playlist {
  _count: {
    songs: number
  }
}

export interface PlaylistListResponse {
  playlists: PlaylistResponse[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export class PlaylistService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async getUserPlaylists(userId: number, query: PlaylistQuery): Promise<PlaylistListResponse> {
    try {
      const page = query.page || 1
      const limit = Math.min(query.limit || 20, 100) // Max 100 items per page
      const search = query.search
      const skip = (page - 1) * limit

      const where: any = { userId }
      if (search) {
        where.name = {
          contains: search,
          mode: 'insensitive'
        }
      }

      const [playlists, total] = await Promise.all([
        this.prisma.playlist.findMany({
          where,
          skip,
          take: limit,
          orderBy: { updatedAt: 'desc' },
          include: {
            _count: {
              select: { songs: true }
            }
          }
        }),
        this.prisma.playlist.count({ where })
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        playlists,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    } catch (error) {
      logger.error('Failed to get user playlists', { 
        userId,
        query,
        error: (error as Error).message 
      })
      throw new AppError('Failed to retrieve playlists', 500, 'PLAYLIST_FETCH_FAILED')
    }
  }

  async createPlaylist(userId: number, data: CreatePlaylistData): Promise<PlaylistResponse> {
    try {
      // Check for duplicate playlist name
      const existingPlaylist = await this.prisma.playlist.findFirst({
        where: { 
          userId, 
          name: data.name 
        }
      })

      if (existingPlaylist) {
        throw new AppError('Playlist name already exists', 409, 'PLAYLIST_NAME_EXISTS')
      }

      const playlist = await this.prisma.playlist.create({
        data: {
          userId,
          name: data.name,
          description: data.description || null,
          isPublic: data.isPublic || false
        },
        include: {
          _count: {
            select: { songs: true }
          }
        }
      })

      logger.info(`Playlist created: ${playlist.name}`, { 
        userId,
        playlistId: playlist.id 
      })

      return playlist
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      
      logger.error('Failed to create playlist', { 
        userId,
        data,
        error: (error as Error).message 
      })
      
      throw new AppError('Failed to create playlist', 500, 'PLAYLIST_CREATION_FAILED')
    }
  }

  async getPlaylistById(playlistId: number, userId?: number): Promise<any> {
    try {
      const where: any = { id: playlistId }
      
      // If userId is provided, check if user owns the playlist or if it's public
      if (userId) {
        where.OR = [
          { userId },
          { isPublic: true }
        ]
      } else {
        // If no userId, only show public playlists
        where.isPublic = true
      }

      const playlist = await this.prisma.playlist.findFirst({
        where,
        include: {
          songs: {
            include: {
              song: true
            },
            orderBy: { position: 'asc' }
          },
          user: {
            select: { 
              id: true, 
              nickname: true 
            }
          },
          _count: {
            select: { songs: true }
          }
        }
      })

      if (!playlist) {
        throw new AppError('Playlist not found', 404, 'PLAYLIST_NOT_FOUND')
      }

      return playlist
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      
      logger.error('Failed to get playlist by ID', { 
        playlistId,
        userId,
        error: (error as Error).message 
      })
      
      throw new AppError('Failed to retrieve playlist', 500, 'PLAYLIST_FETCH_FAILED')
    }
  }

  async updatePlaylist(playlistId: number, userId: number, data: UpdatePlaylistData): Promise<PlaylistResponse> {
    try {
      // Check if playlist exists and belongs to user
      const existingPlaylist = await this.prisma.playlist.findFirst({
        where: { 
          id: playlistId, 
          userId 
        }
      })

      if (!existingPlaylist) {
        throw new AppError('Playlist not found', 404, 'PLAYLIST_NOT_FOUND')
      }

      // Check for duplicate name if name is being updated
      if (data.name && data.name !== existingPlaylist.name) {
        const duplicateName = await this.prisma.playlist.findFirst({
          where: { 
            userId, 
            name: data.name,
            id: { not: playlistId }
          }
        })

        if (duplicateName) {
          throw new AppError('Playlist name already exists', 409, 'PLAYLIST_NAME_EXISTS')
        }
      }

      const updatedPlaylist = await this.prisma.playlist.update({
        where: { id: playlistId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
          updatedAt: new Date()
        },
        include: {
          _count: {
            select: { songs: true }
          }
        }
      })

      logger.info(`Playlist updated: ${updatedPlaylist.name}`, { 
        userId,
        playlistId 
      })

      return updatedPlaylist
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      
      logger.error('Failed to update playlist', { 
        playlistId,
        userId,
        data,
        error: (error as Error).message 
      })
      
      throw new AppError('Failed to update playlist', 500, 'PLAYLIST_UPDATE_FAILED')
    }
  }

  async deletePlaylist(playlistId: number, userId: number): Promise<void> {
    try {
      // Check if playlist exists and belongs to user
      const playlist = await this.prisma.playlist.findFirst({
        where: { 
          id: playlistId, 
          userId 
        }
      })

      if (!playlist) {
        throw new AppError('Playlist not found', 404, 'PLAYLIST_NOT_FOUND')
      }

      // Delete playlist (cascade will delete associated songs)
      await this.prisma.playlist.delete({
        where: { id: playlistId }
      })

      logger.info(`Playlist deleted: ${playlist.name}`, { 
        userId,
        playlistId 
      })
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      
      logger.error('Failed to delete playlist', { 
        playlistId,
        userId,
        error: (error as Error).message 
      })
      
      throw new AppError('Failed to delete playlist', 500, 'PLAYLIST_DELETE_FAILED')
    }
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
}