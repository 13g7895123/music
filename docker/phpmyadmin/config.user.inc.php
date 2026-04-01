<?php
// 允許 HTTP 存取（不強制 HTTPS）
$cfg['ForceSSL'] = false;

// 關閉 session cookie 的 Secure flag，允許 HTTP 下正常設定 cookie
ini_set('session.cookie_secure', '0');
ini_set('session.cookie_samesite', 'Lax');
