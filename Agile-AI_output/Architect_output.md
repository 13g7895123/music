# 系統架構師(Architect) - YouTube音樂播放器架構設計文件

## 執行摘要

本文件基於業務分析師和產品經理的需求分析，設計了一個可擴展、安全且高效的YouTube音樂播放器系統架構。採用Vue.js + Node.js的全棧JavaScript解決方案，使用PostgreSQL作為主資料庫，Redis作為快取層，並整合YouTube iframe API實現音樂播放功能。

## 1. 技術選型與架構決策

### 1.1 程式語言和框架選擇

#### 前端技術棧
**主框架：Vue.js 3 + TypeScript**
- **選擇理由**：
  - 學習曲線平緩，開發效率高
  - 文檔完整，社群支援良好
  - 適合中小型專案快速開發
  - 內建響應式系統，狀態管理簡潔
  - TypeScript支援完善，提供更好的開發體驗

**狀態管理：Pinia**
- **選擇理由**：
  - Vue 3官方推薦的狀態管理工具
  - 更好的TypeScript支援
  - 簡潔的API設計，易於理解和維護
  - 支援模組化狀態管理

**路由管理：Vue Router 4**
- **選擇理由**：
  - Vue.js官方路由解決方案
  - 支援動態路由和嵌套路由
  - 良好的導航守衛機制

#### 後端技術棧
**主框架：Node.js + Express.js + TypeScript**
- **選擇理由**：
  - 全棧JavaScript，統一開發語言
  - 豐富的NPM生態系統
  - 適合I/O密集型應用（音樂播放）
  - 社群活躍，第三方插件豐富
  - TypeScript提供更好的代碼品質

**API設計：RESTful API + GraphQL (可選)**
- **選擇理由**：
  - RESTful API簡單直觀，適合CRUD操作
  - GraphQL可用於複雜查詢優化
  - 支援版本化和向後相容

### 1.2 開發語言決策表

| 技術層面 | 選擇技術 | 替代方案 | 選擇理由 |
|---------|---------|---------|---------|
| 前端框架 | Vue.js 3 | React, Angular | 開發效率、學習成本、專案規模匹配 |
| 後端框架 | Node.js + Express | Python Flask, Java Spring | 技術棧統一、開發效率 |
| 資料庫 | PostgreSQL | MySQL, MongoDB | 關聯數據、JSON支援、擴展性 |
| 快取 | Redis | Memcached | 數據結構豐富、持久化支援 |
| 語言增強 | TypeScript | JavaScript | 類型安全、開發體驗 |

## 2. 系統架構設計

### 2.1 整體架構圖

```mermaid
graph TB
    subgraph "Frontend"
        A[Vue.js App]
        B[Vue Router]
        C[Pinia Store]
        D[UI Components]
    end
    
    subgraph "Backend Services"
        E[Express.js API]
        F[Authentication Service]
        G[Playlist Service]
        H[YouTube Service]
    end
    
    subgraph "Data Layer"
        I[PostgreSQL]
        J[Redis Cache]
    end
    
    subgraph "External Services"
        K[YouTube iframe API]
        L[CDN]
    end
    
    A --> E
    E --> I
    E --> J
    A --> K
    A --> L
    E --> K
```

### 2.2 服務分層架構

#### 2.2.1 展示層 (Presentation Layer)
- **Vue.js Components**: 用戶界面組件
- **Vue Router**: 頁面路由管理
- **Pinia Stores**: 客戶端狀態管理

#### 2.2.2 業務邏輯層 (Business Logic Layer)
- **Authentication Service**: 用戶身份驗證
- **Playlist Management Service**: 播放清單管理
- **YouTube Integration Service**: YouTube API整合
- **User Management Service**: 用戶資料管理

#### 2.2.3 數據存取層 (Data Access Layer)
- **PostgreSQL**: 主要資料存儲
- **Redis**: 快取和會話存儲
- **ORM**: Prisma (類型安全的資料庫訪問)

#### 2.2.4 外部服務層 (External Services Layer)
- **YouTube iframe API**: 音樂播放服務
- **CDN**: 靜態資源分發

## 3. 資料庫設計與數據模型

### 3.1 資料庫選擇：PostgreSQL

**選擇理由**：
- 強大的關聯型資料庫功能
- 支援JSON數據類型，靈活性佳
- 優秀的併發處理能力
- 豐富的索引類型支援
- 強大的查詢優化器

### 3.2 資料庫設計

#### 3.2.1 核心資料表

**用戶表 (users)**
```sql
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);
```

