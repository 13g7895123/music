<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AllowMultipleUserApiTokens extends Migration
{
    // 每位使用者可擁有多組 token（不同環境各用一組），並加上使用者自填的說明
    public function up()
    {
        $this->db->query("ALTER TABLE `user_api_tokens` ADD COLUMN IF NOT EXISTS `description` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '使用者自填說明' AFTER `user_id`");
        // FK 需要 user_id 上有索引，先補一般索引再拿掉 UNIQUE
        $this->db->query('ALTER TABLE `user_api_tokens` ADD INDEX IF NOT EXISTS `idx_user_id` (`user_id`)');
        $this->db->query('ALTER TABLE `user_api_tokens` DROP INDEX IF EXISTS `unique_user_id`');
    }

    public function down()
    {
        // 還原成一人一組：每位使用者只保留最新的 token
        $this->db->query('DELETE t FROM `user_api_tokens` t JOIN `user_api_tokens` n ON n.`user_id` = t.`user_id` AND n.`id` > t.`id`');
        $this->db->query('ALTER TABLE `user_api_tokens` ADD UNIQUE KEY IF NOT EXISTS `unique_user_id` (`user_id`)');
        $this->db->query('ALTER TABLE `user_api_tokens` DROP INDEX IF EXISTS `idx_user_id`');
        $this->db->query('ALTER TABLE `user_api_tokens` DROP COLUMN IF EXISTS `description`');
    }
}
