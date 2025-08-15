import Redis from 'ioredis'
import { logger } from '../utils/logger'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  reconnectOnError: (err) => {
    const targetError = 'READONLY'
    return err.message.includes(targetError)
  }
})

redis.on('connect', () => {
  logger.info('Redis connected successfully')
})

redis.on('error', (error) => {
  logger.error('Redis connection error:', error)
})

redis.on('close', () => {
  logger.warn('Redis connection closed')
})

redis.on('reconnecting', () => {
  logger.info('Redis reconnecting...')
})

// 測試Redis連接
export const testRedisConnection = async (): Promise<boolean> => {
  try {
    await redis.ping()
    return true
  } catch (error) {
    logger.error('Redis ping failed:', error)
    return false
  }
}

// 優雅關閉Redis連接
export const closeRedis = async (): Promise<void> => {
  await redis.disconnect()
}

export { redis }
export default redis