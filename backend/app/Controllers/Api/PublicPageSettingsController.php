<?php

namespace App\Controllers\Api;

use App\Libraries\IpAllowlist;
use App\Models\PublicPageSettingModel;
use CodeIgniter\API\ResponseTrait;
use CodeIgniter\Controller;
use CodeIgniter\HTTP\Exceptions\HTTPException;

/**
 * 公開展示頁設定（需登入）
 *
 * GET  /api/public-page/settings
 * PUT  /api/public-page/settings  body: { is_enabled: bool, allowed_ips: string }
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
     * 注意：不可命名為 format()，會覆蓋 ResponseTrait 內部的同名私有方法。
     */
    private function presentSettings(array $settings): array
    {
        return [
            'page_key' => self::PAGE_KEY,
            'is_enabled' => (bool) ($settings['is_enabled'] ?? false),
            'allowed_ips' => (string) ($settings['allowed_ips'] ?? ''),
            'public_path' => '/showcase',
            'image_path' => '/showcase/image',
            'detected_ip' => $this->request->getIPAddress(),
            'updated_at' => $settings['updated_at'] ?? null,
        ];
    }
}
