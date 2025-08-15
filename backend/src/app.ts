import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { PrismaClient } from '@prisma/client'
import swaggerUi from 'swagger-ui-express'
import swaggerJsdoc from 'swagger-jsdoc'
import { errorHandler } from './middleware/error.middleware'
import { logger } from './utils/logger'

const app = express()
const prisma = new PrismaClient()

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}))

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim())
    }
  }
}))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
})
app.use('/api/', limiter)

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString()
    })
  }
})

// API 路由
import apiRoutes from './routes'
app.use('/api', apiRoutes)

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

app.use(errorHandler)

export { app, prisma }