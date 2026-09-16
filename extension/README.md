# YouTube Loop Player 瀏覽器擴充功能

在 YouTube 影片頁一鍵把影片加到自己的影片庫。支援 Chrome（Manifest V3）與 Firefox（MV3，115+）。

## 運作方式

- 網站的「擴充功能」頁面（`/extension`）可為每位使用者產生一組個人 API Token（`ylp_…`）。
- 擴充功能把 Token 存在瀏覽器本機，以 `Authorization: Bearer <token>` 呼叫 `/api/extension/*`。
- 後端只存 Token 的 SHA-256，明文只在產生當下顯示一次；重新產生會讓舊 Token 立即失效。

## 建置

```bash
bash extension/build.sh
```

產生 `extension/dist/chrome` 與 `extension/dist/firefox`（有 `zip` 的話也會順便打包）。

## 安裝

**Chrome / Edge / Brave**
1. 開啟 `chrome://extensions`，打開右上角「開發人員模式」。
2. 「載入未封裝項目」→ 選 `extension/dist/chrome`。

**Firefox**
1. 開啟 `about:debugging#/runtime/this-firefox`。
2. 「載入臨時附加元件」→ 選 `extension/dist/firefox/manifest.json`。
3. 若 YouTube 頁面沒出現按鈕，到 `about:addons` → 這個擴充功能 → 「權限」，確認已允許存取 `www.youtube.com`。

## 設定

1. 登入網站 → 導覽列「擴充功能」→「產生 Token」→ 複製。
2. 擴充功能安裝後會自動開啟設定頁（之後可從 popup 右上角齒輪進入）。
3. 填入網站網址與 Token → 「儲存」（會先測試連線）。

## 使用

- YouTube 影片頁的按鈕列（讚／分享那排）會多一顆「加入影片庫」。
- 點工具列圖示也能加入目前分頁的影片，或直接貼上網址／影片 ID。

## 目錄

```
extension/
├── manifest.chrome.json   # Chrome：background.service_worker
├── manifest.firefox.json  # Firefox：background.scripts + gecko id
├── build.sh
└── src/                   # 兩邊共用的程式碼
    ├── common.js          # 設定存取、網址解析
    ├── background.js      # 實際打 API（避開 content script 的 CORS 限制）
    ├── content.js/.css    # 注入 YouTube 頁面的按鈕
    ├── popup.html/js/css
    ├── options.html/js/css
    └── icons/
```