**播放清單表 (playlists)**
```sql
CREATE TABLE playlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    cover_url VARCHAR(500),
    is_public BOOLEAN DEFAULT false,
    is_collaborative BOOLEAN DEFAULT false,
    total_duration INTEGER DEFAULT 0, -- 總時長(秒)
    song_count INTEGER DEFAULT 0,     -- 歌曲數量
    play_count INTEGER DEFAULT 0,     -- 播放次數
    metadata JSONB DEFAULT '{}',       -- 額外元數據
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_playlists_user_id ON playlists(user_id);
CREATE INDEX idx_playlists_public ON playlists(is_public);
CREATE INDEX idx_playlists_created_at ON playlists(created_at);
```

**歌曲表 (songs)**
```sql
CREATE TABLE songs (
    id SERIAL PRIMARY KEY,
    youtube_id VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    artist VARCHAR(200),
    duration INTEGER,              -- 時長(秒)
    thumbnail_url VARCHAR(500),
    channel_name VARCHAR(200),
    view_count BIGINT,
    published_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',   -- YouTube API返回的額外數據
    is_available BOOLEAN DEFAULT true, -- 是否可播放
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_songs_youtube_id ON songs(youtube_id);
CREATE INDEX idx_songs_title ON songs USING GIN(to_tsvector('english', title));
CREATE INDEX idx_songs_artist ON songs USING GIN(to_tsvector('english', artist));
CREATE INDEX idx_songs_available ON songs(is_available);
```

**播放清單歌曲關聯表 (playlist_songs)**
```sql
CREATE TABLE playlist_songs (
    id SERIAL PRIMARY KEY,
    playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_by INTEGER REFERENCES users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(playlist_id, position),
    UNIQUE(playlist_id, song_id)
);

-- 索引
CREATE INDEX idx_playlist_songs_playlist_id ON playlist_songs(playlist_id);
CREATE INDEX idx_playlist_songs_position ON playlist_songs(playlist_id, position);
```

**播放記錄表 (play_history)**
```sql
CREATE TABLE play_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    playlist_id INTEGER REFERENCES playlists(id) ON DELETE SET NULL,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    play_duration INTEGER, -- 實際播放時長(秒)
    completed BOOLEAN DEFAULT false -- 是否播放完整
);

-- 索引
CREATE INDEX idx_play_history_user_id ON play_history(user_id);
CREATE INDEX idx_play_history_played_at ON play_history(played_at);
CREATE INDEX idx_play_history_song_id ON play_history(song_id);
```

