import rateLimit from 'express-rate-limit'

// 登入限流：每15分鐘最多5次嘗試
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分鐘
  max: 5, // 每個IP最多5次嘗試
  message: {
    success: false,
    error: {
      message: 'Too many login attempts, please try again later',
      code: 'TOO_MANY_REQUESTS'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // 成功的請求不計入限制
  keyGenerator: (req) => {
    // 使用IP地址作為key
    return req.ip || req.connection.remoteAddress || 'unknown'
  }
})

// 註冊限流：每小時最多3次註冊
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小時
  max: 3, // 每個IP最多3次註冊
  message: {
    success: false,
    error: {
      message: 'Too many registration attempts, please try again later',
      code: 'TOO_MANY_REQUESTS'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown'
  }
})

// 一般API限流：每分鐘最多100次請求
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分鐘
  max: 100, // 每個IP最多100次請求
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later',
      code: 'TOO_MANY_REQUESTS'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
})