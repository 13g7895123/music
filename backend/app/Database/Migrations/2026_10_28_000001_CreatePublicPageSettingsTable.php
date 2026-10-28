<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 對外展示頁設定
 *
 * 每個頁面一列，page_key 目前只有 showcase。
 * allowed_ips 留空表示不限制來源；內容為以逗號或換行分隔的 IP / CIDR。
 */
class CreatePublicPageSettingsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'page_key' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
            'is_enabled' => ['type' => 'TINYINT', 'constraint' => 1, 'null' => false, 'default' => 0],
            'allowed_ips' => ['type' => 'TEXT', 'null' => true],
            'updated_by' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('page_key');
        $this->forge->createTable('public_page_settings', true);

        // 預設開啟、不限來源（依 2026-10-28 需求）；之後可在系統內隨時關閉。
        $this->db->query(
            'INSERT IGNORE INTO `public_page_settings` (`page_key`, `is_enabled`, `allowed_ips`, `created_at`) VALUES (?, ?, ?, ?)',
            ['showcase', 1, '', date('Y-m-d H:i:s')]
        );
    }

    public function down()
    {
        $this->forge->dropTable('public_page_settings', true);
    }
}
