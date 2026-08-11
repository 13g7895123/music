#!/usr/bin/env bash
# ==========================================================
# YouTube Loop Player - 部署腳本
# 用法：./scripts/deploy.sh <env> [flags]
#
# 範例：
#   ./scripts/deploy.sh development               互動模式（預設）
#   ./scripts/deploy.sh production --auto-secrets 偵測到弱密鑰直接自動產生
#   ./scripts/deploy.sh development --skip-secrets 跳過密鑰偵測（dev 快速重啟）
#   ./scripts/deploy.sh production --fail-on-weak 偵測到弱密鑰直接 fail（CI gate）
# ==========================================================
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

SECRET_MODE="interactive"   # interactive | auto | skip | fail
ALLOW_SKIP_IN_PROD=false    # --i-know-what-im-doing
SKIP_PORT_CHECK=false
ENV_ARG=""

usage() {
  cat <<EOF
用法：$0 <env> [旗標]

環境（必填）：
  ${VALID_ENVS[*]}

旗標：
  --auto-secrets         偵測到弱密鑰自動產生（無互動）
  --skip-secrets         不執行密鑰偵測（production 需配合下一旗標）
  --fail-on-weak         偵測到弱密鑰直接 exit 1（CI gate 用）
  --i-know-what-im-doing 允許在 production 使用 --skip-secrets
  --skip-port-check      跳過 port 佔用預檢查（不終止佔用程序）
  -h, --help             顯示此說明
EOF
}

# 解析參數
while [[ $# -gt 0 ]]; do
  case "$1" in
    --auto-secrets)         SECRET_MODE="auto"; shift ;;
    --skip-secrets)         SECRET_MODE="skip"; shift ;;
    --fail-on-weak)         SECRET_MODE="fail"; shift ;;
    --i-know-what-im-doing) ALLOW_SKIP_IN_PROD=true; shift ;;
    --skip-port-check)      SKIP_PORT_CHECK=true; shift ;;
    -h|--help)              usage; exit 0 ;;
    -*)                     log_error "未知旗標：$1"; usage; exit 1 ;;
    *)
      if [[ -z "$ENV_ARG" ]]; then
        ENV_ARG="$1"
      else
        log_error "多餘的位置參數：$1"; usage; exit 1
      fi
      shift
      ;;
  esac
done

ENV=$(require_env "$ENV_ARG")
require_docker
prepare_env_file "$ENV"

# 非 TTY 且仍為 interactive → 自動降為 fail，避免 CI 卡住
if [[ "$SECRET_MODE" == "interactive" && ! -t 0 ]]; then
  log_warn "非 TTY 環境，自動切換密鑰模式為 --fail-on-weak"
  SECRET_MODE="fail"
fi

# production 額外保護
if [[ "$ENV" == "production" && "$SECRET_MODE" == "skip" && "$ALLOW_SKIP_IN_PROD" != "true" ]]; then
  log_error "production 環境禁止 --skip-secrets，除非加上 --i-know-what-im-doing"
  exit 1
fi

# 密鑰偵測（執行於 prepare_env_file 後、build/up 前）
log_info "正在檢查弱密鑰..."
if ! handle_weak_secrets "$SECRET_MODE"; then
  exit 1
fi

# 密鑰可能已輪替，於此之後才同步 backend/.env
sync_backend_env

log_info "正在部署 $ENV 環境..."

log_info "Step 1/4：Port 衝突預檢查"
if [[ "$SKIP_PORT_CHECK" == "true" ]]; then
  log_warn "已跳過 port 預檢查（--skip-port-check）"
elif ! check_ports; then
  log_error "Port 預檢查失敗"
  exit 1
fi

log_info "Step 2/4：拉取最新 base images"
compose pull --ignore-pull-failures 2>/dev/null || compose pull || true

log_info "Step 3/4：建置應用 image"
compose build

log_info "Step 4/4：啟動服務"
if ! compose up -d --remove-orphans; then
  log_error "docker compose up 失敗，請查看上方錯誤訊息。"
  echo "    常見原因：" >&2
  echo "      • Port 已被佔用 → 修改 docker/envs/.env.$ENV 中的 APP_PORT" >&2
  echo "      • 映像檔建構失敗 → cd docker && docker compose build --no-cache" >&2
  echo "      • 查看詳細 log：cd docker && docker compose logs" >&2
  exit 1
fi

log_ok "$ENV 部署完成"

APP_PORT_VAL="$(env_value APP_PORT | tr -d ' ')"
DB_PORT_VAL="$(env_value DB_PORT_EXPOSED | tr -d ' ' | sed 's/.*://')"

echo ""
echo "  主應用程式   http://localhost:${APP_PORT_VAL:-80}/"
echo "  phpMyAdmin  http://localhost:${APP_PORT_VAL:-80}/pma/"
echo "  資料庫直連   localhost:${DB_PORT_VAL:-3307}  (MariaDB)"
echo ""
echo "  查看即時 log：cd docker && docker compose logs -f"
echo ""

log_info "目前容器狀態："
compose ps
