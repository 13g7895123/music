<?php

namespace App\Filters;

use App\Models\UserApiTokenModel;
use App\Models\UserModel;
use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;

/**
 * 以 Authorization: Bearer <personal token> 驗證（瀏覽器擴充功能用）
 */
class ApiTokenFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $header = $request->getHeaderLine('Authorization');

        if (!preg_match('/^Bearer\s+(\S+)$/i', $header, $matches)) {
            return $this->unauthorized('缺少 API Token');
        }

        $tokenModel = new UserApiTokenModel();
        $row = $tokenModel->findByToken($matches[1]);

        if (!$row) {
            return $this->unauthorized('API Token 無效或已被撤銷');
        }

        $user = (new UserModel())->find($row['user_id']);
        if (!$user || $user['status'] !== 'active') {
            return $this->unauthorized('使用者不存在或已停用');
        }

        $tokenModel->touchLastUsed($row);
        $request->userId = (int) $row['user_id'];

        return $request;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }

    private function unauthorized(string $message): ResponseInterface
    {
        return Services::response()->setStatusCode(401)->setJSON([
            'status' => 'error',
            'code' => 401,
            'message' => $message,
        ]);
    }
}
