<?php

namespace App\Controllers\Api;

use App\Models\UserApiTokenModel;
use App\Models\UserModel;
use App\Models\VideoModel;
use CodeIgniter\API\ResponseTrait;
use CodeIgniter\Controller;

/**
 * 瀏覽器擴充功能 API
 *
 * token* 方法走網站登入（auth filter），其餘走個人 API Token（apitoken filter）
 */
class ExtensionController extends Controller
{
    use ResponseTrait;

    protected $format = 'json';
    protected $helpers = ['response'];

    // ========== Token 管理（網站登入後） ==========

    /**
     * GET /api/extension/tokens
     */
    public function listTokens()
    {
        $tokens = (new UserApiTokenModel())->listForUser($this->request->userId);

        return $this->respond(api_success([
            'tokens' => array_map([self::class, 'formatToken'], $tokens),
            'max_tokens' => UserApiTokenModel::MAX_TOKENS_PER_USER,
        ]));
    }

    /**
     * POST /api/extension/tokens  body: { description }
     * 明文 token 只回傳這一次
     */
    public function createToken()
    {
        $userId = $this->request->userId;
        $model = new UserApiTokenModel();

        $description = $this->readDescription();
        if ($description === null) {
            return $this->fail('請填寫說明（最多 ' . UserApiTokenModel::DESCRIPTION_MAX_LENGTH . ' 字）', 422);
        }

        if ($model->countForUser($userId) >= UserApiTokenModel::MAX_TOKENS_PER_USER) {
            return $this->fail('Token 數量已達上限（' . UserApiTokenModel::MAX_TOKENS_PER_USER . ' 組），請先撤銷不用的 Token', 422);
        }

        [$id, $token] = $model->issueForUser($userId, $description);
        $row = $model->find($id);

        return $this->respondCreated(api_success(
            self::formatToken($row) + ['token' => $token],
            'Token 已產生',
            201
        ));
    }

    /**
     * PATCH /api/extension/tokens/{id}  body: { description }
     */
    public function updateToken(int $id)
    {
        $userId = $this->request->userId;
        $model = new UserApiTokenModel();

        if (!$model->findForUser($id, $userId)) {
            return $this->failNotFound('找不到這組 Token');
        }

        $description = $this->readDescription();
        if ($description === null) {
            return $this->fail('請填寫說明（最多 ' . UserApiTokenModel::DESCRIPTION_MAX_LENGTH . ' 字）', 422);
        }

        $model->update($id, ['description' => $description]);

        return $this->respond(api_success(self::formatToken($model->find($id)), '說明已更新'));
    }

    /**
     * DELETE /api/extension/tokens/{id}
     */
    public function revokeToken(int $id)
    {
        if (!(new UserApiTokenModel())->revokeForUser($id, $this->request->userId)) {
            return $this->failNotFound('找不到這組 Token');
        }

        return $this->respond(api_success(null, 'Token 已撤銷'));
    }

    private function readDescription(): ?string
    {
        $data = $this->request->getJSON(true) ?? [];
        $description = trim((string) ($data['description'] ?? ''));

        if ($description === '' || mb_strlen($description) > UserApiTokenModel::DESCRIPTION_MAX_LENGTH) {
            return null;
        }

        return $description;
    }

