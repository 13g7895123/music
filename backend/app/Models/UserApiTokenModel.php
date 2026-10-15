<?php

namespace App\Models;

use CodeIgniter\Model;

class UserApiTokenModel extends Model
{
    public const TOKEN_PREFIX = 'ylp_';
    public const MAX_TOKENS_PER_USER = 20;
    public const DESCRIPTION_MAX_LENGTH = 100;

    protected $table = 'user_api_tokens';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'user_id',
        'description',
        'token_hash',
        'token_prefix',
        'last_used_at',
    ];

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    /**
     * 列出使用者的所有 token（不含雜湊）
     */
    public function listForUser(int $userId): array
    {
        return $this->select('id, description, token_prefix, last_used_at, created_at')
            ->where('user_id', $userId)
            ->orderBy('id', 'DESC')
            ->findAll();
    }

    public function findForUser(int $id, int $userId): ?array
    {
        return $this->where('id', $id)->where('user_id', $userId)->first();
    }

    public function countForUser(int $userId): int
    {
        return $this->where('user_id', $userId)->countAllResults();
    }

    public function findByToken(string $token): ?array
    {
        return $this->where('token_hash', self::hashToken($token))->first();
    }

    /**
     * 為使用者新增一組 token，回傳 [id, 明文 token]，明文僅此一次可見
     */
    public function issueForUser(int $userId, string $description): array
    {
        $token = self::TOKEN_PREFIX . bin2hex(random_bytes(20));
        $id = $this->insert([
            'user_id' => $userId,
            'description' => $description,
            'token_hash' => self::hashToken($token),
            'token_prefix' => substr($token, 0, 12),
            'last_used_at' => null,
        ]);

        return [(int) $id, $token];
    }

    /**
     * 撤銷使用者自己的某一組 token，回傳是否有刪到
     */
    public function revokeForUser(int $id, int $userId): bool
    {
        $this->where('id', $id)->where('user_id', $userId)->delete();

        return $this->db->affectedRows() > 0;
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