**會話表 (sessions)**
```sql
CREATE TABLE sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

#### 3.2.2 數據關係圖

```mermaid
erDiagram
    users ||--o{ playlists : creates
    users ||--o{ play_history : has
    users ||--o{ sessions : has
    playlists ||--o{ playlist_songs : contains
    songs ||--o{ playlist_songs : included_in
    songs ||--o{ play_history : played
    playlists ||--o{ play_history : context
```

### 3.3 快取策略設計

#### 3.3.1 Redis 快取設計

**快取鍵命名規範**：
```
user:{user_id}:profile        # 用戶資料
user:{user_id}:playlists      # 用戶播放清單列表
playlist:{playlist_id}:songs  # 播放清單歌曲
song:{youtube_id}:info        # 歌曲資訊
session:{session_id}          # 用戶會話
youtube:url:{url_hash}        # YouTube URL解析結果
```

**快取策略**：
- **用戶資料**: TTL 1小時，寫入時更新
- **播放清單**: TTL 30分鐘，修改時清除
- **歌曲資訊**: TTL 24小時，YouTube API調用結果
- **會話資料**: TTL 24小時，滑動過期

## 4. 網頁應用設計

### 4.1 頁面結構與路由設計

#### 4.1.1 頁面層級結構

```
/                          # 首頁 / 登入頁
├── /auth/
│   ├── /login             # 登入頁面
│   ├── /register          # 註冊頁面
│   └── /forgot-password   # 忘記密碼
├── /dashboard             # 主控制台 (需認證)
│   ├── /playlists         # 播放清單列表
│   ├── /playlist/:id      # 特定播放清單詳情
│   ├── /player            # 播放頁面 (顯示影片)
│   ├── /history           # 播放記錄
│   ├── /profile           # 個人資料
│   └── /settings          # 設定頁面
└── /about                 # 關於頁面
```

#### 4.1.2 Vue Router 配置

```typescript
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/auth',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: 'login',
        name: 'Login',
        component: () => import('@/views/auth/Login.vue')
      },
      {
        path: 'register',
        name: 'Register',
        component: () => import('@/views/auth/Register.vue')
      }
    ]
  },
  {
    path: '/dashboard',
    component: () => import('@/layouts/DashboardLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'playlists',
        name: 'Playlists',
        component: () => import('@/views/dashboard/Playlists.vue')
      },
      {
        path: 'playlist/:id',
        name: 'PlaylistDetail',
        component: () => import('@/views/dashboard/PlaylistDetail.vue')
      },
      {
        path: 'player',
        name: 'Player',
        component: () => import('@/views/dashboard/Player.vue')
      }
    ]
  }
]
```

### 4.2 用戶流程設計

#### 4.2.1 用戶註冊流程

```mermaid
flowchart TD
    A[訪問註冊頁面] --> B[填寫註冊資訊]
    B --> C[前端驗證]
    C --> D{驗證通過?}
    D -->|否| B
    D -->|是| E[發送註冊請求]
    E --> F[後端驗證]
    F --> G{驗證通過?}
    G -->|否| H[返回錯誤訊息]
    G -->|是| I[創建用戶帳號]
    I --> J[發送驗證郵件]
    J --> K[自動登入]
    K --> L[重定向到儀表板]
    H --> B
```

#### 4.2.2 播放清單管理流程

```mermaid
flowchart TD
    A[選擇播放清單] --> B[檢視歌曲列表]
    B --> C[添加新歌曲]
    C --> D[輸入YouTube URL]
    D --> E[URL驗證和解析]
    E --> F{URL有效?}
    F -->|否| G[顯示錯誤訊息]
    F -->|是| H[獲取影片資訊]
    H --> I[添加到播放清單]
    I --> J[更新UI顯示]
    G --> D
    
    B --> K[播放歌曲]
    K --> L[檢查播放頁面]
    L --> M{在播放頁面?}
    M -->|是| N[顯示影片]
    M -->|否| O[隱藏影片，保持音訊]
```

#### 4.2.3 音樂播放流程

```mermaid
flowchart TD
    A[選擇歌曲播放] --> B[載入YouTube iframe]
    B --> C[初始化播放器]
    C --> D[開始播放]
    D --> E[更新播放狀態]
    E --> F[同步到所有頁面]
    F --> G{播放完成?}
    G -->|否| H[持續播放]
    G -->|是| I[自動播放下一首]
    H --> E
    I --> J{有下一首?}
    J -->|是| B
    J -->|否| K[播放結束]
```

### 4.3 用戶界面設計規範

#### 4.3.1 佈局設計

**主要佈局組件**：
```
┌─────────────────────────────────────────────────────────┐
│                    Top Navigation Bar                    │
├─────────────┬───────────────────────────────────────────┤
│             │                                           │
│   Sidebar   │           Main Content Area               │
│             │                                           │
│  - Home     │                                           │
│  - Playlists│                                           │
│  - History  │                                           │
│  - Settings │                                           │
│             │                                           │
├─────────────┴───────────────────────────────────────────┤
│                Bottom Player Bar                        │
│  [Prev] [Play/Pause] [Next] [Volume] [Progress]        │
└─────────────────────────────────────────────────────────┘
```

#### 4.3.2 響應式設計

**斷點設計**：
- **手機**: < 768px (單欄佈局，側邊欄可收合)
- **平板**: 768px - 1024px (兩欄佈局)
- **桌面**: > 1024px (三欄佈局)

**適應性設計原則**：
- Mobile First設計策略
- 觸控友善的按鈕大小(最小44x44px)
- 適應性圖片和媒體查詢
- 側邊欄在小螢幕可收合

## 5. 安全性考量與實作

### 5.1 身份驗證與授權

#### 5.1.1 JWT Token 設計

**Token 結構**：
```typescript
interface JWTPayload {
  sub: string;      // 用戶ID
  email: string;    // 用戶郵箱
  iat: number;      // 發行時間
  exp: number;      // 過期時間
  jti: string;      // Token ID
  role: string;     // 用戶角色
}
```

**Token 策略**：
- **Access Token**: 15分鐘有效期
- **Refresh Token**: 7天有效期，存儲在HttpOnly Cookie
- **Token輪替**: Refresh Token使用後立即失效

#### 5.1.2 安全實作策略

**密碼安全**：
```typescript
import bcrypt from 'bcrypt';

// 密碼雜湊
const saltRounds = 12;
const passwordHash = await bcrypt.hash(password, saltRounds);

// 密碼驗證
const isValid = await bcrypt.compare(password, passwordHash);
```

**Rate Limiting**：
```typescript
import rateLimit from 'express-rate-limit';

// API速率限制
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分鐘
  max: 100, // 最多100次請求
  message: '請求次數過多，請稍後再試'
});

