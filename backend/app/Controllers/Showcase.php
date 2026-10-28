<?php

namespace App\Controllers;

use App\Libraries\IpAllowlist;
use App\Models\PublicPageSettingModel;

/**
 * 對外公開展示頁
 *
 * 開關與來源 IP 白名單由 /api/public-page/settings 管理（需登入）。
 * 頁面與圖片都套用同一組檢查，避免只鎖頁面、圖片仍可被直接取得。
 */
class Showcase extends BaseController
{
    private const PAGE_KEY = 'showcase';
    private const IMAGE_PATH = 'resources/showcase/261023_v1.png';

    /**
     * GET /showcase
     */
    public function show()
    {
        $denied = $this->guard();

        if ($denied !== null) {
            return $denied;
        }

        return $this->response
            ->setHeader('Content-Type', 'text/html; charset=UTF-8')
            ->setHeader('Cache-Control', 'no-store, private')
            ->setHeader('X-Robots-Tag', 'noindex, nofollow')
            ->setBody(view('showcase'));
    }

    /**
     * GET /showcase/image
     */
    public function image()
    {
        $denied = $this->guard();

        if ($denied !== null) {
            return $denied;
        }

        $path = ROOTPATH . self::IMAGE_PATH;

        if (! is_file($path)) {
            return $this->notFound();
        }

        $contents = file_get_contents($path);

        if ($contents === false) {
            return $this->notFound();
        }

        return $this->response
            ->setHeader('Content-Type', 'image/png')
            ->setHeader('Content-Length', (string) strlen($contents))
            ->setHeader('Cache-Control', 'no-store, private')
            ->setHeader('X-Content-Type-Options', 'nosniff')
            ->setBody($contents);
    }

    /**
     * 回傳拒絕用的 response，通過檢查則回 null。
     */
    private function guard()
    {
        $settings = (new PublicPageSettingModel())->getForPage(self::PAGE_KEY);

        // 關閉時一律視為不存在，不透露頁面曾經存在。
        if (! (bool) ($settings['is_enabled'] ?? false)) {
            return $this->notFound();
        }

        $allowedIps = trim((string) ($settings['allowed_ips'] ?? ''));

        if ($allowedIps !== '' && ! IpAllowlist::matches($this->request->getIPAddress(), $allowedIps)) {
            return $this->response
                ->setStatusCode(403)
                ->setHeader('Content-Type', 'text/plain; charset=UTF-8')
                ->setHeader('Cache-Control', 'no-store')
                ->setBody('Forbidden');
        }

        return null;
    }

    private function notFound()
    {
        return $this->response
            ->setStatusCode(404)
            ->setHeader('Content-Type', 'text/plain; charset=UTF-8')
            ->setHeader('Cache-Control', 'no-store')
            ->setBody('Not Found');
    }
}
