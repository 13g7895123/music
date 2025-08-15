import express from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '../middleware/auth.middleware'
import { asyncHandler } from '../middleware/error.middleware'
import { PlaylistSongService } from '../services/playlist-song.service'
import { AuthRequest } from '../middleware/auth.middleware'

const router = express.Router()
const prisma = new PrismaClient()
const playlistSongService = new PlaylistSongService(prisma)

/**
 * @swagger
 * components:
 *   schemas:
 *     PlaylistSong:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: PlaylistSong ID
 *         playlistId:
 *           type: integer
 *           description: Playlist ID
 *         songId:
 *           type: integer
 *           description: Song ID
 *         position:
 *           type: integer
 *           description: Position in playlist
 *         addedBy:
 *           type: integer
 *           description: User who added the song
 *         addedAt:
 *           type: string
 *           format: date-time
 *         song:
 *           $ref: '#/components/schemas/Song'
 *     
 *     Song:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         youtubeId:
 *           type: string
 *         title:
 *           type: string
 *         artist:
 *           type: string
 *         duration:
 *           type: integer
 *         thumbnailUrl:
 *           type: string
 *         channelName:
 *           type: string
 *         viewCount:
 *           type: integer
 *         publishedAt:
 *           type: string
 *           format: date-time
 *     
 *     AddSongRequest:
 *       type: object
 *       required:
 *         - songId
 *       properties:
 *         songId:
 *           type: integer
 *           description: ID of the song to add
 *         position:
 *           type: integer
 *           description: Position to insert the song (optional)
 *     
 *     ReorderRequest:
 *       type: object
 *       required:
 *         - songOrders
 *       properties:
 *         songOrders:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               songId:
 *                 type: integer
 *               position:
 *                 type: integer
 *     
 *     BatchAddRequest:
 *       type: object
 *       required:
 *         - songIds
 *       properties:
 *         songIds:
 *           type: array
 *           items:
 *             type: integer
 *           description: Array of song IDs to add
 */

/**
 * @swagger
 * /api/playlists/{playlistId}/songs:
 *   get:
 *     summary: Get songs in a playlist
 *     tags: [Playlist Songs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playlistId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Playlist ID
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
 *                     $ref: '#/components/schemas/PlaylistSong'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Playlist not found
 */
router.get('/:playlistId/songs', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const playlistId = parseInt(req.params.playlistId)

  if (isNaN(playlistId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid playlist ID',
        code: 'INVALID_PLAYLIST_ID'
      }
    })
  }

  const songs = await playlistSongService.getPlaylistSongs(playlistId, req.user!.id)

  res.json({
    success: true,
    data: songs
  })
}))

/**
 * @swagger
 * /api/playlists/{playlistId}/songs:
 *   post:
 *     summary: Add a song to playlist
 *     tags: [Playlist Songs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playlistId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Playlist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddSongRequest'
 *     responses:
 *       201:
 *         description: Song added successfully
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
 *                   $ref: '#/components/schemas/PlaylistSong'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Playlist not found
 *       409:
 *         description: Song already exists in playlist
 */
router.post('/:playlistId/songs', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const playlistId = parseInt(req.params.playlistId)
  const { songId, position } = req.body

  if (isNaN(playlistId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid playlist ID',
        code: 'INVALID_PLAYLIST_ID'
      }
    })
  }

  if (!songId || isNaN(parseInt(songId))) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Valid songId is required',
        code: 'INVALID_SONG_ID'
      }
    })
  }

  if (position && (isNaN(parseInt(position)) || position < 1)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Position must be a positive integer',
        code: 'INVALID_POSITION'
      }
    })
  }

  const playlistSong = await playlistSongService.addSongToPlaylist(playlistId, req.user!.id, {
    songId: parseInt(songId),
    position: position ? parseInt(position) : undefined
  })

  res.status(201).json({
    success: true,
    message: 'Song added to playlist successfully',
    data: playlistSong
  })
}))

/**
 * @swagger
 * /api/playlists/{playlistId}/songs/{songId}:
 *   delete:
 *     summary: Remove a song from playlist
 *     tags: [Playlist Songs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playlistId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Playlist ID
 *       - in: path
 *         name: songId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Song ID
 *     responses:
 *       200:
 *         description: Song removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Playlist or song not found
 */
router.delete('/:playlistId/songs/:songId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const playlistId = parseInt(req.params.playlistId)
  const songId = parseInt(req.params.songId)

  if (isNaN(playlistId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid playlist ID',
        code: 'INVALID_PLAYLIST_ID'
      }
    })
  }

  if (isNaN(songId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid song ID',
        code: 'INVALID_SONG_ID'
      }
    })
  }

  await playlistSongService.removeSongFromPlaylist(playlistId, songId, req.user!.id)

  res.json({
    success: true,
    message: 'Song removed from playlist successfully'
  })
}))

/**
 * @swagger
 * /api/playlists/{playlistId}/songs/reorder:
 *   put:
 *     summary: Reorder songs in playlist
 *     tags: [Playlist Songs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playlistId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Playlist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReorderRequest'
 *     responses:
 *       200:
 *         description: Songs reordered successfully
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PlaylistSong'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Playlist not found
 */
router.put('/:playlistId/songs/reorder', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const playlistId = parseInt(req.params.playlistId)
  const { songOrders } = req.body

  if (isNaN(playlistId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid playlist ID',
        code: 'INVALID_PLAYLIST_ID'
      }
    })
  }

  if (!Array.isArray(songOrders)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'songOrders must be an array',
        code: 'INVALID_SONG_ORDERS'
      }
    })
  }

  const updatedSongs = await playlistSongService.reorderPlaylistSongs(playlistId, req.user!.id, songOrders)

  res.json({
    success: true,
    message: 'Playlist songs reordered successfully',
    data: updatedSongs
  })
}))

/**
 * @swagger
 * /api/playlists/{playlistId}/songs/batch:
 *   post:
 *     summary: Batch add songs to playlist
 *     tags: [Playlist Songs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: playlistId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Playlist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BatchAddRequest'
 *     responses:
 *       201:
 *         description: Songs added successfully
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PlaylistSong'
 *                 skipped:
 *                   type: integer
 *                   description: Number of songs that were already in the playlist
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Playlist not found
 *       409:
 *         description: All songs already exist in playlist
 */
router.post('/:playlistId/songs/batch', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const playlistId = parseInt(req.params.playlistId)
  const { songIds } = req.body

  if (isNaN(playlistId)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid playlist ID',
        code: 'INVALID_PLAYLIST_ID'
      }
    })
  }

  if (!Array.isArray(songIds) || songIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'songIds must be a non-empty array',
        code: 'INVALID_SONG_IDS'
      }
    })
  }

  // Validate all songIds are numbers
  const invalidIds = songIds.filter(id => isNaN(parseInt(id)))
  if (invalidIds.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'All songIds must be valid integers',
        code: 'INVALID_SONG_IDS'
      }
    })
  }

  const result = await playlistSongService.batchAddSongs(playlistId, req.user!.id, songIds.map(id => parseInt(id)))

  res.status(201).json({
    success: true,
    message: `${result.addedSongs.length} songs added to playlist`,
    data: result.addedSongs,
    skipped: result.skippedCount
  })
}))

export default router