// 登入速率限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 最多5次登入嘗試
  skipSuccessfulRequests: true
});
```

### 5.2 數據安全

#### 5.2.1 輸入驗證

**Joi 驗證規則**：
```typescript
import Joi from 'joi';

const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
  nickname: Joi.string().min(2).max(50).required()
});

const playlistSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  isPublic: Joi.boolean().default(false)
});

const youtubeUrlSchema = Joi.object({
  url: Joi.string().uri().pattern(/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//).required()
});
```

#### 5.2.2 XSS 和 CSRF 防護

**內容安全政策 (CSP)**：
```typescript
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://www.youtube.com; " +
    "frame-src https://www.youtube.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https://i.ytimg.com;"
  );
  next();
});
```

**CSRF Token**：
```typescript
import csrf from 'csurf';

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});
```

### 5.3 API 安全

#### 5.3.1 CORS 配置

```typescript
import cors from 'cors';

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
};

app.use(cors(corsOptions));
```

#### 5.3.2 API 監控與日誌

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

## 6. 基礎設施與部署策略

### 6.1 容器化部署

#### 6.1.1 Docker 配置

**Frontend Dockerfile**：
```dockerfile
# Multi-stage build for Vue.js
FROM node:18-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Backend Dockerfile**：
```dockerfile
FROM node:18-alpine
WORKDIR /app

# 安裝依賴
COPY package*.json ./
RUN npm ci --only=production

# 複製源代碼
COPY . .

# 建構TypeScript
RUN npm run build

# 創建非root用戶
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3000
CMD ["npm", "start"]
```

#### 6.1.2 Docker Compose 配置

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      - VITE_API_URL=http://backend:3000

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/musicplayer
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./backend/logs:/app/logs

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=musicplayer
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
  redis_data:
```

### 6.2 雲端部署架構

#### 6.2.1 生產環境架構

```mermaid
graph TB
    subgraph "CDN Layer"
        A[CloudFlare CDN]
    end
    
    subgraph "Load Balancer"
        B[Nginx Load Balancer]
    end
    
    subgraph "Application Layer"
        C[Frontend Container 1]
        D[Frontend Container 2]
        E[Backend Container 1]
        F[Backend Container 2]
    end
    
    subgraph "Database Layer"
        G[PostgreSQL Primary]
        H[PostgreSQL Replica]
        I[Redis Cluster]
    end
    
    subgraph "Monitoring"
        J[Prometheus]
        K[Grafana]
        L[Log Aggregation]
    end
    
    A --> B
    B --> C
    B --> D
    B --> E
    B --> F
    E --> G
    E --> H
    E --> I
    F --> G
    F --> H
    F --> I
```

#### 6.2.2 部署策略

**藍綠部署**：
- 維護兩個相同的生產環境
- 新版本部署到備用環境
- 驗證後切換流量
- 支援快速回滾

**滾動更新**：
- 逐步替換舊版本容器
- 確保服務不中斷
- 自動健康檢查
- 失敗時自動回滾

### 6.3 CI/CD 流程

#### 6.3.1 GitHub Actions 配置

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run type checking
      run: npm run type-check
    
    - name: Run tests
      run: npm run test:coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and push Docker images
      uses: docker/bake-action@v2
      with:
        push: true
        set: |
          *.cache-from=type=gha
          *.cache-to=type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Deploy to production
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /opt/musicplayer
          docker-compose pull
          docker-compose up -d
          docker system prune -f
```

## 7. 專案檔案結構與組織

### 7.1 整體專案結構

```
youtube-music-player/
├── frontend/                    # Vue.js 前端應用
│   ├── public/
│   ├── src/
│   ├── tests/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.ts
├── backend/                     # Node.js 後端應用
│   ├── src/
│   ├── tests/
│   ├── prisma/
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── database/                    # 資料庫相關檔案
│   ├── migrations/
│   ├── seeds/
│   └── init.sql
├── docker-compose.yml           # 本地開發環境
├── docker-compose.prod.yml      # 生產環境
├── .github/                     # GitHub Actions
│   └── workflows/
├── docs/                        # 專案文檔
├── scripts/                     # 部署和維護腳本
└── README.md
```

### 7.2 前端應用結構

