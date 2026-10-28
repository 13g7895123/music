<?php

namespace App\Libraries;

use CodeIgniter\HTTP\Files\UploadedFile;
use RuntimeException;

/**
 * 公開展示頁圖片來源管理
 *
 * 上傳的圖片存在 writable/uploads/showcase/（production 由 volume 掛載保存），
 * 資料庫只記錄檔名；沒有自訂圖片時使用專案內建的預設圖片。
 */
class ShowcaseImage
{
    public const DEFAULT_RELATIVE_PATH = 'resources/showcase/261023_v1.png';
    public const MAX_BYTES            = 10 * 1024 * 1024;

    private const ALLOWED_MIMES = [
        'image/png'  => 'png',
        'image/jpeg' => 'jpg',
        'image/webp' => 'webp',
    ];

    public static function uploadsDir(): string
    {
        return WRITEPATH . 'uploads/showcase/';
    }

    public static function defaultPath(): string
    {
        return ROOTPATH . self::DEFAULT_RELATIVE_PATH;
    }

    /**
     * 解析目前要顯示的圖片（自訂優先，其次內建預設）。
     *
     * @return array{path: string, mime: string, source: string}|null
     */
    public static function resolve(?string $storedFilename): ?array
    {
        $custom = self::customPath($storedFilename);

        if ($custom !== null && is_file($custom)) {
            $mime = self::detectMime($custom);

            if ($mime !== null) {
                return ['path' => $custom, 'mime' => $mime, 'source' => 'custom'];
            }
        }

        $default = self::defaultPath();

        if (is_file($default)) {
            return [
                'path'   => $default,
                'mime'   => self::detectMime($default) ?? 'image/png',
                'source' => 'default',
            ];
        }

        return null;
    }

    /**
     * 驗證並儲存上傳檔，回傳新檔名。
     *
     * @throws RuntimeException 驗證或寫入失敗，訊息可直接回給使用者
     */
    public static function store(UploadedFile $file): string
    {
        if (! $file->isValid()) {
            throw new RuntimeException('圖片上傳失敗：' . $file->getErrorString());
        }

        if ($file->getSize() > self::MAX_BYTES) {
            throw new RuntimeException('圖片不可超過 ' . (self::MAX_BYTES / 1024 / 1024) . ' MB');
        }

        // 以檔案內容判斷型別，不信任客戶端提供的檔名或 Content-Type
        $extension = self::ALLOWED_MIMES[$file->getMimeType()] ?? null;

        if ($extension === null) {
            throw new RuntimeException('僅支援 PNG、JPEG、WebP 圖片');
        }

        $info = @getimagesizefromstring((string) file_get_contents($file->getTempName()));

        if ($info === false || $info[0] < 1 || $info[1] < 1) {
            throw new RuntimeException('檔案不是有效的圖片');
        }

        $dir = self::uploadsDir();

        if (! is_dir($dir) && ! @mkdir($dir, 0775, true) && ! is_dir($dir)) {
            throw new RuntimeException('無法建立圖片儲存目錄');
        }

        $filename = 'poster-' . date('YmdHis') . '-' . bin2hex(random_bytes(4)) . '.' . $extension;

        if (! $file->move($dir, $filename)) {
            throw new RuntimeException('圖片儲存失敗：' . $file->getErrorString());
        }

        return $filename;
    }

    /**
     * 刪除自訂圖片；預設圖片不會被刪除。
     */
    public static function delete(?string $storedFilename): void
    {
        $path = self::customPath($storedFilename);

        if ($path !== null && is_file($path)) {
            @unlink($path);
        }
    }

    /**
     * 只接受 uploads 目錄下的單純檔名，避免路徑穿越。
     */
    private static function customPath(?string $storedFilename): ?string
    {
        if ($storedFilename === null) {
            return null;
        }

        $storedFilename = trim($storedFilename);

        if ($storedFilename === '' || basename($storedFilename) !== $storedFilename) {
            return null;
        }

        return self::uploadsDir() . $storedFilename;
    }

    private static function detectMime(string $path): ?string
    {
        $mime = mime_content_type($path);

        return is_string($mime) && isset(self::ALLOWED_MIMES[$mime]) ? $mime : null;
    }
}
