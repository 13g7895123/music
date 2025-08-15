import { PrismaClient, Song } from '@prisma/client'
import { AppError } from '../middleware/error.middleware'
import { logger } from '../utils/logger'

export interface CreateSongData {
  youtubeId: string
  title: string
  artist?: string
  duration?: number
  thumbnailUrl?: string
  channelName?: string
  viewCount?: bigint
  publishedAt?: Date
}

export interface SongQuery {
  page?: number
  limit?: number
  search?: string
}

export class SongService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  async createSong(data: CreateSongData): Promise<Song> {
    try {
      // Check if song already exists by YouTube ID
      const existingSong = await this.prisma.song.findUnique({
        where: { youtubeId: data.youtubeId }
      })

      if (existingSong) {
        throw new AppError('Song with this YouTube ID already exists', 409, 'SONG_ALREADY_EXISTS')
      }

      const song = await this.prisma.song.create({
        data: {
          youtubeId: data.youtubeId,
          title: data.title,
          artist: data.artist,
          duration: data.duration,
          thumbnailUrl: data.thumbnailUrl,
          channelName: data.channelName,
          viewCount: data.viewCount,
          publishedAt: data.publishedAt
        }
      })

      logger.info(`Song created: ${song.title}`, { 
        songId: song.id,
        youtubeId: song.youtubeId 
      })

      return song
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      
      logger.error('Failed to create song', { 
        data,
        error: (error as Error).message 
      })
      
      throw new AppError('Failed to create song', 500, 'SONG_CREATION_FAILED')
    }
  }

  async findOrCreateSong(data: CreateSongData): Promise<Song> {
    try {
      // Try to find existing song first
      const existingSong = await this.prisma.song.findUnique({
        where: { youtubeId: data.youtubeId }
      })

      if (existingSong) {
        return existingSong
      }

      // Create new song if it doesn't exist
      return await this.createSong(data)
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      
      logger.error('Failed to find or create song', { 
        data,
        error: (error as Error).message 
      })
      
      throw new AppError('Failed to find or create song', 500, 'SONG_OPERATION_FAILED')
    }
  }

  async getSongs(query: SongQuery): Promise<{
    songs: Song[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    try {
      const page = query.page || 1
      const limit = Math.min(query.limit || 20, 100)
      const search = query.search
      const skip = (page - 1) * limit

      const where: any = {}
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { artist: { contains: search, mode: 'insensitive' } },
          { channelName: { contains: search, mode: 'insensitive' } }
        ]
      }

      const [songs, total] = await Promise.all([
        this.prisma.song.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.song.count({ where })
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        songs,
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
      logger.error('Failed to get songs', { 
        query,
        error: (error as Error).message 
      })
      
      throw new AppError('Failed to retrieve songs', 500, 'SONGS_FETCH_FAILED')
    }
  }

  async getSongById(id: number): Promise<Song | null> {
    try {
      return await this.prisma.song.findUnique({
        where: { id }
      })
    } catch (error) {
      logger.error('Failed to get song by ID', { 
        id,
        error: (error as Error).message 
      })
      
      throw new AppError('Failed to retrieve song', 500, 'SONG_FETCH_FAILED')
    }
  }

  async getSongByYouTubeId(youtubeId: string): Promise<Song | null> {
    try {
      return await this.prisma.song.findUnique({
        where: { youtubeId }
      })
    } catch (error) {
      logger.error('Failed to get song by YouTube ID', { 
        youtubeId,
        error: (error as Error).message 
      })
      
      throw new AppError('Failed to retrieve song', 500, 'SONG_FETCH_FAILED')
    }
  }

  async updateSong(id: number, data: Partial<CreateSongData>): Promise<Song> {
    try {
      const song = await this.prisma.song.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.artist && { artist: data.artist }),
          ...(data.duration && { duration: data.duration }),
          ...(data.thumbnailUrl && { thumbnailUrl: data.thumbnailUrl }),
          ...(data.channelName && { channelName: data.channelName }),
          ...(data.viewCount && { viewCount: data.viewCount }),
          ...(data.publishedAt && { publishedAt: data.publishedAt }),
          lastChecked: new Date()
        }
      })

      logger.info(`Song updated: ${song.title}`, { 
        songId: song.id 
      })

      return song
    } catch (error) {
      logger.error('Failed to update song', { 
        id,
        data,
        error: (error as Error).message 
      })
      
      throw new AppError('Failed to update song', 500, 'SONG_UPDATE_FAILED')
    }
  }

  async deleteSong(id: number): Promise<void> {
    try {
      await this.prisma.song.delete({
        where: { id }
      })

      logger.info(`Song deleted`, { songId: id })
    } catch (error) {
      logger.error('Failed to delete song', { 
        id,
        error: (error as Error).message 
      })
      
      throw new AppError('Failed to delete song', 500, 'SONG_DELETE_FAILED')
    }
  }
}