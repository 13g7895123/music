<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 基礎 schema（2026-09 之前的資料表結構）
 *
 * 取代原本的 backend/database/migrations.sql 與 2025 年的各個建表 migration：
 * 前六張表的 SQL 與舊 migrations.sql 完全相同，正式環境既有的表結構因此不變；
 * guest_sessions、line_login_logs 沿用原本 forge 的定義。
 * 全部都是 IF NOT EXISTS，已存在的資料庫跑這支不會有任何變更。
 * 之後的結構變更請新增 migration，不要再改這支。
 */
class InitialSchema extends Migration
{
    public function up()
    {
        $this->db->query(<<<'SQL'
            CREATE TABLE IF NOT EXISTS `users` (
                `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
                `line_user_id` VARCHAR(255) NOT NULL,
                `display_name` VARCHAR(255) NOT NULL,
                `avatar_url` TEXT NULL,
                `email` VARCHAR(255) NULL,
                `status` ENUM('active', 'soft_deleted') NOT NULL DEFAULT 'active',
                `created_at` DATETIME NOT NULL,
                `updated_at` DATETIME NULL,
                `deleted_at` DATETIME NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `unique_line_user_id` (`line_user_id`),
                KEY `idx_status` (`status`),
                KEY `idx_deleted_at` (`deleted_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);

        $this->db->query(<<<'SQL'
            CREATE TABLE IF NOT EXISTS `videos` (
                `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
                `user_id` INT(11) UNSIGNED NULL COMMENT '影片擁有者 ID',
                `video_id` VARCHAR(50) NOT NULL UNIQUE COMMENT 'YouTube 影片 ID',
                `title` VARCHAR(255) NOT NULL COMMENT '影片標題',
                `description` TEXT NULL COMMENT '影片描述',
                `duration` INT UNSIGNED NULL COMMENT '影片長度（秒）',
                `thumbnail_url` VARCHAR(500) NULL COMMENT '縮圖 URL',
                `youtube_url` VARCHAR(500) NOT NULL COMMENT 'YouTube 網址',
                `channel_id` VARCHAR(100) NULL COMMENT '頻道 ID',
                `channel_name` VARCHAR(255) NULL COMMENT '頻道名稱',
                `published_at` DATETIME NULL COMMENT '發布時間',
                `created_at` DATETIME NULL,
                `updated_at` DATETIME NULL,
                `deleted_at` DATETIME NULL COMMENT '軟刪除時間',
                PRIMARY KEY (`id`),
                KEY `idx_video_id` (`video_id`),
                KEY `idx_channel_id` (`channel_id`),
                KEY `idx_created_at` (`created_at`),
                KEY `idx_user_id` (`user_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);

        $this->db->query(<<<'SQL'
            CREATE TABLE IF NOT EXISTS `user_tokens` (
                `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
                `user_id` INT(11) UNSIGNED NOT NULL,
                `access_token` VARCHAR(512) NOT NULL,
                `refresh_token` VARCHAR(512) NULL,
                `token_type` VARCHAR(50) NOT NULL DEFAULT 'Bearer',
                `expires_at` DATETIME NOT NULL,
                `device_id` VARCHAR(255) NULL,
                `ip_address` VARCHAR(45) NULL,
                `user_agent` TEXT NULL,
                `created_at` DATETIME NOT NULL,
                `updated_at` DATETIME NULL,
                PRIMARY KEY (`id`),
                KEY `idx_user_id` (`user_id`),
                KEY `idx_expires_at` (`expires_at`),
                KEY `idx_access_token` (`access_token`(255)),
                CONSTRAINT `fk_user_tokens_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);

        $this->db->query(<<<'SQL'
            CREATE TABLE IF NOT EXISTS `video_library` (
                `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
                `user_id` INT(11) UNSIGNED NOT NULL,
                `video_id` VARCHAR(20) NOT NULL,
                `title` VARCHAR(255) NOT NULL,
                `thumbnail_url` TEXT NULL,
                `duration` INT(11) UNSIGNED NULL,
                `channel_name` VARCHAR(255) NULL,
                `created_at` DATETIME NOT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `unique_user_video` (`user_id`, `video_id`),
                KEY `idx_user_id` (`user_id`),
                CONSTRAINT `fk_video_library_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);

        $this->db->query(<<<'SQL'
            CREATE TABLE IF NOT EXISTS `playlists` (
                `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
                `user_id` INT(11) UNSIGNED NOT NULL COMMENT '會員 ID',
                `name` VARCHAR(255) NOT NULL COMMENT '播放清單名稱',
                `description` TEXT NULL COMMENT '播放清單描述',
                `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否啟用',
                `item_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '項目數量',
                `created_at` DATETIME NULL,
                `updated_at` DATETIME NULL,
                `deleted_at` DATETIME NULL COMMENT '軟刪除時間',
                PRIMARY KEY (`id`),
                KEY `idx_user_id` (`user_id`),
                KEY `idx_name` (`name`),
                KEY `idx_is_active` (`is_active`),
                KEY `idx_created_at` (`created_at`),
                CONSTRAINT `fk_playlists_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);

        $this->db->query(<<<'SQL'
            CREATE TABLE IF NOT EXISTS `playlist_items` (
                `id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
                `playlist_id` INT UNSIGNED NOT NULL COMMENT '播放清單 ID',
                `video_id` INT UNSIGNED NOT NULL COMMENT '影片 ID',
                `position` INT UNSIGNED NOT NULL COMMENT '播放位置',
                `created_at` DATETIME NULL,
                `updated_at` DATETIME NULL,
                PRIMARY KEY (`id`),
                KEY `idx_playlist_id` (`playlist_id`),
                KEY `idx_video_id` (`video_id`),
                UNIQUE KEY `unique_playlist_position` (`playlist_id`, `position`),
                CONSTRAINT `fk_playlist_items_playlist` FOREIGN KEY (`playlist_id`) REFERENCES `playlists` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT `fk_playlist_items_video` FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            SQL);

        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'session_id' => ['type' => 'VARCHAR', 'constraint' => 128, 'null' => false],
            'history_data' => ['type' => 'JSON', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
            'expires_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('session_id');
        $this->forge->addKey('expires_at');
        $this->forge->createTable('guest_sessions', true);

        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'session_id' => ['type' => 'VARCHAR', 'constraint' => 128, 'null' => false],
            'step' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
            'status' => ['type' => 'ENUM', 'constraint' => ['success', 'error', 'warning'], 'null' => false],
            'line_user_id' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'request_data' => ['type' => 'TEXT', 'null' => true],
            'response_data' => ['type' => 'TEXT', 'null' => true],
            'error_message' => ['type' => 'TEXT', 'null' => true],
            'ip_address' => ['type' => 'VARCHAR', 'constraint' => 45, 'null' => true],
            'user_agent' => ['type' => 'TEXT', 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => false],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('session_id');
        $this->forge->addKey('status');
        $this->forge->addKey('created_at');
        $this->forge->createTable('line_login_logs', true);

        // 被這支取代、檔案已刪除的舊 migration，移除其執行紀錄，避免 rollback 時找不到檔案
        $this->db->table(config('Migrations')->table)
            ->where('namespace', 'App')
            ->whereIn('class', array_map(static fn ($c) => 'App\\Database\\Migrations\\' . $c, [
                'CreateVideosTable',
                'CreatePlaylistsTable',
                'CreatePlaylistItemsTable',
                'CreateLineLoginTables',
                'CreateLineLoginLogsTable',
                'AddUserIdToPlaylistsTable',
                'AddUserIdToVideosTable',
            ]))
            ->delete();
    }

    public function down()
    {
        foreach (['line_login_logs', 'guest_sessions', 'playlist_items', 'playlists', 'video_library', 'user_tokens', 'videos', 'users'] as $table) {
            $this->forge->dropTable($table, true);
        }
    }
}
