import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { PrismaClient } from '@prisma/client'
import swaggerUi from 'swagger-ui-express'
import swaggerJsdoc from 'swagger-jsdoc'
import { errorHandler, notFoundHandler } from './middleware/error.middleware'
import { 
  compressionMiddleware, 
  staticCacheMiddleware,
  performanceMiddleware,
  memoryMonitoringMiddleware,
  requestSizeLimitMiddleware
} from './middleware/compression.middleware'
import { 
  corsOptions, 
  helmetOptions, 
  rateLimiters,
  securityHeaders,
  csrfProtection,
  suspiciousActivityDetection,
  httpParameterPollutionProtection,
  slowAttackProtection
} from './middleware/security.middleware'
import { 
  xssProtection, 
  noSqlInjectionProtection 
} from './middleware/validation.middleware'
import { logger } from './utils/logger'
import SecurityUtils from './utils/security'

const app = express()
const prisma = new PrismaClient()

// 信任代理設定（用於獲取真實IP）
app.set('trust proxy', 1)

// 基礎安全中介軟體
app.use(helmet(helmetOptions))
app.use(securityHeaders)
app.use(cors(corsOptions))

// 安全攻擊防護中介軟體
app.use(suspiciousActivityDetection)
app.use(httpParameterPollutionProtection)
app.use(slowAttackProtection)
app.use(xssProtection)
app.use(noSqlInjectionProtection)
app.use(csrfProtection)

// 效能監控中介軟體（需要在其他中介軟體之前）
app.use(performanceMiddleware)
app.use(memoryMonitoringMiddleware)

// 壓縮中介軟體
app.use(compressionMiddleware)

// 靜態資源快取
app.use(staticCacheMiddleware)

// 請求大小限制
app.use(requestSizeLimitMiddleware(10)) // 10MB限制

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim())
    }
  },
  skip: (req) => {
    // 跳過健康檢查請求的日誌記錄
    return req.url === '/health'
  }
}))

// 不同端點的差異化Rate Limiting
app.use('/api/auth/login', rateLimiters.auth)
app.use('/api/auth/register', rateLimiters.register)
app.use('/api/auth/password-reset', rateLimiters.passwordReset)
app.use('/api/', rateLimiters.general)

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    
    const memoryUsage = process.memoryUsage()
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
      },
      database: 'connected'
    }
    
    res.status(200).json(SecurityUtils.generateSecureApiResponse(healthData, 'System is healthy'))
  } catch (error) {
    SecurityUtils.logSecurityEvent('health_check_failed', {
      error: error.message,
      ip: SecurityUtils.getClientIP(req)
    }, 'medium')
    
    res.status(503).json(SecurityUtils.generateSecureErrorResponse('Service temporarily unavailable', 'SERVICE_UNAVAILABLE'))
  }
})

// 安全審計端點（僅限開發環境）
if (process.env.NODE_ENV === 'development') {
  app.get('/security-audit', (req, res) => {
    const audit = {
      timestamp: new Date().toISOString(),
      middleware: [
        'helmet',
        'cors',
        'rate-limiting', 
        'xss-protection',
        'nosql-injection-protection',
        'csrf-protection',
        'suspicious-activity-detection'
      ],
      security_headers: SecurityUtils.getSecurityHeaders(),
      environment: {
        node_env: process.env.NODE_ENV,
        trust_proxy: app.get('trust proxy')
      }
    }
    
    res.json(SecurityUtils.generateSecureApiResponse(audit, 'Security audit complete'))
  })
}

// API 路由
import apiRoutes from './routes'
import errorRoutes from './routes/errors'

app.use('/api', apiRoutes)
app.use('/api/errors', errorRoutes)

app.get('/api/v1/status', (req, res) => {
  res.json({
    success: true,
    message: 'YouTube Music Player API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'YouTube Music Player API',
      version: '1.0.0',
      description: 'API for YouTube Music Player application'
    },
    servers: [
      {
        url: `http://localhost:${process.env.BACKEND_PORT || 3000}`,
        description: 'Development server'
      }
    ]
  },
  apis: ['./src/routes/*.ts']
}

const swaggerSpec = swaggerJsdoc(swaggerOptions)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// 404 處理器（必須在錯誤處理器之前）
app.use(notFoundHandler)

// 錯誤處理器（必須是最後一個中間件）
app.use(errorHandler)

export { app, prisma }