```
frontend/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── manifest.json
├── src/
│   ├── assets/                  # 靜態資源
│   │   ├── images/
│   │   ├── styles/
│   │   └── icons/
│   ├── components/              # 可重用組件
│   │   ├── common/              # 通用組件
│   │   │   ├── Button/
│   │   │   ├── Modal/
│   │   │   ├── Input/
│   │   │   └── Loading/
│   │   ├── layout/              # 佈局組件
│   │   │   ├── Sidebar/
│   │   │   ├── Header/
│   │   │   └── PlayerBar/
│   │   └── features/            # 功能組件
│   │       ├── Auth/
│   │       ├── Playlist/
│   │       ├── Player/
│   │       └── User/
│   ├── composables/             # Vue 3 Composition API
│   │   ├── useAuth.ts
│   │   ├── usePlayer.ts
│   │   ├── usePlaylist.ts
│   │   └── useYoutube.ts
│   ├── layouts/                 # 頁面佈局
│   │   ├── AuthLayout.vue
│   │   ├── DashboardLayout.vue
│   │   └── DefaultLayout.vue
│   ├── pages/                   # 頁面組件
│   │   ├── auth/
│   │   ├── dashboard/
│   │   └── public/
│   ├── plugins/                 # 插件配置
│   │   ├── axios.ts
│   │   ├── pinia.ts
│   │   └── router.ts
│   ├── services/                # API 服務
│   │   ├── auth.ts
│   │   ├── playlist.ts
│   │   ├── song.ts
│   │   └── user.ts
│   ├── stores/                  # Pinia 狀態管理
│   │   ├── auth.ts
│   │   ├── player.ts
│   │   ├── playlist.ts
│   │   └── ui.ts
│   ├── types/                   # TypeScript 類型定義
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── playlist.ts
│   │   └── player.ts
│   ├── utils/                   # 工具函數
│   │   ├── constants.ts
│   │   ├── helpers.ts
│   │   ├── validation.ts
│   │   └── youtube.ts
│   ├── App.vue
│   ├── main.ts
│   └── router.ts
├── tests/                       # 測試檔案
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── Dockerfile
├── nginx.conf
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

### 7.3 後端應用結構

```
backend/
├── src/
│   ├── controllers/             # 控制器
│   │   ├── auth.controller.ts
│   │   ├── playlist.controller.ts
│   │   ├── song.controller.ts
│   │   └── user.controller.ts
│   ├── middleware/              # 中間件
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── rateLimit.middleware.ts
│   ├── routes/                  # 路由定義
│   │   ├── auth.routes.ts
│   │   ├── playlist.routes.ts
│   │   ├── song.routes.ts
│   │   └── user.routes.ts
│   ├── services/                # 業務邏輯服務
│   │   ├── auth.service.ts
│   │   ├── playlist.service.ts
│   │   ├── song.service.ts
│   │   ├── user.service.ts
│   │   ├── youtube.service.ts
│   │   └── cache.service.ts
│   ├── models/                  # 資料模型 (Prisma)
│   │   └── index.ts
│   ├── types/                   # TypeScript 類型
│   │   ├── auth.types.ts
│   │   ├── playlist.types.ts
│   │   ├── song.types.ts
│   │   └── common.types.ts
│   ├── utils/                   # 工具函數
│   │   ├── logger.ts
│   │   ├── validation.ts
│   │   ├── encryption.ts
│   │   └── youtube.ts
│   ├── config/                  # 配置檔案
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── jwt.ts
│   │   └── app.ts
│   ├── app.ts                   # Express 應用設定
│   └── server.ts                # 伺服器啟動
├── prisma/                      # Prisma ORM
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/                       # 測試檔案
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── logs/                        # 日誌檔案
├── Dockerfile
├── package.json
├── tsconfig.json
└── jest.config.js
```

### 7.4 核心組件設計

#### 7.4.1 YouTube 播放器組件

```typescript
// frontend/src/components/features/Player/YouTubePlayer.vue
<template>
  <div class="youtube-player-container">
    <div 
      v-show="isPlayerVisible" 
      ref="playerContainer"
      class="player-iframe-container"
    />
    <div v-if="!isPlayerVisible" class="audio-only-indicator">
      <p>音訊播放中 - {{ currentSong?.title }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useRoute } from 'vue-router'

const playerStore = usePlayerStore()
const route = useRoute()

const playerContainer = ref<HTMLElement>()
const isPlayerVisible = computed(() => route.name === 'Player')

// YouTube Player API 整合
let youtubePlayer: any = null

onMounted(async () => {
  await loadYouTubeAPI()
  initializePlayer()
})

const loadYouTubeAPI = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    document.head.appendChild(script)

    window.onYouTubeIframeAPIReady = () => {
      resolve()
    }
  })
}

