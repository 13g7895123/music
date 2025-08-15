# Story 2: 資料庫架構完整設計

## 📋 基本資訊
- **Story ID**: YMP-002
- **Epic**: 基礎設施建置
- **優先級**: Must Have (P0)
- **預估點數**: 13 points
- **預估時間**: 2-3 天
- **依賴關係**: Story 1 (開發環境建置)
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 系統架構師  
**我希望** 有完整且優化的資料庫設計  
**以便** 支援所有音樂播放器功能，並確保數據完整性和查詢效能

## 📝 詳細需求

### 核心功能需求
1. **用戶管理**: 用戶註冊、登入、個人資料
2. **播放清單管理**: 建立、編輯、分享播放清單
3. **歌曲管理**: YouTube歌曲資訊儲存
4. **播放記錄**: 使用者播放歷史追蹤
5. **會話管理**: 用戶登入會話儲存

### 資料庫設計

**PostgreSQL 主要資料表**:

```sql
-- 用戶表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    avatar_url VARCHAR(500),
    preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_nickname_check CHECK (length(nickname) >= 2 AND length(nickname) <= 50)
);

-- 播放清單表
CREATE TABLE playlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cover_url VARCHAR(500),
    is_public BOOLEAN DEFAULT false,
    is_collaborative BOOLEAN DEFAULT false,
    total_duration INTEGER DEFAULT 0,
    song_count INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT playlists_name_check CHECK (length(name) >= 1 AND length(name) <= 100),
    CONSTRAINT playlists_total_duration_check CHECK (total_duration >= 0),
    CONSTRAINT playlists_song_count_check CHECK (song_count >= 0)
);

-- 歌曲表
CREATE TABLE songs (
    id SERIAL PRIMARY KEY,
    youtube_id VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    artist VARCHAR(200),
    duration INTEGER,
    thumbnail_url VARCHAR(500),
    channel_name VARCHAR(200),
    view_count BIGINT,
    published_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    is_available BOOLEAN DEFAULT true,
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT songs_youtube_id_check CHECK (length(youtube_id) = 11),
    CONSTRAINT songs_title_check CHECK (length(title) >= 1),
    CONSTRAINT songs_duration_check CHECK (duration > 0)
);

-- 播放清單歌曲關聯表
CREATE TABLE playlist_songs (
    id SERIAL PRIMARY KEY,
    playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_by INTEGER REFERENCES users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(playlist_id, position),
    UNIQUE(playlist_id, song_id),
    CONSTRAINT playlist_songs_position_check CHECK (position > 0)
);

-- 播放記錄表
CREATE TABLE play_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    playlist_id INTEGER REFERENCES playlists(id) ON DELETE SET NULL,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    play_duration INTEGER,
    completed BOOLEAN DEFAULT false,
    
    CONSTRAINT play_history_play_duration_check CHECK (play_duration >= 0)
);

-- 會話表 (PostgreSQL)
CREATE TABLE sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT sessions_expires_check CHECK (expires_at > created_at)
);
```

**索引設計**:
```sql
-- 用戶相關索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- 播放清單相關索引
CREATE INDEX idx_playlists_user_id ON playlists(user_id);
CREATE INDEX idx_playlists_public ON playlists(is_public);
CREATE INDEX idx_playlists_created_at ON playlists(created_at);

-- 歌曲相關索引
CREATE INDEX idx_songs_youtube_id ON songs(youtube_id);
CREATE INDEX idx_songs_available ON songs(is_available);
CREATE INDEX idx_songs_title_gin ON songs USING GIN(to_tsvector('english', title));
CREATE INDEX idx_songs_artist_gin ON songs USING GIN(to_tsvector('english', artist));

-- 播放清單歌曲索引
CREATE INDEX idx_playlist_songs_playlist_id ON playlist_songs(playlist_id);
CREATE INDEX idx_playlist_songs_position ON playlist_songs(playlist_id, position);
CREATE INDEX idx_playlist_songs_song_id ON playlist_songs(song_id);

-- 播放記錄索引
CREATE INDEX idx_play_history_user_id ON play_history(user_id);
CREATE INDEX idx_play_history_played_at ON play_history(played_at);
CREATE INDEX idx_play_history_song_id ON play_history(song_id);

-- 會話索引
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### Prisma Schema設計

```prisma
// backend/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id             Int       @id @default(autoincrement())
  email          String    @unique @db.VarChar(255)
  passwordHash   String    @map("password_hash") @db.VarChar(255)
  nickname       String    @db.VarChar(50)
  avatarUrl      String?   @map("avatar_url") @db.VarChar(500)
  preferences    Json      @default("{}")
  isActive       Boolean   @default(true) @map("is_active")
  emailVerified  Boolean   @default(false) @map("email_verified")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  // Relations
  playlists      Playlist[]
  playHistory    PlayHistory[]
  sessions       Session[]
  playlistSongs  PlaylistSong[]

  @@map("users")
}

