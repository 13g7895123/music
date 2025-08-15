import { ref, computed } from 'vue'
import { youtubeService } from '@/services/youtube'

export const useClipboard = () => {
  const isSupported = computed(() => {
    return typeof navigator !== 'undefined' && 'clipboard' in navigator
  })

  const permissionState = ref<PermissionState | null>(null)

  /**
   * 檢查剪貼簿權限
   */
  const checkPermission = async (): Promise<boolean> => {
    if (!isSupported.value) return false

    try {
      const permission = await navigator.permissions.query({ 
        name: 'clipboard-read' as PermissionName 
      })
      permissionState.value = permission.state
      return permission.state === 'granted' || permission.state === 'prompt'
    } catch (error) {
      console.warn('Clipboard permission check failed:', error)
      return false
    }
  }

  /**
   * 讀取剪貼簿內容
   */
  const readText = async (): Promise<string | null> => {
    if (!isSupported.value) return null

    try {
      const text = await navigator.clipboard.readText()
      return text
    } catch (error) {
      console.error('Failed to read clipboard:', error)
      return null
    }
  }

  /**
   * 寫入文本到剪貼簿
   */
  const writeText = async (text: string): Promise<boolean> => {
    if (!isSupported.value) return false

    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      console.error('Failed to write to clipboard:', error)
      return false
    }
  }

  /**
   * 從剪貼簿檢測YouTube URLs
   */
  const detectYouTubeUrls = async (): Promise<string[]> => {
    const text = await readText()
    if (!text) return []

    return youtubeService.extractUrlsFromText(text)
  }

  /**
   * 監聽剪貼簿變化 (需要定期檢查)
   */
  const createClipboardWatcher = (callback: (urls: string[]) => void, interval = 1000) => {
    let lastContent = ''
    let intervalId: number | null = null

    const check = async () => {
      const text = await readText()
      if (text && text !== lastContent) {
        lastContent = text
        const urls = youtubeService.extractUrlsFromText(text)
        if (urls.length > 0) {
          callback(urls)
        }
      }
    }

    const start = () => {
      if (intervalId) stop()
      intervalId = window.setInterval(check, interval)
    }

    const stop = () => {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    return { start, stop }
  }

  /**
   * 處理粘貼事件
   */
  const handlePasteEvent = (event: ClipboardEvent): { 
    text: string | null, 
    urls: string[],
    hasUrls: boolean 
  } => {
    const text = event.clipboardData?.getData('text') || null
    const urls = text ? youtubeService.extractUrlsFromText(text) : []
    
    return {
      text,
      urls,
      hasUrls: urls.length > 0
    }
  }

  /**
   * 複製歌曲資訊到剪貼簿
   */
  const copySongInfo = async (song: {
    title: string
    artist?: string
    url?: string
  }): Promise<boolean> => {
    const info = []
    if (song.title) info.push(`標題: ${song.title}`)
    if (song.artist) info.push(`藝術家: ${song.artist}`)
    if (song.url) info.push(`連結: ${song.url}`)
    
    const text = info.join('\n')
    return await writeText(text)
  }

  /**
   * 複製播放清單到剪貼簿
   */
  const copyPlaylistInfo = async (playlist: {
    name: string
    description?: string
    songs?: Array<{ title: string; artist?: string }>
  }): Promise<boolean> => {
    const info = [`播放清單: ${playlist.name}`]
    
    if (playlist.description) {
      info.push(`描述: ${playlist.description}`)
    }
    
    if (playlist.songs && playlist.songs.length > 0) {
      info.push(`\n歌曲列表:`)
      playlist.songs.forEach((song, index) => {
        const songInfo = `${index + 1}. ${song.title}${song.artist ? ` - ${song.artist}` : ''}`
        info.push(songInfo)
      })
    }
    
    const text = info.join('\n')
    return await writeText(text)
  }

  /**
   * 從剪貼簿自動填入YouTube URLs
   */
  const autoFillFromClipboard = async (): Promise<{
    success: boolean
    urls: string[]
    message: string
  }> => {
    try {
      const urls = await detectYouTubeUrls()
      
      if (urls.length === 0) {
        return {
          success: false,
          urls: [],
          message: '剪貼簿中沒有找到YouTube連結'
        }
      }
      
      return {
        success: true,
        urls,
        message: `在剪貼簿中找到 ${urls.length} 個YouTube連結`
      }
    } catch (error) {
      return {
        success: false,
        urls: [],
        message: '無法讀取剪貼簿內容'
      }
    }
  }

  return {
    isSupported,
    permissionState,
    checkPermission,
    readText,
    writeText,
    detectYouTubeUrls,
    createClipboardWatcher,
    handlePasteEvent,
    copySongInfo,
    copyPlaylistInfo,
    autoFillFromClipboard
  }
}