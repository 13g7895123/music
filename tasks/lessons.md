# Lessons

## 2026-10-22 PHP 升版只做 CLI 驗證，漏掉 HTTP 回應被 Deprecated 汙染

- 類別：missing verification
- 失敗模式：PHP 8.1 → 8.4 升版後只跑了 `php -v`、`php -l`、`composer validate`，判定完成；實際上 `app/Config/Boot/production.php` 使用 `E_STRICT`（PHP 8.4 起 deprecated），且該檔開啟 `display_errors=1`，每個 HTTP 回應前都會多一段 Deprecated HTML。
- 偵測訊號：在容器內用 `php -S` 打 `/api/*`，回應 body 出現 `<b>Deprecated</b>`。
- 預防規則：升級 PHP 或框架時，驗證必須包含「升級前 vs 升級後」的 HTTP 回應比對（至少 health、需認證路由、CORS preflight、一條 DB CRUD 流程），不能只做 CLI 檢查。
- Tripwire：`grep -rn "E_STRICT" backend/app backend/public`；HTTP 回應 body `grep -q Deprecated` 應為空。