const initializePlayer = () => {
  youtubePlayer = new window.YT.Player(playerContainer.value, {
    height: '390',
    width: '640',
    videoId: playerStore.currentSong?.youtubeId,
    playerVars: {
      autoplay: 0,
      controls: 1,
      disablekb: 0,
      enablejsapi: 1,
      fs: 1,
      modestbranding: 1,
      rel: 0
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError
    }
  })
}

const onPlayerReady = (event: any) => {
  playerStore.setPlayerInstance(youtubePlayer)
}

const onPlayerStateChange = (event: any) => {
  const state = event.data
  playerStore.updatePlayerState(state)
  
  // 自動播放下一首
  if (state === window.YT.PlayerState.ENDED) {
    playerStore.playNext()
  }
}
</script>
```

#### 7.4.2 播放清單管理組件

```typescript
// frontend/src/components/features/Playlist/PlaylistManager.vue
<template>
  <div class="playlist-manager">
    <div class="playlist-header">
      <h2>{{ playlist.name }}</h2>
      <button @click="showAddSongModal = true">
        添加歌曲
      </button>
    </div>

    <draggable 
      v-model="playlist.songs"
      @change="onSongOrderChange"
      item-key="id"
      class="song-list"
    >
      <template #item="{ element: song, index }">
        <div class="song-item">
          <img :src="song.thumbnailUrl" :alt="song.title" />
          <div class="song-info">
            <h4>{{ song.title }}</h4>
            <p>{{ song.artist }}</p>
          </div>
          <div class="song-actions">
            <button @click="playSong(song, index)">播放</button>
            <button @click="removeSong(index)">移除</button>
          </div>
        </div>
      </template>
    </draggable>

    <AddSongModal 
      v-if="showAddSongModal"
      @close="showAddSongModal = false"
      @add-song="addSongToPlaylist"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import draggable from 'vuedraggable'
import { usePlaylistStore } from '@/stores/playlist'
import { usePlayerStore } from '@/stores/player'

const playlistStore = usePlaylistStore()
const playerStore = usePlayerStore()

const props = defineProps<{
  playlistId: string
}>()

const playlist = computed(() => 
  playlistStore.getPlaylistById(props.playlistId)
)
const showAddSongModal = ref(false)

const playSong = (song: Song, index: number) => {
  playerStore.playSong(song, playlist.value.songs, index)
}

const addSongToPlaylist = async (youtubeUrl: string) => {
  await playlistStore.addSongToPlaylist(props.playlistId, youtubeUrl)
  showAddSongModal.value = false
}

const removeSong = async (index: number) => {
  await playlistStore.removeSongFromPlaylist(props.playlistId, index)
}

const onSongOrderChange = async (event: any) => {
  await playlistStore.updateSongOrder(props.playlistId, playlist.value.songs)
}
</script>
```

#### 7.4.3 後端 API 控制器

```typescript
// backend/src/controllers/playlist.controller.ts
import { Request, Response } from 'express'
import { PlaylistService } from '../services/playlist.service'
import { YouTubeService } from '../services/youtube.service'
import { AuthRequest } from '../types/auth.types'

export class PlaylistController {
  constructor(
    private playlistService: PlaylistService,
    private youtubeService: YouTubeService
  ) {}

  async getUserPlaylists(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id
      const playlists = await this.playlistService.getUserPlaylists(userId)
      
      res.json({
        success: true,
        data: playlists
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '獲取播放清單失敗',
        error: error.message
      })
    }
  }

  async createPlaylist(req: AuthRequest, res: Response) {
    try {
      const userId = req.user.id
      const { name, description, isPublic } = req.body

      const playlist = await this.playlistService.createPlaylist({
        userId,
        name,
        description,
        isPublic
      })

      res.status(201).json({
        success: true,
        data: playlist
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '創建播放清單失敗',
        error: error.message
      })
    }
  }

  async addSongToPlaylist(req: AuthRequest, res: Response) {
    try {
      const { playlistId } = req.params
      const { youtubeUrl } = req.body
      const userId = req.user.id

      // 驗證播放清單所有權
      await this.playlistService.verifyPlaylistOwnership(playlistId, userId)

      // 解析 YouTube URL
      const videoInfo = await this.youtubeService.getVideoInfo(youtubeUrl)
      
      // 添加歌曲到播放清單
      const song = await this.playlistService.addSongToPlaylist(
        playlistId, 
        videoInfo
      )

      res.json({
        success: true,
        data: song
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        message: '添加歌曲失敗',
        error: error.message
      })
    }
  }
}
```

## 8. 開發與部署流程

### 8.1 開發環境設置

#### 8.1.1 本地開發環境

**必要軟體**：
- Node.js 18+
- Docker & Docker Compose
- Git
- VS Code (推薦)

**環境設置步驟**：
```bash
# 1. 複製專案
git clone https://github.com/your-org/youtube-music-player.git
cd youtube-music-player

