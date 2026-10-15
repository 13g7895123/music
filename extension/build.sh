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

pack() {
  local dir="$1" out="$2"
  if command -v zip >/dev/null 2>&1; then
    (cd "$dir" && zip -qr "../$out" .)
  else
    python3 - "$dir" "dist/$out" <<'PY'
import os, sys, zipfile
src, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, _, files in os.walk(src):
        for name in files:
            path = os.path.join(root, name)
            zf.write(path, os.path.relpath(path, src))
PY
  fi
}

pack dist/chrome youtube-loop-player-chrome.zip
pack dist/firefox youtube-loop-player-firefox.zip

echo "Chrome : $(pwd)/dist/chrome"
echo "Firefox: $(pwd)/dist/firefox"
