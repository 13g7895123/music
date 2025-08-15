# Story 8: 播放清單後端API

## 📋 基本資訊
- **Story ID**: YMP-008
- **Epic**: 播放清單管理
- **優先級**: Must Have (P0)
- **預估點數**: 8 points
- **預估時間**: 2 天
- **依賴關係**: Story 3, Story 4
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 已登入用戶  
**我希望** 能夠建立、讀取、更新和刪除我的播放清單  
**以便** 組織和管理我的音樂收藏

## 📝 詳細需求

### 核心功能需求
1. **播放清單CRUD**: 完整的播放清單管理功能
2. **權限控制**: 用戶只能管理自己的播放清單
3. **資料驗證**: 完整的輸入驗證和錯誤處理
4. **分頁查詢**: 支援大量播放清單的分頁查詢
5. **搜尋功能**: 播放清單名稱搜尋

### 技術規格

**API端點實作**:
```typescript
// backend/src/routes/playlists.ts
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { validatePlaylist } from '../middleware/validation.middleware'
import { AppError } from '../middleware/error.middleware'
import { prisma } from '../app'

const router = Router()

// 所有路由都需要認證
router.use(authMiddleware)

// 獲取用戶的播放清單列表
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const search = req.query.search as string
    const skip = (page - 1) * limit

    const where: any = { userId }
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive'
      }
    }

    const [playlists, total] = await Promise.all([
      prisma.playlist.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { songs: true }
          }
        }
      }),
      prisma.playlist.count({ where })
    ])

    res.json({
      success: true,
      data: playlists,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    next(error)
  }
})

// 建立新播放清單
router.post('/', validatePlaylist, async (req, res, next) => {
  try {
    const userId = req.user.id
    const { name, description, isPublic = false } = req.body

    // 檢查重複名稱
    const existingPlaylist = await prisma.playlist.findFirst({
      where: { userId, name }
    })

    if (existingPlaylist) {
      throw new AppError('Playlist name already exists', 409)
    }

    const playlist = await prisma.playlist.create({
      data: {
        userId,
        name,
        description,
        isPublic
      },
      include: {
        _count: {
          select: { songs: true }
        }
      }
    })

    res.status(201).json({
      success: true,
      message: 'Playlist created successfully',
      data: playlist
    })
  } catch (error) {
    next(error)
  }
})

// 獲取特定播放清單詳情
router.get('/:id', async (req, res, next) => {
  try {
    const playlistId = parseInt(req.params.id)
    const userId = req.user.id

    if (isNaN(playlistId)) {
      throw new AppError('Invalid playlist ID', 400)
    }

    const playlist = await prisma.playlist.findFirst({
      where: { 
        id: playlistId,
        OR: [
          { userId },
          { isPublic: true }
        ]
      },
      include: {
        songs: {
          include: {
            song: true
          },
          orderBy: { position: 'asc' }
        },
        user: {
          select: { id: true, nickname: true }
        },
        _count: {
          select: { songs: true }
        }
      }
    })

    if (!playlist) {
      throw new AppError('Playlist not found', 404)
    }

    res.json({
      success: true,
      data: playlist
    })
  } catch (error) {
    next(error)
  }
})

// 更新播放清單
router.put('/:id', validatePlaylist, async (req, res, next) => {
  try {
    const playlistId = parseInt(req.params.id)
    const userId = req.user.id
    const { name, description, isPublic } = req.body

    if (isNaN(playlistId)) {
      throw new AppError('Invalid playlist ID', 400)
    }

    // 檢查播放清單存在且屬於當前用戶
    const existingPlaylist = await prisma.playlist.findFirst({
      where: { id: playlistId, userId }
    })

    if (!existingPlaylist) {
      throw new AppError('Playlist not found', 404)
    }

    // 檢查名稱重複（除了當前播放清單）
    if (name && name !== existingPlaylist.name) {
      const duplicateName = await prisma.playlist.findFirst({
        where: { 
          userId, 
          name,
          id: { not: playlistId }
        }
      })

      if (duplicateName) {
        throw new AppError('Playlist name already exists', 409)
      }
    }

    const updatedPlaylist = await prisma.playlist.update({
      where: { id: playlistId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic }),
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: { songs: true }
        }
      }
    })

    res.json({
      success: true,
      message: 'Playlist updated successfully',
      data: updatedPlaylist
    })
  } catch (error) {
    next(error)
  }
})

// 刪除播放清單
router.delete('/:id', async (req, res, next) => {
  try {
    const playlistId = parseInt(req.params.id)
    const userId = req.user.id

    if (isNaN(playlistId)) {
      throw new AppError('Invalid playlist ID', 400)
    }

    // 檢查播放清單存在且屬於當前用戶
    const playlist = await prisma.playlist.findFirst({
      where: { id: playlistId, userId }
    })

    if (!playlist) {
      throw new AppError('Playlist not found', 404)
    }

    // 刪除播放清單（級聯刪除歌曲關聯）
    await prisma.playlist.delete({
      where: { id: playlistId }
    })

    res.json({
      success: true,
      message: 'Playlist deleted successfully'
    })
  } catch (error) {
    next(error)
  }
})

export default router
```

