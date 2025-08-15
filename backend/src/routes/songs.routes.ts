import express from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '../middleware/auth.middleware'
import { asyncHandler } from '../middleware/error.middleware'
import { SongService } from '../services/song.service'
import { AuthRequest } from '../middleware/auth.middleware'

const router = express.Router()
const prisma = new PrismaClient()
const songService = new SongService(prisma)

/**
 * @swagger
 * components:
 *   schemas:
 *     Song:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Song ID
 *         youtubeId:
 *           type: string
 *           description: YouTube video ID
 *         title:
 *           type: string
 *           description: Song title
 *         artist:
 *           type: string
 *           nullable: true
 *           description: Artist name
 *         duration:
 *           type: integer
 *           nullable: true
 *           description: Duration in seconds
 *         thumbnailUrl:
 *           type: string
 *           nullable: true
 *           description: Thumbnail image URL
 *         channelName:
 *           type: string
 *           nullable: true
 *           description: YouTube channel name
 *         viewCount:
 *           type: integer
 *           nullable: true
 *           description: View count
 *         publishedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         isAvailable:
 *           type: boolean
 *           description: Whether the song is available
 *         lastChecked:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     CreateSongRequest:
 *       type: object
 *       required:
 *         - youtubeId
 *         - title
 *       properties:
 *         youtubeId:
 *           type: string
 *           description: YouTube video ID
 *         title:
 *           type: string
 *           description: Song title
 *         artist:
 *           type: string
 *           description: Artist name
 *         duration:
 *           type: integer
 *           description: Duration in seconds
 *         thumbnailUrl:
 *           type: string
 *           description: Thumbnail image URL
 *         channelName:
 *           type: string
 *           description: YouTube channel name
 *         viewCount:
 *           type: integer
 *           description: View count
 *         publishedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/songs:
 *   get:
 *     summary: Get songs with pagination and search
 *     tags: [Songs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search songs by title, artist, or channel
 *     responses:
 *       200:
 *         description: Songs retrieved successfully
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
 *                     $ref: '#/components/schemas/Song'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const search = req.query.search as string

  const result = await songService.getSongs({
    page,
    limit,
    search
  })

  res.json({
    success: true,
    data: result.songs,
    pagination: result.pagination
  })
}))

/**
 * @swagger
 * /api/songs:
 *   post:
 *     summary: Create a new song
 *     tags: [Songs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSongRequest'
 *     responses:
 *       201:
 *         description: Song created successfully
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
 *                   $ref: '#/components/schemas/Song'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Song already exists
 */
router.post('/', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { youtubeId, title, artist, duration, thumbnailUrl, channelName, viewCount, publishedAt } = req.body

  if (!youtubeId || !title) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'youtubeId and title are required',
        code: 'VALIDATION_ERROR'
      }
    })
  }

  const song = await songService.createSong({
    youtubeId,
    title,
    artist,
    duration,
    thumbnailUrl,
    channelName,
    viewCount: viewCount ? BigInt(viewCount) : undefined,
    publishedAt: publishedAt ? new Date(publishedAt) : undefined
  })

  res.status(201).json({
    success: true,
    message: 'Song created successfully',
    data: song
  })
}))

/**
 * @swagger
 * /api/songs/{id}:
 *   get:
 *     summary: Get song by ID
 *     tags: [Songs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Song ID
 *     responses:
 *       200:
 *         description: Song retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Song'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Song not found
 */
router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const songId = parseInt(req.params.id)

  if (isNaN(songId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid song ID',
        code: 'INVALID_SONG_ID'
      }
    })
  }

  const song = await songService.getSongById(songId)

  if (!song) {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Song not found',
        code: 'SONG_NOT_FOUND'
      }
    })
  }

  res.json({
    success: true,
    data: song
  })
}))

export default router