import { api } from './api'

export interface YouTubeVideoInfo {
  id: string
  title: string
  artist?: string
  duration: number
  thumbnailUrl: string
  viewCount?: number
  publishedAt?: string
}

export interface BatchParseResult {
  successful: YouTubeVideoInfo[]
  failed: { url: string; error: string }[]
  total: number
  successCount: number
  failCount: number
}

export interface ValidationResult {
  isValid: boolean
  videoId: string | null
  url: string
}

export const useYouTubeService = () => {
  /**
   * 解析單個YouTube URL
   */
  const parseUrl = async (url: string): Promise<YouTubeVideoInfo> => {
    const response = await api.post('/youtube/parse', { url })
    return response.data.data
  }

  /**
   * 批量解析YouTube URLs
   */
  const parseBatch = async (urls: string[]): Promise<BatchParseResult> => {
    const response = await api.post('/youtube/parse-batch', { urls })
    return response.data.data
  }

  /**
   * 驗證YouTube URL是否有效
   */
  const validateUrl = async (url: string): Promise<ValidationResult> => {
    const response = await api.post('/youtube/validate', { url })
    return response.data.data
  }

  /**
   * 從URL提取YouTube影片ID
   */
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }
    return null
  }

  /**
   * 檢查URL是否為有效的YouTube URL格式
   */
  const isValidYouTubeUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') {
      return false
    }

    try {
      const videoId = extractVideoId(url)
      return videoId !== null && videoId.length === 11
    } catch {
      return false
    }
  }

  /**
   * 從文本中提取YouTube URLs
   */
  const extractUrlsFromText = (text: string): string[] => {
    const urlPattern = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?[^\\s]*v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]{11}[^\\s]*/g
    const matches = text.match(urlPattern) || []
    return matches.filter(url => isValidYouTubeUrl(url))
  }

  /**
   * 格式化時長顯示
   */
  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '--:--'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }
  }

  /**
   * 格式化觀看次數
   */
  const formatViewCount = (count: number): string => {
    if (!count) return '未知'
    
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M 次觀看`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K 次觀看`
    } else {
      return `${count} 次觀看`
    }
  }

  /**
   * 從標題解析藝術家和歌曲名稱
   */
  const parseTitle = (title: string): { title: string; artist?: string } => {
    const patterns = [
      /^(.+?)\s*[-–—]\s*(.+)$/, // Artist - Song
      /^(.+?)\s*\|\s*(.+)$/, // Artist | Song
      /^(.+?)\s*:\s*(.+)$/, // Artist: Song
      /^(.+?)\s*by\s+(.+)$/i, // Song by Artist
      /^(.+?)\s*-\s*(.+?)\s*\(.*\)$/, // Artist - Song (additional info)
    ]

    for (const pattern of patterns) {
      const match = title.match(pattern)
      if (match) {
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

    return { title: title.trim() }
  }

  /**
   * 獲取YouTube影片縮圖URL (不同品質)
   */
  const getThumbnailUrl = (videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'medium'): string => {
    const qualityMap = {
      default: 'default',
      medium: 'mqdefault', 
      high: 'hqdefault',
      maxres: 'maxresdefault'
    }
    
    return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`
  }

  return {
    parseUrl,
    parseBatch,
    validateUrl,
    extractVideoId,
    isValidYouTubeUrl,
    extractUrlsFromText,
    formatDuration,
    formatViewCount,
    parseTitle,
    getThumbnailUrl
  }
}

// 導出單例實例以便在組件外使用
export const youtubeService = useYouTubeService()