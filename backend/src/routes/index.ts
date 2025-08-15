import { Router } from 'express'
import authRoutes from './auth.routes'

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

export { router }
export default router