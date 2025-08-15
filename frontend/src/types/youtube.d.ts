// YouTube iframe API Type Definitions

interface Window {
  YT: typeof YT
  onYouTubeIframeAPIReady: () => void
}

declare namespace YT {
  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5
  }

  interface PlayerVars {
    autoplay?: 0 | 1
    cc_load_policy?: 0 | 1
    color?: 'red' | 'white'
    controls?: 0 | 1 | 2
    disablekb?: 0 | 1
    enablejsapi?: 0 | 1
    end?: number
    fs?: 0 | 1
    hl?: string
    iv_load_policy?: 1 | 3
    list?: string
    listType?: 'playlist' | 'search' | 'user_uploads'
    loop?: 0 | 1
    modestbranding?: 0 | 1
    origin?: string
    playlist?: string
    playsinline?: 0 | 1
    rel?: 0 | 1
    showinfo?: 0 | 1
    start?: number
    widget_referrer?: string
  }

  interface Events {
    onReady?: (event: PlayerEvent) => void
    onStateChange?: (event: PlayerEvent) => void
    onPlaybackQualityChange?: (event: PlayerEvent) => void
    onPlaybackRateChange?: (event: PlayerEvent) => void
    onError?: (event: PlayerEvent) => void
    onApiChange?: (event: PlayerEvent) => void
  }

  interface PlayerEvent {
    target: Player
    data: any
  }

  interface VideoData {
    video_id: string
    title: string
    author: string
    video_quality: string
  }

  class Player {
    constructor(elementId: string | HTMLElement, options: {
      width?: string | number
      height?: string | number
      videoId?: string
      playerVars?: PlayerVars
      events?: Events
    })

    // Playback controls
    playVideo(): void
    pauseVideo(): void
    stopVideo(): void
    seekTo(seconds: number, allowSeekAhead?: boolean): void
    clearVideo(): void

    // Changing the player volume
    mute(): void
    unMute(): void
    isMuted(): boolean
    setVolume(volume: number): void
    getVolume(): number

    // Setting the player size
    setSize(width: number, height: number): object

    // Setting playback rate
    getPlaybackRate(): number
    setPlaybackRate(suggestedRate: number): void
    getAvailablePlaybackRates(): number[]

    // Setting playlist
    nextVideo(): void
    previousVideo(): void
    getPlaylist(): string[]
    getPlaylistIndex(): number

    // Playing a video in a playlist
    playVideoAt(index: number): void

    // Changing the player volume
    loadVideoById(videoId: string, startSeconds?: number, suggestedQuality?: string): void
    loadVideoByUrl(mediaContentUrl: string, startSeconds?: number, suggestedQuality?: string): void
    cueVideoById(videoId: string, startSeconds?: number, suggestedQuality?: string): void
    cueVideoByUrl(mediaContentUrl: string, startSeconds?: number, suggestedQuality?: string): void

    // Loading a playlist
    loadPlaylist(playlist: string | string[], index?: number, startSeconds?: number, suggestedQuality?: string): void
    cuePlaylist(playlist: string | string[], index?: number, startSeconds?: number, suggestedQuality?: string): void

    // Retrieving video information
    getDuration(): number
    getCurrentTime(): number
    getVideoLoadedFraction(): number
    getPlayerState(): PlayerState
    getVideoData(): VideoData
    getVideoUrl(): string
    getVideoEmbedCode(): string

    // Retrieving playlist information
    getOptions(): string[]
    getOption(module: string, option: string): any
    setOption(module: string, option: string, value: any): void

    // Adding or removing an event listener
    addEventListener(event: string, listener: string | Function): void
    removeEventListener(event: string, listener: string | Function): void

    // Accessing and modifying DOM nodes
    getIframe(): HTMLIFrameElement
    destroy(): void
  }

  // 載入API的靜態方法
  function load(): void
  function ready(callback: () => void): void
}

// YouTube API Error Codes
export enum YouTubeErrorCode {
  INVALID_PARAM = 2,
  HTML5_ERROR = 5,
  VIDEO_NOT_FOUND = 100,
  EMBED_NOT_ALLOWED = 101,
  EMBED_NOT_ALLOWED_DISGUISE = 150
}

// YouTube Player Quality
export enum YouTubeQuality {
  SMALL = 'small',
  MEDIUM = 'medium', 
  LARGE = 'large',
  HD720 = 'hd720',
  HD1080 = 'hd1080',
  HIGHRES = 'highres',
  DEFAULT = 'default'
}

// Custom interfaces for our application
export interface YouTubePlayerConfig {
  videoId?: string
  autoplay?: boolean
  showVideo?: boolean
  width?: number
  height?: number
  startTime?: number
  endTime?: number
  loop?: boolean
  muted?: boolean
  volume?: number
}

export interface YouTubePlayerEventData {
  state: YT.PlayerState
  currentTime: number
  duration: number
  error?: YouTubeErrorCode
  quality?: YouTubeQuality
}

export interface YouTubePlayerMethods {
  play(): void
  pause(): void
  stop(): void
  setVolume(volume: number): void
  seekTo(seconds: number): void
  getDuration(): number
  getCurrentTime(): number
  getPlayerState(): YT.PlayerState
  loadVideo(videoId: string): void
  enterFullscreen(): void
  exitFullscreen(): void
}

export { YT }