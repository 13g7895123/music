import express from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '../middleware/auth.middleware'
import { asyncHandler, AppError } from '../middleware/error.middleware'
import { YouTubeService } from '../services/youtube.service'
import { AuthRequest } from '../middleware/auth.middleware'

const router = express.Router()
const prisma = new PrismaClient()
const youtubeService = new YouTubeService(prisma)

/**
 * @swagger
 * components:
 *   schemas:
 *     YouTubeVideoInfo:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: YouTube video ID
 *         title:
 *           type: string
 *           description: Video title
 *         artist:
 *           type: string
 *           description: Artist name (parsed from title)
 *         duration:
 *           type: integer
 *           description: Duration in seconds
 *         thumbnailUrl:
 *           type: string
 *           description: Thumbnail image URL
 *         viewCount:
 *           type: integer
 *           description: View count
 *         publishedAt:
 *           type: string
 *           format: date-time
 *           description: Publication date
 *     
 *     ParseUrlRequest:
 *       type: object
 *       required:
 *         - url
 *       properties:
 *         url:
 *           type: string
 *           description: YouTube URL to parse
 *     
 *     ParseBatchRequest:
 *       type: object
 *       required:
 *         - urls
 *       properties:
 *         urls:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 10
 *           description: Array of YouTube URLs to parse
 *     
 *     ParseBatchResponse:
 *       type: object
 *       properties:
 *         successful:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/YouTubeVideoInfo'
 *         failed:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *               error:
 *                 type: string
 *         total:
 *           type: integer
 *         successCount:
 *           type: integer
 *         failCount:
 *           type: integer
 *     
 *     ValidateUrlResponse:
 *       type: object
 *       properties:
 *         isValid:
 *           type: boolean
 *         videoId:
 *           type: string
 *           nullable: true
 *         url:
 *           type: string
 *         errors:
 *           type: array
 *           items:
 *             type: string
 */

/**
 * @swagger
 * /api/youtube/parse:
 *   post:
 *     summary: Parse a single YouTube URL
 *     tags: [YouTube]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ParseUrlRequest'
 *     responses:
 *       200:
 *         description: URL parsed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/YouTubeVideoInfo'
 *       400:
 *         description: Invalid URL
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Video not found
 *       403:
 *         description: Video is private or restricted
 *       408:
 *         description: Request timeout
 *       503:
 *         description: Network error
 */
router.post('/parse', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { url } = req.body

  if (!url) {
    throw new AppError('YouTube URL is required', 400, 'URL_REQUIRED')
  }

  if (typeof url !== 'string') {
    throw new AppError('URL must be a string', 400, 'INVALID_URL_TYPE')
  }

  const videoInfo = await youtubeService.parseYouTubeUrl(url)

  res.json({
    success: true,
    message: 'YouTube URL parsed successfully',
    data: videoInfo
  })
}))

/**
 * @swagger
 * /api/youtube/parse-batch:
 *   post:
 *     summary: Parse multiple YouTube URLs in batch
 *     tags: [YouTube]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ParseBatchRequest'
 *     responses:
 *       200:
 *         description: URLs processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/ParseBatchResponse'
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/parse-batch', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { urls } = req.body

  if (!Array.isArray(urls)) {
    throw new AppError('URLs must be an array', 400, 'INVALID_URLS_TYPE')
  }

  if (urls.length === 0) {
    throw new AppError('URLs array cannot be empty', 400, 'EMPTY_URLS_ARRAY')
  }

  if (urls.length > 10) {
    throw new AppError('Maximum 10 URLs allowed per batch', 400, 'TOO_MANY_URLS')
  }

  // Validate all URLs are strings
  const invalidUrls = urls.filter(url => typeof url !== 'string')
  if (invalidUrls.length > 0) {
    throw new AppError('All URLs must be strings', 400, 'INVALID_URL_TYPES')
  }

  const result = await youtubeService.parseMultipleUrls(urls)

  res.json({
    success: true,
    message: `Processed ${urls.length} URLs: ${result.successful.length} successful, ${result.failed.length} failed`,
    data: {
      successful: result.successful,
      failed: result.failed,
      total: urls.length,
      successCount: result.successful.length,
      failCount: result.failed.length
    }
  })
}))

/**
 * @swagger
 * /api/youtube/validate:
 *   post:
 *     summary: Validate YouTube URL format
 *     tags: [YouTube]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ParseUrlRequest'
 *     responses:
 *       200:
 *         description: URL validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ValidateUrlResponse'
 *       401:
 *         description: Unauthorized
 */
router.post('/validate', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { url } = req.body

  if (!url) {
    return res.json({
      success: true,
      data: {
        isValid: false,
        videoId: null,
        url: '',
        errors: ['URL is required']
      }
    })
  }

  const result = youtubeService.validateYouTubeUrl(url)

  res.json({
    success: true,
    data: result
  })
}))

/**
 * @swagger
 * /api/youtube/search:
 *   get:
 *     summary: Search cached songs
 *     tags: [YouTube]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/YouTubeVideoInfo'
 *       400:
 *         description: Invalid search query
 *       401:
 *         description: Unauthorized
 */
router.get('/search', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const query = req.query.q as string
  const limit = parseInt(req.query.limit as string) || 20

  if (!query) {
    throw new AppError('Search query is required', 400, 'QUERY_REQUIRED')
  }

  if (typeof query !== 'string') {
    throw new AppError('Search query must be a string', 400, 'INVALID_QUERY_TYPE')
  }

  if (query.trim().length < 2) {
    throw new AppError('Search query must be at least 2 characters long', 400, 'QUERY_TOO_SHORT')
  }

  if (limit < 1 || limit > 50) {
    throw new AppError('Limit must be between 1 and 50', 400, 'INVALID_LIMIT')
  }

  const results = await youtubeService.searchSongs(query.trim(), limit)

  res.json({
    success: true,
    data: results
  })
}))

/**
 * @swagger
 * /api/youtube/extract-id:
 *   post:
 *     summary: Extract video ID from YouTube URL
 *     tags: [YouTube]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ParseUrlRequest'
 *     responses:
 *       200:
 *         description: Video ID extracted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     videoId:
 *                       type: string
 *                       nullable: true
 *                     url:
 *                       type: string
 *       401:
 *         description: Unauthorized
 */
router.post('/extract-id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { url } = req.body

  if (!url) {
    return res.json({
      success: true,
      data: {
        videoId: null,
        url: ''
      }
    })
  }

  const videoId = YouTubeService.extractVideoId(url)

  res.json({
    success: true,
    data: {
      videoId,
      url
    }
  })
}))

export default router