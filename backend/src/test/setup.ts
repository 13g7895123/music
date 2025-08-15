import { beforeAll, afterAll, beforeEach } from 'vitest'
import dotenv from 'dotenv'

// 載入測試環境變數
dotenv.config({ path: '.env.test' })

// 設定測試環境變數
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5433/test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
process.env.ENCRYPTION_SECRET = 'test-encryption-secret'
process.env.PASSWORD_PEPPER = 'test-pepper'

// Mock console methods to reduce noise in tests
const originalConsole = global.console

beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: originalConsole.error // 保留錯誤輸出用於debugging
  }
})

afterAll(() => {
  global.console = originalConsole
})

// 每個測試前清理模組快取
beforeEach(() => {
  // Reset modules that might be cached
  delete require.cache[require.resolve('../app')]
})

// 延長超時時間
jest.setTimeout = (timeout: number) => timeout