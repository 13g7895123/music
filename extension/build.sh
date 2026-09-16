#!/usr/bin/env bash
# 組出可載入的 Chrome / Firefox 擴充功能：dist/chrome、dist/firefox（以及 zip）
set -euo pipefail
cd "$(dirname "$0")"

rm -rf dist
mkdir -p dist/chrome dist/firefox

cp -r src/. dist/chrome/
cp manifest.chrome.json dist/chrome/manifest.json

cp -r src/. dist/firefox/
cp manifest.firefox.json dist/firefox/manifest.json

if command -v zip >/dev/null 2>&1; then
  (cd dist/chrome && zip -qr ../youtube-loop-player-chrome.zip .)
  (cd dist/firefox && zip -qr ../youtube-loop-player-firefox.zip .)
fi

echo "Chrome : $(pwd)/dist/chrome"
echo "Firefox: $(pwd)/dist/firefox"
