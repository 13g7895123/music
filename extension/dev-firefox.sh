#!/usr/bin/env bash
# 用 web-ext 開一個「專用設定檔」的 Firefox 測試擴充功能（不會動到平常用的 Firefox）。
# - 設定檔會保留（YouTube 登入一次之後都在）
# - 改 src/ 或 manifest 會自動重新建置，web-ext 會自動重新載入擴充功能
#
# 用法：bash extension/dev-firefox.sh [起始網址]
# 環境變數：
#   YLP_FIREFOX_PROFILE  設定檔目錄（預設：WSL 下為 Windows 的 %USERPROFILE%\ylp-dev\firefox-profile）
#   YLP_FIREFOX_BIN      Firefox 執行檔（預設讓 web-ext 自己找）
set -euo pipefail
cd "$(dirname "$0")"

WEB_EXT_VERSION=10.8.0
START_URL="${1:-https://www.youtube.com/watch?v=2nkpsTiw_zM}"

build() { bash build.sh >/dev/null; }

command -v rsync >/dev/null 2>&1 || { echo "需要 rsync（例如 sudo apt install rsync）" >&2; exit 1; }

# 有變更就重新建置；$1 = 建置後要執行的同步動作（可省略）
watch_and_rebuild() {
  local after="${1:-true}" stamp
  stamp="$(mktemp)"
  while sleep 1; do
    if [ -n "$(find src manifest.firefox.json -newer "$stamp" -print -quit)" ]; then
      touch "$stamp"
      if build && $after; then echo "[dev-firefox] 已重新建置"; else echo "[dev-firefox] 建置失敗"; fi
    fi
  done
}

build

if grep -qi microsoft /proc/version 2>/dev/null; then
  # --- WSL：Firefox 在 Windows，web-ext 也要用 Windows 的 Node 跑 ---
  CMD=/mnt/c/Windows/System32/cmd.exe
  NODE="/mnt/c/Program Files/nodejs/node.exe"
  NPX_CLI='C:\Program Files\nodejs\node_modules\npm\bin\npx-cli.js'
  [ -x "$NODE" ] || { echo "找不到 Windows 的 Node.js：$NODE" >&2; exit 1; }

  WIN_HOME="$(cd /mnt/c && "$CMD" /c 'echo %USERPROFILE%' 2>/dev/null | tr -d '\r')"
  DEV_DIR="$(wslpath "$WIN_HOME")/ylp-dev"
  SRC_DIR="$DEV_DIR/firefox"
  PROFILE_DIR="${YLP_FIREFOX_PROFILE:-$DEV_DIR/firefox-profile}"
  mkdir -p "$SRC_DIR"

  # 擴充功能放到 Windows 磁碟上，Windows 的 Firefox 才讀得到、也才收得到檔案變更通知
  sync_to_windows() { rsync -a --delete dist/firefox/ "$SRC_DIR/"; }
  sync_to_windows

  watch_and_rebuild sync_to_windows &
  trap 'kill $! 2>/dev/null' EXIT

  args=(-y "web-ext@$WEB_EXT_VERSION" run
    --source-dir "$(wslpath -w "$SRC_DIR")"
    --firefox-profile "$(wslpath -w "$PROFILE_DIR")"
    --profile-create-if-missing --keep-profile-changes
    --start-url "$START_URL")
  [ -n "${YLP_FIREFOX_BIN:-}" ] && args+=(--firefox "$YLP_FIREFOX_BIN")

  echo "[dev-firefox] 擴充功能：$(wslpath -w "$SRC_DIR")"
  echo "[dev-firefox] 設定檔　：$(wslpath -w "$PROFILE_DIR")"
  cd "$DEV_DIR"   # Windows 的 npx 不能在 WSL 路徑底下執行
  "$NODE" "$NPX_CLI" "${args[@]}"
else
  # --- 一般 Linux / macOS ---
  DEV_DIR="$HOME/.cache/ylp-dev"
  SRC_DIR="$DEV_DIR/firefox"
  PROFILE_DIR="${YLP_FIREFOX_PROFILE:-$DEV_DIR/firefox-profile}"
  mkdir -p "$SRC_DIR" "$(dirname "$PROFILE_DIR")"

  # build.sh 會先 rm -rf dist 再複製：web-ext 若直接監看 dist/firefox，
  # 目錄被刪掉會讓監看失效，也可能在複製一半時就重新載入 → 建置完成後再同步到獨立目錄
  sync_dev() { rsync -a --delete dist/firefox/ "$SRC_DIR/"; }
  sync_dev

  watch_and_rebuild sync_dev &
  trap 'kill $! 2>/dev/null' EXIT

  args=(-y "web-ext@$WEB_EXT_VERSION" run
    --source-dir "$SRC_DIR"
    --firefox-profile "$PROFILE_DIR"
    --profile-create-if-missing --keep-profile-changes
    --start-url "$START_URL")
  [ -n "${YLP_FIREFOX_BIN:-}" ] && args+=(--firefox "$YLP_FIREFOX_BIN")

  echo "[dev-firefox] 擴充功能：$SRC_DIR"
  echo "[dev-firefox] 設定檔　：$PROFILE_DIR"
  npx "${args[@]}"
fi
