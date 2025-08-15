import axios from 'axios'
import { PrismaClient } from '@prisma/client'
import { AppError } from '../middleware/error.middleware'
import { logger } from '../utils/logger'

interface YouTubeVideoInfo {
  id: string
  title: string
  artist?: string
  duration: number
  thumbnailUrl: string
  viewCount?: number
  publishedAt?: string
}

export class YouTubeService {
  private prisma: PrismaClient
  
  private static readonly URL_PATTERNS = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ]

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * 從YouTube URL提取影片ID
   */
  static extractVideoId(url: string): string | null {
    try {
      for (const pattern of this.URL_PATTERNS) {
        const match = url.match(pattern)
        if (match && match[1]) {
          return match[1]
        }
      }
      return null
    } catch (error) {
      logger.error('Error extracting video ID:', error)
      return null
    }
  }

  /**
   * 驗證YouTube URL是否有效
   */
  static isValidYouTubeUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false
    }

    try {
      const videoId = this.extractVideoId(url)
      return videoId !== null && videoId.length === 11
    } catch {
      return false
    }
  }

  /**
   * 從YouTube oEmbed API獲取影片資訊
   */
  private async getVideoInfoFromOEmbed(videoId: string): Promise<YouTubeVideoInfo | null> {
    try {
      const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      
      const response = await axios.get(oEmbedUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'MyTune Music Player/1.0'
        }
      })

      const data = response.data

      // 解析標題中的藝術家和歌曲名稱
      const { title, artist } = this.parseTitle(data.title)

      return {
        id: videoId,
        title,
        artist,
        duration: 0, // oEmbed不提供時長，需要其他方式獲取
        thumbnailUrl: data.thumbnail_url,
        viewCount: undefined,
        publishedAt: undefined
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new AppError('Video not found or not available', 404, 'VIDEO_NOT_FOUND')
      }
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new AppError('Video is private or restricted', 403, 'VIDEO_RESTRICTED')
      }
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new AppError('Network error while fetching video information', 503, 'NETWORK_ERROR')
      }
      if (error.code === 'ECONNABORTED') {
        throw new AppError('Request timeout while fetching video information', 408, 'REQUEST_TIMEOUT')
      }
      
      logger.error(`Error fetching video info for ${videoId}:`, {
        error: error.message,
        status: error.response?.status,
        code: error.code
      })
      
      throw new AppError('Failed to fetch video information from YouTube', 500, 'YOUTUBE_API_ERROR')
    }
  }

  /**
   * 嘗試從影片標題解析藝術家和歌曲名稱
   */
  private parseTitle(title: string): { title: string; artist?: string } {
    // 常見的分隔符模式
    const patterns = [
      /^(.+?)\s*[-–—]\s*(.+)$/, // Artist - Song
      /^(.+?)\s*\|\s*(.+)$/, // Artist | Song
      /^(.+?)\s*:\s*(.+)$/, // Artist: Song
      /^(.+?)\s*by\s+(.+)$/i, // Song by Artist
    ]

    for (const pattern of patterns) {
      const match = title.match(pattern)
      if (match) {
        // 檢查是否是 "by" 模式
        if (pattern.source.includes('by')) {
          return {
            title: match[1].trim(),
            artist: match[2].trim()
          }
        } else {
          return {
            title: match[2].trim(),
            artist: match[1].trim()
          }
        }
      }
    }

    // 如果沒有找到模式，返回原始標題
    return { title: title.trim() }
  }

  /**
   * 解析YouTube URL並獲取完整歌曲資訊
   */
  async parseYouTubeUrl(url: string): Promise<YouTubeVideoInfo> {
    // 驗證URL
    if (!YouTubeService.isValidYouTubeUrl(url)) {
      throw new AppError('Invalid YouTube URL format', 400, 'INVALID_URL')
    }

    const videoId = YouTubeService.extractVideoId(url)
    if (!videoId) {
      throw new AppError('Could not extract video ID from URL', 400, 'INVALID_VIDEO_ID')
    }

    try {
      // 檢查資料庫中是否已有該影片資訊
      const existingSong = await this.prisma.song.findUnique({
        where: { youtubeId: videoId }
      })

      if (existingSong) {
        // 更新最後檢查時間
        await this.prisma.song.update({
          where: { id: existingSong.id },
          data: { lastChecked: new Date() }
        })

        return {
          id: videoId,
          title: existingSong.title,
          artist: existingSong.artist || undefined,
          duration: existingSong.duration || 0,
          thumbnailUrl: existingSong.thumbnailUrl || '',
          viewCount: existingSong.viewCount ? Number(existingSong.viewCount) : undefined,
          publishedAt: existingSong.publishedAt?.toISOString()
        }
      }

      // 從YouTube獲取影片資訊
      const videoInfo = await this.getVideoInfoFromOEmbed(videoId)
      if (!videoInfo) {
        throw new AppError('Could not fetch video information from YouTube', 500, 'FETCH_FAILED')
      }

      // 儲存到資料庫
      const savedSong = await this.prisma.song.create({
        data: {
          youtubeId: videoId,
          title: videoInfo.title,
          artist: videoInfo.artist,
          duration: videoInfo.duration,
          thumbnailUrl: videoInfo.thumbnailUrl,
          viewCount: videoInfo.viewCount ? BigInt(videoInfo.viewCount) : null,
          publishedAt: videoInfo.publishedAt ? new Date(videoInfo.publishedAt) : null
        }
      })

      logger.info(`New song saved: ${videoInfo.title} (${videoId})`, {
        songId: savedSong.id,
        youtubeId: videoId
      })

      return videoInfo
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      logger.error('Error parsing YouTube URL:', {
        url,
        videoId,
        error: (error as Error).message
      })

      throw new AppError('Failed to parse YouTube URL', 500, 'PARSE_FAILED')
    }
  }

  /**
   * 批量解析多個YouTube URLs
   */
  async parseMultipleUrls(urls: string[]): Promise<{
    successful: YouTubeVideoInfo[]
    failed: { url: string; error: string }[]
  }> {
    const successful: YouTubeVideoInfo[] = []
    const failed: { url: string; error: string }[] = []

    // 限制並行請求數量
    const batchSize = 3
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize)
      
      const promises = batch.map(async (url) => {
        try {
          const videoInfo = await this.parseYouTubeUrl(url)
          successful.push(videoInfo)
        } catch (error: any) {
          failed.push({
            url,
            error: error.message || 'Unknown error'
          })
        }
      })

      await Promise.all(promises)
      
      // 避免過於頻繁的請求
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    logger.info(`Batch URL parsing completed`, {
      total: urls.length,
      successful: successful.length,
      failed: failed.length
    })

    return { successful, failed }
  }

  /**
   * 驗證YouTube URL並返回詳細資訊
   */
  validateYouTubeUrl(url: string): {
    isValid: boolean
    videoId: string | null
    url: string
    errors?: string[]
  } {
    const errors: string[] = []
    
    if (!url || typeof url !== 'string') {
      errors.push('URL is required and must be a string')
      return { isValid: false, videoId: null, url, errors }
    }

    if (url.length > 2000) {
      errors.push('URL is too long')
      return { isValid: false, videoId: null, url, errors }
    }

    const videoId = YouTubeService.extractVideoId(url)
    
    if (!videoId) {
      errors.push('Invalid YouTube URL format')
      return { isValid: false, videoId: null, url, errors }
    }

    if (videoId.length !== 11) {
      errors.push('Invalid YouTube video ID length')
      return { isValid: false, videoId: null, url, errors }
    }

    return { isValid: true, videoId, url }
  }

  /**
   * 搜尋已保存的歌曲
   */
  async searchSongs(query: string, limit: number = 20): Promise<YouTubeVideoInfo[]> {
    try {
      const songs = await this.prisma.song.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { artist: { contains: query, mode: 'insensitive' } },
            { channelName: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: limit,
        orderBy: { lastChecked: 'desc' }
      })

      return songs.map(song => ({
        id: song.youtubeId,
        title: song.title,
        artist: song.artist || undefined,
        duration: song.duration || 0,
        thumbnailUrl: song.thumbnailUrl || '',
        viewCount: song.viewCount ? Number(song.viewCount) : undefined,
        publishedAt: song.publishedAt?.toISOString()
      }))
    } catch (error) {
      logger.error('Error searching songs:', {
        query,
        error: (error as Error).message
      })
      
      throw new AppError('Failed to search songs', 500, 'SEARCH_FAILED')
    }
  }
}