<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 公開展示頁：新增可替換的圖片欄位
 *
 * image_path 存的是 writable/uploads/showcase/ 下的檔名（僅檔名，不含路徑）。
 * 為 NULL 時使用專案內建的預設圖片 backend/resources/showcase/261023_v1.png。
 */
class AddImagePathToPublicPageSettings extends Migration
{
    public function up()
    {
        $this->forge->addColumn('public_page_settings', [
            'image_path' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
                'after'      => 'allowed_ips',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('public_page_settings', 'image_path');
    }
}
