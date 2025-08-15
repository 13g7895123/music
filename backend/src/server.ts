import dotenv from 'dotenv'
import { app } from './app'

// 載入環境變數
dotenv.config()

const PORT = process.env.PORT || 3000

// 優雅關閉處理
const gracefulShutdown = (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`)
  
  server.close(() => {
    console.log('Process terminated')
    process.exit(0)
  })

  // 強制關閉 (30秒後)
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down')
    process.exit(1)
  }, 30000)
}

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 Health check: http://localhost:${PORT}/health`)
  console.log(`📖 API: http://localhost:${PORT}/api/v1/status`)
})

// 優雅關閉監聽
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

export { server }