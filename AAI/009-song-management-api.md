# Story 9: 歌曲管理API

## 📋 基本資訊
- **Story ID**: YMP-009
- **Epic**: 播放清單管理
- **優先級**: Must Have (P0)
- **預估點數**: 6 points
- **預估時間**: 1-2 天
- **依賴關係**: Story 8
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 已登入用戶  
**我希望** 能夠管理播放清單中的歌曲  
**以便** 添加、移除和重新排序我的音樂

## 📝 詳細需求

### 核心功能需求
1. **歌曲添加**: 添加歌曲到播放清單
2. **歌曲移除**: 從播放清單移除歌曲
3. **順序調整**: 重新排序播放清單中的歌曲
4. **歌曲搜尋**: 在播放清單中搜尋歌曲
5. **批量操作**: 批量添加或移除歌曲

### 技術規格

**API端點實作**:
```typescript
// backend/src/routes/playlist-songs.ts
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { AppError } from '../middleware/error.middleware'
import { prisma } from '../app'

const router = Router()
router.use(authMiddleware)

// 添加歌曲到播放清單
router.post('/:playlistId/songs', async (req, res, next) => {
  try {
    const playlistId = parseInt(req.params.playlistId)
    const userId = req.user.id
    const { songId, position } = req.body

    if (isNaN(playlistId) || isNaN(songId)) {
      throw new AppError('Invalid playlist or song ID', 400)
    }

    // 檢查播放清單權限
    const playlist = await prisma.playlist.findFirst({
      where: { id: playlistId, userId }
    })

    if (!playlist) {
      throw new AppError('Playlist not found', 404)
    }

    // 檢查歌曲是否已存在
    const existingSong = await prisma.playlistSong.findUnique({
      where: {
        playlistId_songId: {
          playlistId,
          songId
        }
      }
    })

    if (existingSong) {
      throw new AppError('Song already exists in playlist', 409)
    }

    // 確定插入位置
    let insertPosition = position
    if (!insertPosition) {
      const lastSong = await prisma.playlistSong.findFirst({
        where: { playlistId },
        orderBy: { position: 'desc' }
      })
      insertPosition = (lastSong?.position || 0) + 1
    }

    // 如果指定位置，需要調整其他歌曲位置
    if (position) {
      await prisma.playlistSong.updateMany({
        where: {
          playlistId,
          position: { gte: position }
        },
        data: {
          position: { increment: 1 }
        }
      })
    }

    const playlistSong = await prisma.playlistSong.create({
      data: {
        playlistId,
        songId,
        position: insertPosition,
        addedBy: userId
      },
      include: {
        song: true
      }
    })

    res.status(201).json({
      success: true,
      message: 'Song added to playlist successfully',
      data: playlistSong
    })
  } catch (error) {
    next(error)
  }
})

// 從播放清單移除歌曲
router.delete('/:playlistId/songs/:songId', async (req, res, next) => {
  try {
    const playlistId = parseInt(req.params.playlistId)
    const songId = parseInt(req.params.songId)
    const userId = req.user.id

    if (isNaN(playlistId) || isNaN(songId)) {
      throw new AppError('Invalid playlist or song ID', 400)
    }

    // 檢查播放清單權限
    const playlist = await prisma.playlist.findFirst({
      where: { id: playlistId, userId }
    })

    if (!playlist) {
      throw new AppError('Playlist not found', 404)
    }

    // 檢查歌曲是否存在於播放清單
    const playlistSong = await prisma.playlistSong.findUnique({
      where: {
        playlistId_songId: {
          playlistId,
          songId
        }
      }
    })

    if (!playlistSong) {
      throw new AppError('Song not found in playlist', 404)
    }

    // 刪除歌曲
    await prisma.playlistSong.delete({
      where: {
        playlistId_songId: {
          playlistId,
          songId
        }
      }
    })

    // 調整後續歌曲位置
    await prisma.playlistSong.updateMany({
      where: {
        playlistId,
        position: { gt: playlistSong.position }
      },
      data: {
        position: { decrement: 1 }
      }
    })

    res.json({
      success: true,
      message: 'Song removed from playlist successfully'
    })
  } catch (error) {
    next(error)
  }
})

// 重新排序播放清單歌曲
router.put('/:playlistId/songs/reorder', async (req, res, next) => {
  try {
    const playlistId = parseInt(req.params.playlistId)
    const userId = req.user.id
    const { songOrders } = req.body // [{ songId, position }]

    if (isNaN(playlistId)) {
      throw new AppError('Invalid playlist ID', 400)
    }

    if (!Array.isArray(songOrders)) {
      throw new AppError('songOrders must be an array', 400)
    }

    // 檢查播放清單權限
    const playlist = await prisma.playlist.findFirst({
      where: { id: playlistId, userId }
    })

    if (!playlist) {
      throw new AppError('Playlist not found', 404)
    }

    // 驗證所有歌曲都屬於該播放清單
    const songIds = songOrders.map(order => order.songId)
    const existingSongs = await prisma.playlistSong.findMany({
      where: {
        playlistId,
        songId: { in: songIds }
      }
    })

    if (existingSongs.length !== songIds.length) {
      throw new AppError('Some songs do not exist in the playlist', 400)
    }

    // 使用事務更新所有位置
    await prisma.$transaction(
      songOrders.map(({ songId, position }) =>
        prisma.playlistSong.update({
          where: {
            playlistId_songId: {
              playlistId,
              songId
            }
          },
          data: { position }
        })
      )
    )

    const updatedSongs = await prisma.playlistSong.findMany({
      where: { playlistId },
      include: { song: true },
      orderBy: { position: 'asc' }
    })

    res.json({
      success: true,
      message: 'Playlist songs reordered successfully',
      data: updatedSongs
    })
  } catch (error) {
    next(error)
  }
})

// 批量添加歌曲
router.post('/:playlistId/songs/batch', async (req, res, next) => {
  try {
    const playlistId = parseInt(req.params.playlistId)
    const userId = req.user.id
    const { songIds } = req.body

    if (isNaN(playlistId)) {
      throw new AppError('Invalid playlist ID', 400)
    }

    if (!Array.isArray(songIds) || songIds.length === 0) {
      throw new AppError('songIds must be a non-empty array', 400)
    }

    // 檢查播放清單權限
    const playlist = await prisma.playlist.findFirst({
      where: { id: playlistId, userId }
    })

    if (!playlist) {
      throw new AppError('Playlist not found', 404)
    }

    // 檢查哪些歌曲已經存在
    const existingSongs = await prisma.playlistSong.findMany({
      where: {
        playlistId,
        songId: { in: songIds }
      },
      select: { songId: true }
    })

    const existingSongIds = existingSongs.map(s => s.songId)
    const newSongIds = songIds.filter(id => !existingSongIds.includes(id))

    if (newSongIds.length === 0) {
      throw new AppError('All songs already exist in playlist', 409)
    }

    // 獲取當前最大位置
    const lastSong = await prisma.playlistSong.findFirst({
      where: { playlistId },
      orderBy: { position: 'desc' }
    })

    let currentPosition = (lastSong?.position || 0) + 1

    // 批量插入新歌曲
    const playlistSongs = newSongIds.map(songId => ({
      playlistId,
      songId,
      position: currentPosition++,
      addedBy: userId
    }))

    await prisma.playlistSong.createMany({
      data: playlistSongs
    })

    const addedSongs = await prisma.playlistSong.findMany({
      where: {
        playlistId,
        songId: { in: newSongIds }
      },
      include: { song: true },
      orderBy: { position: 'asc' }
    })

    res.status(201).json({
      success: true,
      message: `${newSongIds.length} songs added to playlist`,
      data: addedSongs,
      skipped: existingSongIds.length
    })
  } catch (error) {
    next(error)
  }
})

export default router
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `backend/src/routes/playlist-songs.ts` - 播放清單歌曲管理路由
- `backend/src/services/playlist-song.service.ts` - 歌曲管理業務邏輯
- `backend/tests/routes/playlist-songs.test.ts` - API測試

**更新檔案**:
- `backend/src/app.ts` - 註冊歌曲管理路由

## ✅ 驗收條件

### 功能驗收
- [ ] 可以添加歌曲到播放清單
- [ ] 可以從播放清單移除歌曲
- [ ] 可以重新排序播放清單中的歌曲
- [ ] 可以批量添加歌曲
- [ ] 位置調整後歌曲順序正確

### 安全性驗收
- [ ] 只有播放清單擁有者可以管理歌曲
- [ ] 輸入驗證防止無效操作
- [ ] 事務確保資料一致性

### API驗收
- [ ] 所有端點返回正確的HTTP狀態碼
- [ ] 重複添加歌曲有適當錯誤處理
- [ ] 批量操作效能良好

## 🚀 實作指引

### Step 1: 實作歌曲管理路由
按照技術規格建立playlist-songs.ts

### Step 2: 註冊路由
在app.ts中添加歌曲管理路由

### Step 3: 測試功能
測試所有歌曲管理操作

## 📊 預期成果
- ✅ 完整的歌曲管理API
- ✅ 安全的權限控制
- ✅ 高效的批量操作
- ✅ 準確的位置管理
- ✅ 完善的錯誤處理