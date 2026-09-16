<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class CorsFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        // 處理 preflight 請求
        if ($request->getMethod() === 'OPTIONS') {
            $response = \Config\Services::response();
            $origin = $request->getServer('HTTP_ORIGIN') ?? '*';

            if ($this->isAllowedOrigin($origin)) {
                $response->setHeader('Access-Control-Allow-Origin', $origin);
                $response->setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
                $response->setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Cookie');
                $response->setHeader('Access-Control-Expose-Headers', 'Content-Type, X-Total-Count');
                $response->setHeader('Access-Control-Max-Age', '7200');
                $response->setHeader('Access-Control-Allow-Credentials', 'true');
            }

            return $response->setStatusCode(204);
        }

        return $request;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        $origin = $request->getServer('HTTP_ORIGIN') ?? null;

        // 調試日誌：記錄 filter 執行情況
        log_message('debug', '🔍 CorsFilter after() - Origin: ' . ($origin ?? 'null'));

        // 檢查 response 中是否有 Set-Cookie
        $cookies = $response->getHeader('Set-Cookie');
        log_message('debug', '🍪 CorsFilter after() - Set-Cookie headers: ' . json_encode($cookies ? $cookies->getValue() : 'none'));

        // 只在有 origin 且在允許清單中時設置 CORS headers
        if ($origin && $this->isAllowedOrigin($origin)) {
            $response->setHeader('Access-Control-Allow-Origin', $origin);
            $response->setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            $response->setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Cookie');
            $response->setHeader('Access-Control-Expose-Headers', 'Content-Type, X-Total-Count, Set-Cookie');
            $response->setHeader('Access-Control-Max-Age', '7200');
            $response->setHeader('Access-Control-Allow-Credentials', 'true');

            log_message('debug', '✅ CorsFilter after() - CORS headers set for origin: ' . $origin);
        } else {
            log_message('warning', '⚠️ CorsFilter after() - Origin not in allowed list or null: ' . ($origin ?? 'null'));
        }

        // 最終檢查所有 headers
        $allHeaders = $response->headers();
        log_message('debug', '📤 CorsFilter after() - All response headers: ' . json_encode(array_keys($allHeaders)));

        return $response;
    }

    private function isAllowedOrigin(string $origin): bool
    {
        // 瀏覽器擴充功能的來源（Chrome / Firefox），身分靠 Bearer token 而非 cookie
        if (preg_match('~^(chrome|moz)-extension://~', $origin)) {
            return true;
        }

        // 從環境變數讀取允許的 origins
        $frontendUrl = getenv('FRONTEND_URL') ?: 'http://localhost:5173';

        $allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:8080',
            'http://localhost',
            $frontendUrl,  // 支援生產環境
        ];

        return in_array($origin, $allowedOrigins, true);
    }
}
