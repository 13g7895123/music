# YouTube Loop Player 瀏覽器擴充功能

在 YouTube 影片頁一鍵把影片加到自己的影片庫。支援 Chrome（Manifest V3）與 Firefox（MV3，115+）。

## 運作方式

- 網站的「擴充功能」頁面（`/extension`）可產生個人 API Token（`ylp_…`）；每位使用者可有多組（上限 20），每組附說明，方便不同電腦／瀏覽器各用一組。
- 擴充功能把 Token 存在瀏覽器本機，以 `Authorization: Bearer <token>` 呼叫 `/api/extension/*`。
- 後端只存 Token 的 SHA-256，明文只在產生當下顯示一次；撤銷某一組會讓它立即失效，不影響其他組。

## 建置

```bash
bash extension/build.sh
```

產生 `extension/dist/chrome` 與 `extension/dist/firefox`（有 `zip` 的話也會順便打包）。
第一次建置會用 `npm ci` 安裝第三方程式庫（kuromoji、wanakana），原封不動複製到 `dist/*/vendor/`。

## 開發測試（Firefox）

```bash
bash extension/dev-firefox.sh [起始網址]
```

用 [web-ext](https://github.com/mozilla/web-ext) 開一個**專用設定檔**的 Firefox 並載入擴充功能：

- 跟平常用的 Firefox 分開，不會跟已安裝的正式版衝突。
- 設定檔會保留（在裡面登入 YouTube 一次，之後都在）。
- 改 `src/` 或 `manifest.firefox.json` 會自動重新建置，擴充功能自動重新載入。
- 關掉這個 Firefox 視窗就會結束。

WSL 下會用 Windows 的 Node.js 啟動 Windows 的 Firefox，擴充功能與設定檔放在 `%USERPROFILE%\ylp-dev\`；
其他系統放在 `~/.cache/ylp-dev/`（建置完才用 rsync 同步過去，避免 web-ext 載到建置一半的檔案）。
可用 `YLP_FIREFOX_PROFILE` 指定設定檔目錄、`YLP_FIREFOX_BIN` 指定 Firefox 執行檔。

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

### 日文 KTV（原型）

影片頁右下角的「🎤 日文 KTV」面板 →「開始 KTV」（需登入 YouTube，影片要有日文字幕；開過一次之後換影片會自動開啟）。

- 播放器上顯示 KTV 字幕：念到哪個字就填色；每個詞上方有羅馬拼音、漢字上方有假名，下面是中文翻譯。
- 日文可切換「漢字＋假名／只有原文／全部假名／隱藏」，羅馬拼音、中文可個別關閉。
- 跟讀：每句念完自動暫停；上一句／重播／下一句；0.75×、0.5× 慢速。

運作方式：
- YouTube 字幕網址需要播放器產生的 pot token，直接抓會拿到空內容 → `ktv/hook.js` 注入頁面，攔截播放器自己發出的 `/api/timedtext` 請求；中文是同一個網址加 `tlang=zh-Hant`（YouTube 自動翻譯）。
- 自動字幕（asr）有逐詞時間 → 逐字填色；人工字幕只有整句時間 → 依字數平均分配。
- 斷詞／讀音用 kuromoji（辭典 18MB），在**背景**執行，不卡 YouTube 頁面；假名→羅馬拼音用 wanakana。
- 播放控制（跳句、暫停、速度）走 YouTube 播放器 API；直接改 `<video>` 會讓播放器狀態不同步。

## 目錄

```
extension/
├── manifest.chrome.json   # Chrome：background.service_worker
├── manifest.firefox.json  # Firefox：background.scripts + gecko id
├── build.sh
├── package.json           # 第三方程式庫（建置時複製到 dist/*/vendor/）
├── dev-firefox.sh         # 開發用：web-ext + 專用設定檔
└── src/                   # 兩邊共用的程式碼
    ├── common.js          # 設定存取、網址解析
    ├── background.js      # 實際打 API（避開 content script 的 CORS 限制）
    ├── content.js/.css    # 注入 YouTube 頁面的按鈕
    ├── ktv/               # 日文 KTV
    │   ├── hook.js        # 注入頁面（MAIN world）：攔截字幕請求、呼叫播放器 API
    │   ├── captions.js    # 解析 json3 字幕、逐字時間
    │   ├── reading.js     # kuromoji 斷詞＋讀音（背景執行）
    │   └── main.js/ktv.css  # 播放器上的 KTV 字幕與控制面板
    ├── popup.html/js/css
    ├── options.html/js/css
    └── icons/
```
