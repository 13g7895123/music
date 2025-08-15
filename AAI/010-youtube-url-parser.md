# Story 10: YouTube URL解析服務

## 📋 基本資訊
- **Story ID**: YMP-010
- **Epic**: 播放清單管理
- **優先級**: Must Have (P0)
- **預估點數**: 5 points
- **預估時間**: 1 天
- **依賴關係**: Story 3
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 已登入用戶  
**我希望** 能夠透過YouTube URL自動解析歌曲資訊  
**以便** 快速添加歌曲到我的播放清單

## 📝 詳細需求

### 核心功能需求
1. **URL驗證**: 驗證YouTube URL的有效性
2. **ID提取**: 從各種YouTube URL格式提取影片ID
3. **資訊抓取**: 獲取影片標題、時長、縮圖等資訊
4. **錯誤處理**: 處理無效URL、私人影片、地區限制等
5. **快取機制**: 快取已解析的影片資訊

### 技術規格

**YouTube URL解析服務**:
```typescript
// backend/src/services/youtube.service.ts
import axios from 'axios'
import { AppError } from '../middleware/error.middleware'
import { logger } from '../utils/logger'
import { prisma } from '../app'

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
  private static readonly URL_PATTERNS = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ]

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
  static async getVideoInfoFromOEmbed(videoId: string): Promise<YouTubeVideoInfo | null> {
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
        throw new AppError('Video not found or not available', 404)
      }
      if (error.response?.status === 401) {
        throw new AppError('Video is private or restricted', 403)
      }
      logger.error(`Error fetching video info for ${videoId}:`, error)
      return null
    }
  }

  /**
   * 嘗試從影片標題解析藝術家和歌曲名稱
   */
  private static parseTitle(title: string): { title: string; artist?: string } {
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
        // 第一個模式：第一部分是藝術家，第二部分是歌曲
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
  static async parseYouTubeUrl(url: string): Promise<YouTubeVideoInfo> {
    // 驗證URL
    if (!this.isValidYouTubeUrl(url)) {
      throw new AppError('Invalid YouTube URL format', 400)
    }

    const videoId = this.extractVideoId(url)
    if (!videoId) {
      throw new AppError('Could not extract video ID from URL', 400)
    }

    // 檢查資料庫中是否已有該影片資訊
    const existingSong = await prisma.song.findUnique({
      where: { youtubeId: videoId }
    })

    if (existingSong) {
      return {
        id: videoId,
        title: existingSong.title,
        artist: existingSong.artist || undefined,
        duration: existingSong.duration || 0,
        thumbnailUrl: existingSong.thumbnailUrl || '',
        viewCount: existingSong.viewCount || undefined
      }
    }

    // 從YouTube獲取影片資訊
    const videoInfo = await this.getVideoInfoFromOEmbed(videoId)
    if (!videoInfo) {
      throw new AppError('Could not fetch video information from YouTube', 500)
    }

    // 儲存到資料庫
    const savedSong = await prisma.song.create({
      data: {
        youtubeId: videoId,
        title: videoInfo.title,
        artist: videoInfo.artist,
        duration: videoInfo.duration,
        thumbnailUrl: videoInfo.thumbnailUrl,
        viewCount: videoInfo.viewCount
      }
    })

    logger.info(`New song saved: ${videoInfo.title} (${videoId})`)

    return videoInfo
  }

  /**
   * 批量解析多個YouTube URLs
   */
  static async parseMultipleUrls(urls: string[]): Promise<{
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

    return { successful, failed }
  }
}
```

**API端點實作**:
```typescript
// backend/src/routes/youtube.ts
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { YouTubeService } from '../services/youtube.service'
import { AppError } from '../middleware/error.middleware'

const router = Router()
router.use(authMiddleware)

// 解析單個YouTube URL
router.post('/parse', async (req, res, next) => {
  try {
    const { url } = req.body

    if (!url) {
      throw new AppError('YouTube URL is required', 400)
    }

    const videoInfo = await YouTubeService.parseYouTubeUrl(url)

    res.json({
      success: true,
      message: 'YouTube URL parsed successfully',
      data: videoInfo
    })
  } catch (error) {
    next(error)
  }
})

// 批量解析YouTube URLs
router.post('/parse-batch', async (req, res, next) => {
  try {
    const { urls } = req.body

    if (!Array.isArray(urls) || urls.length === 0) {
      throw new AppError('URLs array is required', 400)
    }

    if (urls.length > 10) {
      throw new AppError('Maximum 10 URLs allowed per batch', 400)
    }

    const result = await YouTubeService.parseMultipleUrls(urls)

    res.json({
      success: true,
      message: `Parsed ${result.successful.length} URLs successfully`,
      data: {
        successful: result.successful,
        failed: result.failed,
        total: urls.length,
        successCount: result.successful.length,
        failCount: result.failed.length
      }
    })
  } catch (error) {
    next(error)
  }
})

// 驗證YouTube URL
router.post('/validate', async (req, res, next) => {
  try {
    const { url } = req.body

    if (!url) {
      throw new AppError('YouTube URL is required', 400)
    }

    const isValid = YouTubeService.isValidYouTubeUrl(url)
    const videoId = isValid ? YouTubeService.extractVideoId(url) : null

    res.json({
      success: true,
      data: {
        isValid,
        videoId,
        url
      }
    })
  } catch (error) {
    next(error)
  }
})

export default router
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `backend/src/services/youtube.service.ts` - YouTube解析服務
- `backend/src/routes/youtube.ts` - YouTube相關API路由
- `backend/tests/services/youtube.service.test.ts` - 服務測試

**更新檔案**:
- `backend/src/app.ts` - 註冊YouTube路由
- `backend/prisma/schema.prisma` - 確保Song模型正確

## ✅ 驗收條件

### 功能驗收
- [ ] 可以正確解析各種格式的YouTube URL
- [ ] 能夠提取影片ID、標題、縮圖等資訊
- [ ] 支援批量URL解析
- [ ] URL驗證功能正常運作
- [ ] 已解析的影片資訊會被快取

### 錯誤處理驗收
- [ ] 無效URL返回適當錯誤訊息
- [ ] 私人或受限影片有適當錯誤處理
- [ ] 網路錯誤有重試機制
- [ ] 超時請求有適當處理

### 效能驗收
- [ ] 單個URL解析時間 < 3秒
- [ ] 批量解析有適當的並行控制
- [ ] 快取機制正常運作

## 🚀 實作指引

### Step 1: 安裝依賴
```bash
cd backend
npm install axios
```

### Step 2: 實作YouTube服務
按照技術規格建立youtube.service.ts

### Step 3: 建立API路由
實作youtube.ts路由檔案

### Step 4: 測試功能
測試各種YouTube URL格式

## 📊 預期成果
- ✅ 強大的YouTube URL解析能力
- ✅ 完整的錯誤處理機制
- ✅ 高效的快取系統
- ✅ 支援批量處理
- ✅ 良好的效能表現