<?php

namespace App\Models;

use CodeIgniter\Model;

class PublicPageSettingModel extends Model
{
    public const PAGE_SHOWCASE = 'showcase';

    protected $table = 'public_page_settings';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'page_key',
        'is_enabled',
        'allowed_ips',
        'image_path',
        'updated_by',
    ];

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    /**
     * 取得指定頁面設定；若資料列不存在則以安全預設值（關閉）建立。
     */
    public function getForPage(string $pageKey): array
    {
        $row = $this->where('page_key', $pageKey)->first();

        if ($row === null) {
            $this->insert([
                'page_key' => $pageKey,
                'is_enabled' => 0,
                'allowed_ips' => '',
            ]);

            $row = $this->where('page_key', $pageKey)->first();
        }

        return $row;
    }
}
