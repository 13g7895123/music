import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

import { app, prisma } from './app'
import { logger } from './utils/logger'

const PORT = process.env.BACKEND_PORT || 3000

async function startServer() {
  try {
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`)
      logger.info(`Health check: http://localhost:${PORT}/health`)
      logger.info(`API docs: http://localhost:${PORT}/api-docs`)
    })
    
    try {
      await prisma.$connect()
      logger.info('Database connected successfully')
    } catch (dbError) {
      logger.warn('Database connection failed, server will run without database:', dbError)
    }
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

startServer()