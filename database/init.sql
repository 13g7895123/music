-- YouTube Music Player Database Initialization Script
-- This script includes all tables, indexes, constraints, and triggers

-- Create database extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- 會話表
CREATE TABLE sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT sessions_expires_check CHECK (expires_at > created_at)
);

-- 創建索引
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

-- 創建觸發器函數來自動更新 updated_at 欄位
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 為需要自動更新時間的表創建觸發器
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at 
    BEFORE UPDATE ON playlists 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_songs_updated_at 
    BEFORE UPDATE ON songs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 創建函數來自動維護播放清單統計資訊
CREATE OR REPLACE FUNCTION update_playlist_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE playlists 
        SET song_count = (
            SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = NEW.playlist_id
        ),
        total_duration = (
            SELECT COALESCE(SUM(s.duration), 0) 
            FROM playlist_songs ps 
            JOIN songs s ON ps.song_id = s.id 
            WHERE ps.playlist_id = NEW.playlist_id
        )
        WHERE id = NEW.playlist_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE playlists 
        SET song_count = (
            SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = OLD.playlist_id
        ),
        total_duration = (
            SELECT COALESCE(SUM(s.duration), 0) 
            FROM playlist_songs ps 
            JOIN songs s ON ps.song_id = s.id 
            WHERE ps.playlist_id = OLD.playlist_id
        )
        WHERE id = OLD.playlist_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- 為播放清單歌曲關聯表創建觸發器
CREATE TRIGGER update_playlist_stats_trigger
    AFTER INSERT OR DELETE ON playlist_songs
    FOR EACH ROW
    EXECUTE FUNCTION update_playlist_stats();

-- 創建清理過期會話的函數
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- 為數據完整性創建額外約束和檢查
-- 確保播放清單位置的連續性（可選）
CREATE OR REPLACE FUNCTION check_playlist_position_continuity()
RETURNS TRIGGER AS $$
BEGIN
    -- 當插入新歌曲時，確保位置是合理的
    IF NEW.position > (SELECT COALESCE(MAX(position), 0) + 1 FROM playlist_songs WHERE playlist_id = NEW.playlist_id AND id != COALESCE(NEW.id, 0)) THEN
        RAISE EXCEPTION 'Position % is not continuous for playlist %', NEW.position, NEW.playlist_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 應用位置檢查觸發器（可選，根據需求啟用）
-- CREATE TRIGGER check_playlist_position_trigger
--     BEFORE INSERT OR UPDATE ON playlist_songs
--     FOR EACH ROW
--     EXECUTE FUNCTION check_playlist_position_continuity();

-- 創建用於統計和報表的視圖
CREATE VIEW user_playlist_stats AS
SELECT 
    u.id as user_id,
    u.nickname,
    COUNT(p.id) as playlist_count,
    COALESCE(SUM(p.song_count), 0) as total_songs,
    COALESCE(SUM(p.total_duration), 0) as total_duration
FROM users u
LEFT JOIN playlists p ON u.id = p.user_id
GROUP BY u.id, u.nickname;

CREATE VIEW popular_songs AS
SELECT 
    s.id,
    s.title,
    s.artist,
    s.youtube_id,
    COUNT(ph.id) as play_count,
    COUNT(DISTINCT ph.user_id) as unique_listeners,
    COUNT(DISTINCT ps.playlist_id) as playlist_count
FROM songs s
LEFT JOIN play_history ph ON s.id = ph.song_id
LEFT JOIN playlist_songs ps ON s.id = ps.song_id
GROUP BY s.id, s.title, s.artist, s.youtube_id
ORDER BY play_count DESC;

-- 初始化完成
SELECT 'Database initialization completed successfully' as status;