# 2. 設置環境變數
cp .env.example .env
# 編輯 .env 檔案設置必要配置

# 3. 啟動開發環境
docker-compose -f docker-compose.dev.yml up -d

# 4. 安裝前端依賴
cd frontend
npm install
npm run dev

# 5. 安裝後端依賴
cd ../backend
npm install
npm run dev

# 6. 運行資料庫遷移
npm run db:migrate
npm run db:seed
```

#### 8.1.2 開發工具配置

**VS Code 擴展推薦**：
```json
{
  "recommendations": [
    "Vue.volar",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "prisma.prisma",
    "ms-vscode-remote.remote-containers"
  ]
}
```

**ESLint 配置**：
```javascript
module.exports = {
  extends: [
    '@vue/typescript/recommended',
    '@vue/prettier',
    '@vue/prettier/@typescript-eslint'
  ],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'off'
  }
}
```

### 8.2 測試策略

#### 8.2.1 前端測試

**單元測試 (Vitest)**：
```typescript
// frontend/tests/unit/components/PlaylistItem.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PlaylistItem from '@/components/features/Playlist/PlaylistItem.vue'

describe('PlaylistItem', () => {
  it('renders playlist information correctly', () => {
    const playlist = {
      id: '1',
      name: 'My Playlist',
      songCount: 10,
      totalDuration: 3600
    }

    const wrapper = mount(PlaylistItem, {
      props: { playlist }
    })

    expect(wrapper.text()).toContain('My Playlist')
    expect(wrapper.text()).toContain('10 首歌曲')
  })

  it('emits play event when play button is clicked', async () => {
    const playlist = { id: '1', name: 'Test' }
    const wrapper = mount(PlaylistItem, {
      props: { playlist }
    })

    await wrapper.find('[data-testid="play-button"]').trigger('click')
    
    expect(wrapper.emitted('play')).toBeTruthy()
    expect(wrapper.emitted('play')[0]).toEqual([playlist])
  })
})
```

**整合測試 (Cypress)**：
```typescript
// frontend/cypress/integration/playlist.spec.ts
describe('Playlist Management', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password')
    cy.visit('/dashboard/playlists')
  })

  it('creates a new playlist', () => {
    cy.get('[data-testid="create-playlist-btn"]').click()
    cy.get('[data-testid="playlist-name"]').type('Test Playlist')
    cy.get('[data-testid="playlist-description"]').type('Test Description')
    cy.get('[data-testid="save-playlist"]').click()
    
    cy.contains('Test Playlist').should('be.visible')
  })

  it('adds a song to playlist', () => {
    cy.get('[data-testid="playlist-item"]').first().click()
    cy.get('[data-testid="add-song-btn"]').click()
    cy.get('[data-testid="youtube-url"]').type('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    cy.get('[data-testid="add-song-submit"]').click()
    
    cy.contains('Never Gonna Give You Up').should('be.visible')
  })
})
```

#### 8.2.2 後端測試

**單元測試 (Jest)**：
```typescript
// backend/tests/unit/services/playlist.service.spec.ts
import { PlaylistService } from '../../src/services/playlist.service'
import { PrismaClient } from '@prisma/client'

describe('PlaylistService', () => {
  let service: PlaylistService
  let prisma: PrismaClient

  beforeEach(() => {
    prisma = new PrismaClient()
    service = new PlaylistService(prisma)
  })

  describe('createPlaylist', () => {
    it('should create a new playlist', async () => {
      const playlistData = {
        userId: 1,
        name: 'Test Playlist',
        description: 'Test Description',
        isPublic: false
      }

      const result = await service.createPlaylist(playlistData)

      expect(result).toMatchObject({
        name: 'Test Playlist',
        description: 'Test Description',
        isPublic: false
      })
    })

    it('should throw error if playlist name already exists for user', async () => {
      const playlistData = {
        userId: 1,
        name: 'Existing Playlist',
        description: 'Test',
        isPublic: false
      }

      await service.createPlaylist(playlistData)

      await expect(service.createPlaylist(playlistData))
        .rejects.toThrow('播放清單名稱已存在')
    })
  })
})
```

**API 測試 (Supertest)**：
```typescript
// backend/tests/integration/playlist.api.spec.ts
import request from 'supertest'
import { app } from '../../src/app'