model Playlist {
  id              Int      @id @default(autoincrement())
  userId          Int      @map("user_id")
  name            String   @db.VarChar(100)
  description     String?
  coverUrl        String?  @map("cover_url") @db.VarChar(500)
  isPublic        Boolean  @default(false) @map("is_public")
  isCollaborative Boolean  @default(false) @map("is_collaborative")
  totalDuration   Int      @default(0) @map("total_duration")
  songCount       Int      @default(0) @map("song_count")
  playCount       Int      @default(0) @map("play_count")
  metadata        Json     @default("{}")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // Relations
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  songs           PlaylistSong[]
  playHistory     PlayHistory[]

  @@map("playlists")
}

model Song {
  id           Int       @id @default(autoincrement())
  youtubeId    String    @unique @map("youtube_id") @db.VarChar(20)
  title        String    @db.VarChar(200)
  artist       String?   @db.VarChar(200)
  duration     Int?
  thumbnailUrl String?   @map("thumbnail_url") @db.VarChar(500)
  channelName  String?   @map("channel_name") @db.VarChar(200)
  viewCount    BigInt?   @map("view_count")
  publishedAt  DateTime? @map("published_at")
  metadata     Json      @default("{}")
  isAvailable  Boolean   @default(true) @map("is_available")
  lastChecked  DateTime  @default(now()) @map("last_checked")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  // Relations
  playlists    PlaylistSong[]
  playHistory  PlayHistory[]

  @@map("songs")
}

model PlaylistSong {
  id         Int      @id @default(autoincrement())
  playlistId Int      @map("playlist_id")
  songId     Int      @map("song_id")
  position   Int
  addedBy    Int?     @map("added_by")
  addedAt    DateTime @default(now()) @map("added_at")

  // Relations
  playlist   Playlist @relation(fields: [playlistId], references: [id], onDelete: Cascade)
  song       Song     @relation(fields: [songId], references: [id], onDelete: Cascade)
  user       User?    @relation(fields: [addedBy], references: [id])

  @@unique([playlistId, position])
  @@unique([playlistId, songId])
  @@map("playlist_songs")
}

model PlayHistory {
  id           Int       @id @default(autoincrement())
  userId       Int       @map("user_id")
  songId       Int       @map("song_id")
  playlistId   Int?      @map("playlist_id")
  playedAt     DateTime  @default(now()) @map("played_at")
  playDuration Int?      @map("play_duration")
  completed    Boolean   @default(false)

  // Relations
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  song         Song      @relation(fields: [songId], references: [id], onDelete: Cascade)
  playlist     Playlist? @relation(fields: [playlistId], references: [id], onDelete: SetNull)

  @@map("play_history")
}

model Session {
  id        String   @id @db.VarChar(128)
  userId    Int      @map("user_id")
  data      Json
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `backend/prisma/schema.prisma` - Prisma資料庫架構
- `backend/prisma/migrations/` - 資料庫遷移檔案
- `database/init.sql` - 初始化SQL腳本
- `database/seeds/` - 測試數據種子
- `backend/src/types/database.ts` - 資料庫類型定義

**Docker設定**:
```yaml
# docker-compose.dev.yml (資料庫部分)
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: musicplayer-postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: musicplayer-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

## ✅ 驗收條件

### 功能驗收
- [ ] PostgreSQL和Redis容器成功啟動
- [ ] Prisma schema正確定義所有表格和關聯
- [ ] 資料庫遷移 `npx prisma migrate dev` 成功執行
- [ ] 所有索引正確建立
- [ ] 觸發器和函數正常運作
- [ ] Prisma Client成功生成

### 資料完整性驗收
- [ ] 所有外鍵約束正確設定
- [ ] 檢查約束(CHECK)正常運作
- [ ] 唯一約束(UNIQUE)防止重複資料
- [ ] 預設值正確設定
- [ ] 資料類型限制有效

### 效能驗收
- [ ] 查詢索引正確使用
- [ ] 全文搜尋索引(GIN)有效
- [ ] 複合索引優化查詢效能
- [ ] 觸發器不影響寫入效能

## 🚀 實作指引

### Step 1: 設置Prisma
```bash
cd backend
npm install prisma @prisma/client
npx prisma init
```

### Step 2: 配置資料庫連線
```bash
# 設置環境變數
cp ../.env.example .env
# 編輯DATABASE_URL為正確的連線字串
```

### Step 3: 建立Schema和遷移
```bash
# 建立初始遷移
npx prisma migrate dev --name init

# 生成Prisma Client
npx prisma generate

# 查看資料庫 (可選)
npx prisma studio
```

### Step 4: 建立種子資料
```typescript
// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // 建立測試用戶
  const hashedPassword = await bcrypt.hash('password123', 12)
  
  const user = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      passwordHash: hashedPassword,
      nickname: 'Demo User',
      emailVerified: true
    }
  })

  // 建立測試歌曲
  const songs = await Promise.all([
    prisma.song.create({
      data: {
        youtubeId: 'dQw4w9WgXcQ',
        title: 'Never Gonna Give You Up',
        artist: 'Rick Astley',
        duration: 213,
        thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg'
      }
    })
  ])

  console.log('Seed data created successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

## 📊 預期成果

完成此Story後，專案將擁有：
- ✅ 完整的資料庫架構設計
- ✅ 優化的索引和查詢效能
- ✅ 資料完整性約束
- ✅ Prisma ORM整合
- ✅ 容器化的資料庫環境