**驗證中介軟體**:
```typescript
// backend/src/middleware/validation.middleware.ts
import { Request, Response, NextFunction } from 'express'
import { AppError } from './error.middleware'

export const validatePlaylist = (req: Request, res: Response, next: NextFunction) => {
  const { name, description, isPublic } = req.body

  if (!name || typeof name !== 'string') {
    throw new AppError('Playlist name is required and must be a string', 400)
  }

  if (name.trim().length < 1 || name.trim().length > 100) {
    throw new AppError('Playlist name must be between 1 and 100 characters', 400)
  }

  if (description && typeof description !== 'string') {
    throw new AppError('Description must be a string', 400)
  }

  if (description && description.length > 500) {
    throw new AppError('Description must not exceed 500 characters', 400)
  }

  if (isPublic !== undefined && typeof isPublic !== 'boolean') {
    throw new AppError('isPublic must be a boolean', 400)
  }

  // 清理輸入
  req.body.name = name.trim()
  if (description) {
    req.body.description = description.trim()
  }

  next()
}
```

**資料庫Schema更新**:
```prisma
// backend/prisma/schema.prisma
model Playlist {
  id          Int      @id @default(autoincrement())
  userId      Int      @map("user_id")
  name        String   @db.VarChar(100)
  description String?  @db.Text
  isPublic    Boolean  @default(false) @map("is_public")
  coverUrl    String?  @map("cover_url") @db.VarChar(500)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user  User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  songs PlaylistSong[]
  playHistory PlayHistory[]

  @@unique([userId, name])
  @@map("playlists")
}

model PlaylistSong {
  id         Int      @id @default(autoincrement())
  playlistId Int      @map("playlist_id")
  songId     Int      @map("song_id")
  position   Int
  addedAt    DateTime @default(now()) @map("added_at")
  addedBy    Int?     @map("added_by")

  playlist Playlist @relation(fields: [playlistId], references: [id], onDelete: Cascade)
  song     Song     @relation(fields: [songId], references: [id], onDelete: Cascade)
  user     User?    @relation(fields: [addedBy], references: [id], onDelete: SetNull)

  @@unique([playlistId, songId])
  @@map("playlist_songs")
}
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `backend/src/routes/playlists.ts` - 播放清單路由
- `backend/src/middleware/validation.middleware.ts` - 驗證中介軟體
- `backend/src/services/playlist.service.ts` - 播放清單業務邏輯
- `backend/tests/routes/playlists.test.ts` - API測試

**更新檔案**:
- `backend/src/app.ts` - 註冊播放清單路由
- `backend/prisma/schema.prisma` - 更新資料模型

## ✅ 驗收條件

### 功能驗收
- [ ] 用戶可以建立新的播放清單
- [ ] 用戶可以查看自己的播放清單列表
- [ ] 用戶可以查看特定播放清單詳情
- [ ] 用戶可以更新播放清單資訊
- [ ] 用戶可以刪除自己的播放清單

### 安全性驗收
- [ ] 用戶只能管理自己的播放清單
- [ ] 公開播放清單可被其他用戶查看
- [ ] 所有API都需要有效的JWT token
- [ ] 輸入驗證阻止惡意資料

### API驗收
- [ ] 所有端點返回正確的HTTP狀態碼
- [ ] 回應格式符合API規範
- [ ] 分頁功能正常運作
- [ ] 搜尋功能正常運作

## 🚀 實作指引

### Step 1: 更新資料庫Schema
```bash
cd backend
npx prisma migrate dev --name add-playlists
```

### Step 2: 實作路由和中介軟體
按照技術規格建立相關檔案

### Step 3: 註冊路由
在app.ts中添加播放清單路由

### Step 4: 測試API
```bash
npm run test:playlists
```

## 📊 預期成果
- ✅ 完整的播放清單CRUD API
- ✅ 安全的權限控制
- ✅ 完整的輸入驗證
- ✅ 分頁和搜尋功能
- ✅ 完善的錯誤處理