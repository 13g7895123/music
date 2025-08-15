import express from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '../middleware/auth.middleware'
import { validatePlaylist, validatePlaylistUpdate } from '../middleware/validation.middleware'
import { asyncHandler } from '../middleware/error.middleware'
import { PlaylistService } from '../services/playlist.service'
import { AuthRequest } from '../middleware/auth.middleware'
import playlistSongsRoutes from './playlist-songs.routes'

const router = express.Router()
const prisma = new PrismaClient()
const playlistService = new PlaylistService(prisma)

/**
 * @swagger
 * components:
 *   schemas:
 *     Playlist:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Playlist ID
 *         userId:
 *           type: integer
 *           description: Owner user ID
 *         name:
 *           type: string
 *           description: Playlist name
 *         description:
 *           type: string
 *           nullable: true
 *           description: Playlist description
 *         isPublic:
 *           type: boolean
 *           description: Whether playlist is public
 *         coverUrl:
 *           type: string
 *           nullable: true
 *           description: Playlist cover image URL
 *         totalDuration:
 *           type: integer
 *           description: Total duration in seconds
 *         songCount:
 *           type: integer
 *           description: Number of songs
 *         playCount:
 *           type: integer
 *           description: Number of times played
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         _count:
 *           type: object
 *           properties:
 *             songs:
 *               type: integer
 *     
 *     CreatePlaylistRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: Playlist name
 *         description:
 *           type: string
 *           maxLength: 500
 *           description: Playlist description
 *         isPublic:
 *           type: boolean
 *           default: false
 *           description: Whether playlist should be public
 *     
 *     UpdatePlaylistRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: Playlist name
 *         description:
 *           type: string
 *           maxLength: 500
 *           nullable: true
 *           description: Playlist description
 *         isPublic:
 *           type: boolean
 *           description: Whether playlist should be public
 */

/**
 * @swagger
 * /api/playlists:
 *   get:
 *     summary: Get user's playlists
 *     tags: [Playlists]
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
 *         description: Search playlists by name
 *     responses:
 *       200:
 *         description: Playlists retrieved successfully
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
 *                     $ref: '#/components/schemas/Playlist'
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

  const result = await playlistService.getUserPlaylists(req.user!.id, {
    page,
    limit,
    search
  })

  res.json({
    success: true,
    data: result.playlists,
    pagination: result.pagination
  })
}))

/**
 * @swagger
 * /api/playlists:
 *   post:
 *     summary: Create a new playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePlaylistRequest'
 *     responses:
 *       201:
 *         description: Playlist created successfully
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
 *                   $ref: '#/components/schemas/Playlist'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Playlist name already exists
 */
router.post('/', authenticate, validatePlaylist, asyncHandler(async (req: AuthRequest, res) => {
  const { name, description, isPublic } = req.body

  const playlist = await playlistService.createPlaylist(req.user!.id, {
    name,
    description,
    isPublic
  })

  res.status(201).json({
    success: true,
    message: 'Playlist created successfully',
    data: playlist
  })
}))

/**
 * @swagger
 * /api/playlists/{id}:
 *   get:
 *     summary: Get playlist details
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Playlist ID
 *     responses:
 *       200:
 *         description: Playlist retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Playlist'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Playlist not found
 */
router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const playlistId = parseInt(req.params.id)

  if (isNaN(playlistId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid playlist ID',
        code: 'INVALID_PLAYLIST_ID'
      }
    })
  }

  const playlist = await playlistService.getPlaylistById(playlistId, req.user!.id)

  res.json({
    success: true,
    data: playlist
  })
}))

/**
 * @swagger
 * /api/playlists/{id}:
 *   put:
 *     summary: Update playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Playlist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePlaylistRequest'
 *     responses:
 *       200:
 *         description: Playlist updated successfully
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
 *                   $ref: '#/components/schemas/Playlist'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Playlist not found
 *       409:
 *         description: Playlist name already exists
 */
router.put('/:id', authenticate, validatePlaylistUpdate, asyncHandler(async (req: AuthRequest, res) => {
  const playlistId = parseInt(req.params.id)

  if (isNaN(playlistId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid playlist ID',
        code: 'INVALID_PLAYLIST_ID'
      }
    })
  }

  const { name, description, isPublic } = req.body

  const playlist = await playlistService.updatePlaylist(playlistId, req.user!.id, {
    name,
    description,
    isPublic
  })

  res.json({
    success: true,
    message: 'Playlist updated successfully',
    data: playlist
  })
}))

/**
 * @swagger
 * /api/playlists/{id}:
 *   delete:
 *     summary: Delete playlist
 *     tags: [Playlists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Playlist ID
 *     responses:
 *       200:
 *         description: Playlist deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Playlist not found
 */
router.delete('/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const playlistId = parseInt(req.params.id)

  if (isNaN(playlistId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid playlist ID',
        code: 'INVALID_PLAYLIST_ID'
      }
    })
  }

  await playlistService.deletePlaylist(playlistId, req.user!.id)

  res.json({
    success: true,
    message: 'Playlist deleted successfully'
  })
}))

// Mount playlist songs routes
router.use('/', playlistSongsRoutes)

export default router