describe('Playlist API', () => {
  let authToken: string

  beforeEach(async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      })
    
    authToken = response.body.token
  })

  describe('POST /api/playlists', () => {
    it('should create a new playlist', async () => {
      const response = await request(app)
        .post('/api/playlists')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Playlist',
          description: 'Test Description',
          isPublic: false
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe('Test Playlist')
    })

    it('should return 401 for unauthorized requests', async () => {
      const response = await request(app)
        .post('/api/playlists')
        .send({
          name: 'Test Playlist'
        })

      expect(response.status).toBe(401)
    })
  })
})
```

### 8.3 效能監控與優化

#### 8.3.1 前端效能監控

**Vue DevTools 整合**：
```typescript
// frontend/src/main.ts
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

// 開發環境啟用效能監控
if (process.env.NODE_ENV === 'development') {
  app.config.performance = true
}
```

**Web Vitals 監控**：
```typescript
// frontend/src/utils/performance.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

export const initPerformanceMonitoring = () => {
  getCLS(console.log)
  getFID(console.log)
  getFCP(console.log)
  getLCP(console.log)
  getTTFB(console.log)
}
```

#### 8.3.2 後端效能監控

**Prometheus 指標收集**：
```typescript
// backend/src/middleware/metrics.middleware.ts
import prometheus from 'prom-client'
import { Request, Response, NextFunction } from 'express'

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
})

const httpRequestCounter = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
})

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000
    const route = req.route?.path || req.path
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration)
    
    httpRequestCounter
      .labels(req.method, route, res.statusCode.toString())
      .inc()
  })

  next()
}
```

## 9. 結論與建議

### 9.1 架構總結

本架構設計提供了一個完整、可擴展且安全的YouTube音樂播放器解決方案：

**技術選型優勢**：
- **Vue.js + TypeScript**: 提供優秀的開發體驗和類型安全
- **Node.js + Express**: 統一的JavaScript技術棧，降低學習成本
- **PostgreSQL + Redis**: 強大的數據存儲和快取能力
- **Docker**: 一致的開發和部署環境

**架構特點**：
- **模組化設計**: 清晰的分層架構，易於維護和擴展
- **安全性**: 完善的身份驗證、授權和資料保護機制
- **效能優化**: 快取策略、CDN整合和效能監控
- **可擴展性**: 支援水平擴展和微服務架構遷移

### 9.2 實施建議

#### 9.2.1 開發階段建議

1. **MVP優先**: 專注核心功能實現，避免過度設計
2. **測試驅動**: 建立完善的測試覆蓋率，確保代碼品質
3. **漸進式開發**: 按照功能模組逐步實現，降低風險
4. **代碼審查**: 建立代碼審查流程，確保架構一致性

#### 9.2.2 部署階段建議

1. **藍綠部署**: 使用藍綠部署策略，確保零停機時間
2. **監控告警**: 建立完善的監控和告警機制
3. **備份策略**: 定期備份資料庫和重要配置
4. **安全掃描**: 定期進行安全漏洞掃描和修復

#### 9.2.3 維護階段建議

1. **效能監控**: 持續監控系統效能和用戶體驗
2. **日誌分析**: 建立完善的日誌收集和分析系統
3. **容量規劃**: 根據使用情況進行容量規劃和擴展
4. **技術債務**: 定期重構和優化代碼，避免技術債務累積

### 9.3 未來擴展方向

#### 9.3.1 技術升級路徑

1. **微服務架構**: 當業務複雜度增加時，可拆分為微服務
2. **GraphQL**: 引入GraphQL優化API查詢效率
3. **WebAssembly**: 使用WASM優化音訊處理效能
4. **PWA**: 添加漸進式Web應用功能，提升移動體驗

#### 9.3.2 功能擴展方向

1. **AI推薦**: 整合機器學習算法，提供智能音樂推薦
2. **社交功能**: 添加用戶間的社交互動功能
3. **多平台整合**: 支援Spotify、Apple Music等多平台
4. **實時協作**: 支援多人即時協作編輯播放清單

這個架構設計為YouTube音樂播放器提供了堅實的技術基礎，能夠支撐從MVP到企業級應用的發展需求。通過合理的技術選型、清晰的模組劃分和完善的安全機制，確保了系統的可靠性、可擴展性和可維護性。

---
*系統架構設計完成於 2025-08-15*
*架構師：Architecture Team*
*版本：v1.0*