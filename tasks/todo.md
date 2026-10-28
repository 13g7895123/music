# 公開展示頁（/showcase）

## 目標
- 新增對外公開頁面，顯示 `261023_v1.png`，供 NPM 代理/呼叫。
- 後台可開關、可設定來源 IP 白名單（比對 X-Forwarded-For 的真實訪客 IP）。
- 預設開啟、白名單空白（不限來源）。

## 驗收條件
- `GET /showcase` 顯示圖片頁；`GET /showcase/image` 回傳 PNG。
- 關閉時兩個端點皆回 404；IP 不在白名單回 403。
- `GET/PUT /api/public-page/settings`（需登入）可讀寫設定。
- 前端 `/showcase-settings` 可操作開關與白名單。
- `php -l`、ESLint、Vite build、nginx -t 通過。

## 工作項目
- [x] 確認需求與架構（NPM → Gateway nginx → backend）
- [x] Migration：`public_page_settings` + 預設資料
- [x] Model + IP 白名單比對（`App\Libraries\IpAllowlist`）
- [x] 公開頁 controller / view / 圖片
- [x] 設定 API + 路由
- [x] Nginx `/showcase` 轉發
- [x] 前端設定頁、路由、導覽、API service
- [x] README 使用說明
- [x] 驗證：PHP lint、IP 比對腳本、ESLint、build、nginx -t、Docker 端到端

## 驗證紀錄
- `php -l`：6 個新/改檔案全數 No syntax errors。
- `/tmp/test_ipallowlist.php`（32 案例，IPv4/IPv6/CIDR/多筆/非法值）：ALL PASS。
- `npx eslint`：0 error / 0 warning；`npm run build`：成功。
- `nginx -t`（測試容器掛載 `docker/nginx/nginx.conf`）：syntax ok。
- Docker 端到端（backend 用 `Dockerfile.prod`、測試 MariaDB、gateway nginx，port 18999）：
  - allowlist `203.0.113.10` + `10.0.0.0/8` → 命中 200、未命中 403、無 XFF（代理 IP）403。
  - `/showcase/image` 下載 bytes 與 `backend/resources/showcase/261023_v1.png` 完全一致。
  - 關閉開關 → 頁面/image 都 404；開啟且白名單留空 → 任意來源 200。
  - PUT：非法 IP → 422；`is_enabled` 非布林 → 422；非 JSON → 400；未登入 GET → 401。
  - 瀏覽器（Playwright）：導覽列「展示頁」→ `/showcase-settings` 正常載入（0 console error），
    「加入白名單」帶入偵測 IP、儲存成功並寫回後端；`/showcase` 圖片載入成功（2938×2463）、無橫向溢出。

## 踩到的坑（已修正）
- `ResponseTrait` 內有私有 `format()`；controller 若同名會覆蓋它，導致 `respond()` 把 envelope
  再丟進自家格式化函式，回應變成「預設值」的扁平陣列。已改名 `presentSettings()` 並補
  `protected $format = 'json'`。

## 風險
- 低-中：新增對外端點。預設不限來源（依需求），但可立即用開關關閉。
- 白名單依 `X-Forwarded-For` 最左值判斷；若最前面沒有 Cloudflare 等會覆寫標頭的服務，
  訪客可偽造標頭繞過（已於 README 註明），屬弱保護非強認證。
- 回復方式：把開關關閉；或 revert 本次變更。
