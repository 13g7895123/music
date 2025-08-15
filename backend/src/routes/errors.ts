import express from 'express'
import { logError } from '../middleware/error.middleware'
import { asyncHandler } from '../middleware/error.middleware'

const router = express.Router()

// 前端錯誤記錄端點
router.post('/', asyncHandler(logError))

// 錯誤統計端點（可選，用於監控）
router.get('/stats', asyncHandler(async (req, res) => {
  // 這裡可以實作錯誤統計功能
  // 例如從日誌檔案或資料庫中統計錯誤數據
  res.json({
    success: true,
    data: {
      message: 'Error statistics endpoint - to be implemented'
    }
  })
}))

export default router