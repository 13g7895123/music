<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class ScopeVideosUniqueKeyToUser extends Migration
{
    // videos.video_id 原本全域 UNIQUE，導致不同使用者無法收藏同一部影片
    public function up()
    {
        $this->db->query('ALTER TABLE `videos` DROP INDEX IF EXISTS `video_id`');
        $this->db->query('ALTER TABLE `videos` ADD UNIQUE KEY IF NOT EXISTS `unique_user_video` (`user_id`, `video_id`)');
    }

    public function down()
    {
        $this->db->query('ALTER TABLE `videos` DROP INDEX IF EXISTS `unique_user_video`');
    }
}
