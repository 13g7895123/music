<?php

namespace App\Models;

use CodeIgniter\Model;

class UserApiTokenModel extends Model
{
    public const TOKEN_PREFIX = 'ylp_';

    protected $table = 'user_api_tokens';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'user_id',
        'token_hash',
        'token_prefix',
        'last_used_at',
    ];

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    public function findByUserId(int $userId): ?array
    {
        return $this->where('user_id', $userId)->first();
    }

    public function findByToken(string $token): ?array
    {
        return $this->where('token_hash', self::hashToken($token))->first();
    }

    /**
     * 產生（或重新產生）使用者的 token，回傳明文 token，僅此一次可見
     */
    public function issueForUser(int $userId): string
    {
        $token = self::TOKEN_PREFIX . bin2hex(random_bytes(20));
        $data = [
            'user_id' => $userId,
            'token_hash' => self::hashToken($token),
            'token_prefix' => substr($token, 0, 12),
            'last_used_at' => null,
        ];

        $existing = $this->findByUserId($userId);
        if ($existing) {
            $this->update($existing['id'], $data);
        } else {
            $this->insert($data);
        }

        return $token;
    }

    public function revokeForUser(int $userId): void
    {
        $this->where('user_id', $userId)->delete();
    }

    public function touchLastUsed(array $row): void
    {
        // 同一分鐘內不重複寫入，避免每個請求都打 DB
        if ($row['last_used_at'] && strtotime($row['last_used_at']) > time() - 60) {
            return;
        }
        $this->update($row['id'], ['last_used_at' => date('Y-m-d H:i:s')]);
    }

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }
}