    private static function formatToken(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'description' => $row['description'],
            'token_prefix' => $row['token_prefix'],
            'created_at' => $row['created_at'],
            'last_used_at' => $row['last_used_at'],
        ];
    }

    // ========== 擴充功能使用（Bearer token） ==========

    /**
     * GET /api/extension/me
     */
    public function me()
    {
        $userId = $this->request->userId;
        $user = (new UserModel())->find($userId);
        $videoCount = (new VideoModel())->where('user_id', $userId)->countAllResults();

        return $this->respond(api_success([
            'id' => (int) $user['id'],
            'display_name' => $user['display_name'],
            'avatar_url' => $user['avatar_url'],
            'video_count' => $videoCount,
        ]));
    }

    /**
     * GET /api/extension/videos/check?video_id=xxx
     */
    public function checkVideo()
    {
        $videoId = self::extractVideoId((string) $this->request->getGet('video_id'));
        if (!$videoId) {
            return $this->fail('video_id 格式錯誤', 400);
        }

        $video = (new VideoModel())->findByYoutubeId($videoId, $this->request->userId);

        return $this->respond(api_success([
            'video_id' => $videoId,
            'exists' => $video !== null,
            'video' => $video,
        ]));
    }

    /**
     * POST /api/extension/videos
     * body: { video_id | url, title?, thumbnail_url?, channel_name?, duration? }
     */
    public function addVideo()
    {
        $userId = $this->request->userId;
        $data = $this->request->getJSON(true) ?? [];

        $videoId = self::extractVideoId((string) ($data['video_id'] ?? $data['url'] ?? ''));
        if (!$videoId) {
            return $this->fail('無法辨識 YouTube 影片 ID，請提供 video_id 或 url', 422);
        }

        $model = new VideoModel();

        $existing = $model->findByYoutubeId($videoId, $userId);
        if ($existing) {
            return $this->respond(api_error('該影片已存在於您的影片庫', 409, ['video' => $existing]), 409);
        }

        $title = trim((string) ($data['title'] ?? ''));
        $channelName = trim((string) ($data['channel_name'] ?? ''));
        $thumbnailUrl = trim((string) ($data['thumbnail_url'] ?? ''));

        if ($title === '' || $channelName === '') {
            $info = $this->fetchOEmbed($videoId);
            $title = $title !== '' ? $title : ($info['title'] ?? '');
            $channelName = $channelName !== '' ? $channelName : ($info['author_name'] ?? '');
            $thumbnailUrl = $thumbnailUrl !== '' ? $thumbnailUrl : ($info['thumbnail_url'] ?? '');
        }

        $duration = isset($data['duration']) && is_numeric($data['duration'])
            ? (int) floor((float) $data['duration'])
            : null;

        $insert = [
            'user_id' => $userId,
            'video_id' => $videoId,
            'title' => mb_substr($title !== '' ? $title : '未知標題', 0, 255),
            'youtube_url' => "https://www.youtube.com/watch?v={$videoId}",
            'thumbnail_url' => $thumbnailUrl !== '' ? $thumbnailUrl : "https://i.ytimg.com/vi/{$videoId}/hqdefault.jpg",
            'channel_name' => $channelName !== '' ? mb_substr($channelName, 0, 255) : null,
            'duration' => $duration > 0 ? $duration : null,
        ];

        if (!$model->insert($insert)) {
            return $this->fail('建立失敗: ' . implode(', ', $model->errors()), 400);
        }

        $video = $model->find($model->getInsertID());

        return $this->respondCreated(api_success($video, '已加入影片庫', 201));
    }

    // ========== helpers ==========

    /**
     * 接受純 ID 或各種 YouTube 網址（watch / youtu.be / shorts / embed / live）
     */
    public static function extractVideoId(string $input): ?string
    {
        $input = trim($input);
        if ($input === '') {
            return null;
        }

        if (preg_match('/^[A-Za-z0-9_-]{11}$/', $input)) {
            return $input;
        }

        $patterns = [
            '/[?&]v=([A-Za-z0-9_-]{11})/',
            '~youtu\.be/([A-Za-z0-9_-]{11})~',
            '~/(?:shorts|embed|live|v)/([A-Za-z0-9_-]{11})~',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $input, $m)) {
                return $m[1];
            }
        }

        return null;
    }

    private function fetchOEmbed(string $videoId): array
    {
        try {
            $client = service('curlrequest', ['timeout' => 5, 'http_errors' => false]);
            $response = $client->get('https://www.youtube.com/oembed', [
                'query' => [
                    'url' => "https://www.youtube.com/watch?v={$videoId}",
                    'format' => 'json',
                ],
            ]);

            if ($response->getStatusCode() === 200) {
                return json_decode($response->getBody(), true) ?: [];
            }
        } catch (\Throwable $e) {
            log_message('warning', "oEmbed fetch failed for {$videoId}: {$e->getMessage()}");
        }

        return [];
    }
}
