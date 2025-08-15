import { Router } from 'express'
import authRoutes from './auth.routes'
import playlistRoutes from './playlists.routes'
import songsRoutes from './songs.routes'

const router = Router()

// 健康檢查路由
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// 認證路由
router.use('/auth', authRoutes)

// 播放清單路由
router.use('/playlists', playlistRoutes)

// 歌曲路由
router.use('/songs', songsRoutes)

export { router }
export default router