<?php

namespace App\Controllers\Api;

use App\Libraries\IpAllowlist;
use App\Libraries\ShowcaseImage;
use App\Models\PublicPageSettingModel;
use CodeIgniter\API\ResponseTrait;
use CodeIgniter\Controller;
use CodeIgniter\HTTP\Exceptions\HTTPException;
use CodeIgniter\HTTP\Files\UploadedFile;
use RuntimeException;

/**
 * 公開展示頁設定（需登入）
 *
 * GET    /api/public-page/settings          讀取設定
 * PUT    /api/public-page/settings          更新開關與白名單
 * POST   /api/public-page/image             上傳展示圖片（multipart，欄位 image）
 * DELETE /api/public-page/image             還原為內建預設圖片
 */
class PublicPageSettingsController extends Controller
{
    use ResponseTrait;

    protected $helpers = ['response'];

    // 必須是 json，否則 respond() 不會輸出標準 API envelope
    protected $format = 'json';

    private const PAGE_KEY = 'showcase';
    private const MAX_ALLOWED_IPS_LENGTH = 4000;

    public function show()
    {
        $settings = (new PublicPageSettingModel())->getForPage(self::PAGE_KEY);

        return $this->respond(api_success($this->presentSettings($settings)));
    }

    public function update()
    {
        try {
            $payload = $this->request->getJSON(true);
        } catch (HTTPException) {
            return $this->fail('請求格式錯誤，需為 JSON 物件', 400);
        }

        if (! is_array($payload)) {
            return $this->fail('請求格式錯誤，需為 JSON 物件', 400);
        }

        if (! array_key_exists('is_enabled', $payload) || ! is_bool($payload['is_enabled'])) {
            return $this->fail('缺少 is_enabled（需為布林值）', 422);
        }

        $model = new PublicPageSettingModel();
        $current = $model->getForPage(self::PAGE_KEY);

        $allowedIps = array_key_exists('allowed_ips', $payload)
            ? $payload['allowed_ips']
            : $current['allowed_ips'];

        if (! is_string($allowedIps)) {
            return $this->fail('allowed_ips 需為字串', 422);
        }

        $allowedIps = trim($allowedIps);

        if (mb_strlen($allowedIps) > self::MAX_ALLOWED_IPS_LENGTH) {
            return $this->fail('IP 白名單過長（最多 ' . self::MAX_ALLOWED_IPS_LENGTH . ' 字元）', 422);
        }

        $invalid = IpAllowlist::invalidEntries($allowedIps);

        if ($invalid !== []) {
            return $this->fail('IP 格式錯誤：' . implode(', ', $invalid), 422);
        }

        $model->update($current['id'], [
            'is_enabled' => $payload['is_enabled'] ? 1 : 0,
            'allowed_ips' => $allowedIps,
            'updated_by' => $this->request->userId,
        ]);

        return $this->respond(api_success(
            $this->presentSettings($model->getForPage(self::PAGE_KEY)),
            '公開展示頁設定已更新'
        ));
    }

    /**
     * POST /api/public-page/image
     */
    public function uploadImage()
    {
        $file = $this->request->getFile('image');

        if (! $file instanceof UploadedFile) {
            return $this->fail('缺少圖片檔案（表單欄位名稱需為 image）', 422);
        }

        try {
            $filename = ShowcaseImage::store($file);
        } catch (RuntimeException $e) {
            return $this->fail($e->getMessage(), 422);
        }

        $model   = new PublicPageSettingModel();
        $current = $model->getForPage(self::PAGE_KEY);

        // 換圖後清掉舊檔，避免上傳目錄愈積愈多
        ShowcaseImage::delete($current['image_path'] ?? null);

        $model->update($current['id'], [
            'image_path' => $filename,
            'updated_by' => $this->request->userId,
        ]);

        return $this->respond(api_success(
            $this->presentSettings($model->getForPage(self::PAGE_KEY)),
            '展示圖片已更新'
        ));
    }

    /**
     * DELETE /api/public-page/image
     */
    public function resetImage()
    {
        $model   = new PublicPageSettingModel();
        $current = $model->getForPage(self::PAGE_KEY);

        ShowcaseImage::delete($current['image_path'] ?? null);

        $model->update($current['id'], [
            'image_path' => null,
            'updated_by' => $this->request->userId,
        ]);

        return $this->respond(api_success(
            $this->presentSettings($model->getForPage(self::PAGE_KEY)),
            '已還原為預設圖片'
        ));
    }

    /**
     * 注意：不可命名為 format()，會覆蓋 ResponseTrait 內部的同名私有方法。
     */
    private function presentSettings(array $settings): array
    {
        $image = ShowcaseImage::resolve($settings['image_path'] ?? null);

        return [
            'page_key' => self::PAGE_KEY,
            'is_enabled' => (bool) ($settings['is_enabled'] ?? false),
            'allowed_ips' => (string) ($settings['allowed_ips'] ?? ''),
            'public_path' => '/showcase',
            'image_path' => '/showcase/image',
            // v 參數用檔案修改時間，換圖後前端預覽才會更新
            'image_url' => '/showcase/image?v=' . ($image === null ? 0 : filemtime($image['path'])),
            'image_source' => $image['source'] ?? 'default',
            'detected_ip' => $this->request->getIPAddress(),
            'updated_at' => $settings['updated_at'] ?? null,
        ];
    }
}
