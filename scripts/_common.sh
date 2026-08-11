#!/usr/bin/env bash
# ==========================================================
# YouTube Loop Player - 部署腳本共用函式
# 提供：環境檢查、.env 複製、compose 包裝、密鑰偵測
# 架構對齊：07_coupang-analysis/scripts/_common.sh
# ==========================================================
set -euo pipefail

# 合法環境白名單；新增環境時請同步更新
VALID_ENVS=("development" "production")

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKER_DIR="$ROOT_DIR/docker"
ENVS_DIR="$DOCKER_DIR/envs"
COMPOSE_FILE="$DOCKER_DIR/docker-compose.yml"
BACKEND_ENV="$ROOT_DIR/backend/.env"

# 當前選定環境（由 prepare_env_file 設置）
CURRENT_ENV=""

# 顏色（若 terminal 不支援則為空字串）
if [[ -t 1 ]]; then
  C_RED=$'\033[0;31m'
  C_GREEN=$'\033[0;32m'
  C_YELLOW=$'\033[0;33m'
  C_BLUE=$'\033[0;34m'
  C_RESET=$'\033[0m'
else
  C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""; C_RESET=""
fi

log_info()  { echo "${C_BLUE}ℹ${C_RESET}  $*"; }
log_ok()    { echo "${C_GREEN}✅${C_RESET} $*"; }
log_warn()  { echo "${C_YELLOW}⚠${C_RESET}  $*" >&2; }
log_error() { echo "${C_RED}❌${C_RESET} $*" >&2; }

# require_env <env>
#   驗證環境名是否在白名單內；缺少或不合法則 exit 1
require_env() {
  local env="${1:-}"
  if [[ -z "$env" ]]; then
    log_error "缺少環境參數。"
    echo "    用法：$0 <env>（可選：${VALID_ENVS[*]}）" >&2
    exit 1
  fi
  local valid=false
  for e in "${VALID_ENVS[@]}"; do
    if [[ "$e" == "$env" ]]; then
      valid=true
      break
    fi
  done
  if [[ "$valid" != "true" ]]; then
    log_error "不合法的環境：$env"
    echo "    允許：${VALID_ENVS[*]}" >&2
    exit 1
  fi
  printf '%s' "$env"
}

# require_docker
#   檢查 docker / docker compose 是否可用
require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    log_error "找不到 docker 指令，請先安裝 Docker。"
    exit 1
  fi
  if ! docker compose version >/dev/null 2>&1; then
    log_error "docker compose 無法執行，請確認已安裝 Docker Compose v2。"
    exit 1
  fi
}

# prepare_env_file <env>
#   檢查 docker/envs/.env.<env> 是否存在，存在則複製為 docker/.env
#   並設定 CURRENT_ENV，供後續 compose() 自動偵測 override 檔
#   找不到時直接報錯中止；模板檔（.env.<env>.example）僅供 cp 使用，部署不會 fallback
prepare_env_file() {
  local env="$1"
  local src="$ENVS_DIR/.env.$env"
  local tmpl="$ENVS_DIR/.env.$env.example"
  local dst="$DOCKER_DIR/.env"

  if [[ ! -f "$src" ]]; then
    log_error "找不到環境檔：$src"
    if [[ -f "$tmpl" ]]; then
      echo "    偵測到模板：envs/.env.$env.example" >&2
      echo "    請執行：cp $tmpl $src" >&2
      echo "    並修改 .env.$env 內所有 changeme / your_*_here 等弱值後重試" >&2
    else
      echo "    請於 docker/envs/ 建立 .env.$env" >&2
    fi
    exit 1
  fi

  cp "$src" "$dst"
  CURRENT_ENV="$env"
  log_ok "已套用 envs/.env.$env → docker/.env"

  if [[ -f "$DOCKER_DIR/docker-compose.$env.yml" ]]; then
    log_info "偵測到 override：docker-compose.$env.yml（將自動疊加）"
  fi
}

# compose <docker compose 後續參數>
#   在 docker/ 目錄內，用複製產生的 .env 執行 compose
#   若該環境存在 docker-compose.<env>.yml override，會自動疊加
compose() {
  local args=(--env-file .env -f docker-compose.yml)
  if [[ -n "$CURRENT_ENV" && -f "$DOCKER_DIR/docker-compose.$CURRENT_ENV.yml" ]]; then
    args+=(-f "docker-compose.$CURRENT_ENV.yml")
  fi
  ( cd "$DOCKER_DIR" && docker compose "${args[@]}" "$@" )
}

# ==========================================================
# Secrets / 密鑰偵測與產生
# ==========================================================

# 弱值 pattern（任一命中即視為弱值）
WEAK_PATTERNS=(
  'change[-_]?me'
  'REPLACE[-_]WITH'
  'REPLACE[-_]ME'
  '^password$'
  '^secret$'
  '^admin$'
  '^root$'
  '^123456$'
  'your[-_](password|secret|token|key)'
  'your_.*_here'
  '^example$'
  '^placeholder$'
)

# is_weak_value <value>
#   判斷 value 是否符合弱值 pattern。回傳 0=弱、1=強。
is_weak_value() {
  local val="$1"
  [[ -z "$val" ]] && return 0
  local p
  for p in "${WEAK_PATTERNS[@]}"; do
    if echo "$val" | grep -iqE "$p"; then
      return 0
    fi
  done
  return 1
}

# classify_secret_key <KEY>
#   依 key 名稱回傳類型代碼：password | hex | token | base64 | none
#   回 none 者不納入密鑰偵測（例如 LINE_LOGIN_CHANNEL_ID 屬設定非密鑰）
classify_secret_key() {
  local key="$1"
  case "$key" in
    *_PASSWORD|*_PASS|*_PWD)
      echo "password" ;;
    *_SECRET|*_SECRET_KEY|*_SIGNING_KEY|JWT_*)
      echo "hex" ;;
    *_TOKEN|*_API_KEY|*_APIKEY)
      echo "token" ;;
    *_ENCRYPTION_KEY|*_AES_KEY)
      echo "base64" ;;
    *)
      echo "none" ;;
  esac
}

# generate_secret <type>
#   依類型產生新值並輸出到 stdout
generate_secret() {
  local kind="$1"
  if ! command -v openssl >/dev/null 2>&1; then
    if [[ ! -r /dev/urandom ]]; then
      log_error "無法產生密鑰：openssl 與 /dev/urandom 皆不可用"
      exit 1
    fi
  fi

  case "$kind" in
    password)
      # 24 字 url-safe（去掉易混淆的 + / =）
      if command -v openssl >/dev/null 2>&1; then
        openssl rand -base64 32 | tr -d '+/=\n' | cut -c1-24
      else
        head -c 64 /dev/urandom | base64 | tr -d '+/=\n' | cut -c1-24
      fi
      ;;
    hex)
      # 64 hex = 256-bit
      if command -v openssl >/dev/null 2>&1; then
        openssl rand -hex 32
      else
        head -c 32 /dev/urandom | xxd -p -c 64
      fi
      ;;
    token)
      # 48 字 base64url
      if command -v openssl >/dev/null 2>&1; then
        openssl rand -base64 48 | tr '+/' '-_' | tr -d '=\n' | cut -c1-48
      else
        head -c 64 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=\n' | cut -c1-48
      fi
      ;;
    base64)
      # 44 字 base64（256-bit key）
      if command -v openssl >/dev/null 2>&1; then
        openssl rand -base64 32 | tr -d '\n'
      else
        head -c 32 /dev/urandom | base64 | tr -d '\n'
      fi
      ;;
    generic|*)
      # 32 字 url-safe
      if command -v openssl >/dev/null 2>&1; then
        openssl rand -base64 32 | tr '+/' '-_' | tr -d '=\n' | cut -c1-32
      else
        head -c 48 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=\n' | cut -c1-32
      fi
      ;;
  esac
}

# secret_preview <value>
#   截取前 8 碼用於 log，避免外洩完整明文
secret_preview() {
  local val="$1"
  if [[ ${#val} -le 8 ]]; then
    printf '%s' "$val"
  else
    printf '%s...' "${val:0:8}"
  fi
}

# 全域陣列：偵測結果（每筆格式 "KEY|TYPE|VALUE"）
WEAK_SECRETS=()

# scan_weak_secrets <env_file>
#   掃描 env_file 並把弱值記錄到 WEAK_SECRETS 全域陣列
scan_weak_secrets() {
  local file="$1"
  WEAK_SECRETS=()
  [[ ! -f "$file" ]] && return 0

  local line key val kind
  while IFS= read -r line || [[ -n "$line" ]]; do
    # 跳過空行與註解
    [[ -z "${line// }" ]] && continue
    [[ "${line:0:1}" == "#" ]] && continue
    # 必須是 KEY=VALUE
    [[ "$line" != *"="* ]] && continue

    key="${line%%=*}"
    val="${line#*=}"
    # 去掉前後引號
    val="${val%\"}"; val="${val#\"}"
    val="${val%\'}"; val="${val#\'}"
    # 去掉前後空白
    key="${key## }"; key="${key%% }"

    kind=$(classify_secret_key "$key")
    [[ "$kind" == "none" ]] && continue

    if is_weak_value "$val"; then
      WEAK_SECRETS+=("$key|$kind|$val")
    fi
  done < "$file"
}

# rotate_secret_in_file <file> <KEY> <new_value>
#   in-place 替換指定 KEY 的值，保留其他內容與註解
rotate_secret_in_file() {
  local file="$1"
  local key="$2"
  local new_val="$3"

  [[ ! -f "$file" ]] && { log_error "找不到檔案：$file"; return 1; }

  # 逸出 sed 特殊字元（&, /, \）
  local escaped
  escaped=$(printf '%s' "$new_val" | sed -e 's/[\/&]/\\&/g')

  # 備份
  cp "$file" "$file.bak"

  # in-place 替換；同時匹配 KEY= 與 KEY="..."、KEY='...'
  if sed -i.tmp -E "s|^([[:space:]]*${key}[[:space:]]*=).*|\1${escaped}|" "$file"; then
    rm -f "$file.tmp"
  else
    mv "$file.bak" "$file"
    return 1
  fi
  return 0
}

# prompt_yes_no <message>
#   回 0 = yes、1 = no；非 TTY 時預設 no
prompt_yes_no() {
  local msg="$1"
  if [[ ! -t 0 ]]; then
    return 1
  fi
  local reply
  read -r -p "$msg [y/N]: " reply
  [[ "$reply" =~ ^[Yy]$ ]]
}

# rotate_one_secret <key> <kind>
#   產生新值，同時寫入 docker/.env 與 docker/envs/.env.<env>
rotate_one_secret() {
  local key="$1"
  local kind="$2"
  local env_file="$DOCKER_DIR/.env"
  local tmpl_file="$ENVS_DIR/.env.$CURRENT_ENV"
  local new_val
  new_val=$(generate_secret "$kind")

  if ! rotate_secret_in_file "$env_file" "$key" "$new_val"; then
    log_error "寫入 $env_file 失敗（$key）"
    return 1
  fi
  if ! rotate_secret_in_file "$tmpl_file" "$key" "$new_val"; then
    log_error "寫入 $tmpl_file 失敗（$key），$env_file 已先還原"
    mv "$env_file.bak" "$env_file" 2>/dev/null || true
    return 1
  fi

  log_ok "已更新 $key = $(secret_preview "$new_val") ($kind)"
}

# db_volume_exists
#   偵測本專案的 MariaDB volume 是否已存在。
#   已存在時輪替 DB_PASS / MYSQL_ROOT_PASSWORD 不會生效——MariaDB 只在
#   初始化空 volume 時套用密碼環境變數，導致後端連線失敗。
db_volume_exists() {
  local project
  project="$(basename "$DOCKER_DIR")"
  docker volume ls --format '{{.Name}}' 2>/dev/null \
    | grep -qE "^${project}_(db_data|mariadb_data|mysql_data)$"
}

# warn_db_password_rotation <keys...>
#   若輪替清單含 DB 密碼且 volume 已存在，提出警告
warn_db_password_rotation() {
  local key
  for key in "$@"; do
    case "$key" in
      DB_PASS|MYSQL_ROOT_PASSWORD)
        if db_volume_exists; then
          log_warn "偵測到既有資料庫 volume：輪替 $key 不會套用到已初始化的 MariaDB"
          log_warn "  → 後端將因密碼不符而無法連線。請擇一處理："
          log_warn "     (a) 手動在 DB 內執行 ALTER USER 更新密碼"
          log_warn "     (b) 保留原密碼（改用強密碼寫入 .env.$CURRENT_ENV 而非自動輪替）"
          return 0
        fi
        ;;
    esac
  done
  return 0
}

# handle_weak_secrets <mode>
#   mode: interactive | auto | skip | fail
#   回 0 = 繼續部署，非 0 = 中止
handle_weak_secrets() {
  local mode="${1:-interactive}"

  if [[ "$mode" == "skip" ]]; then
    log_warn "已跳過密鑰偵測（--skip-secrets）"
    return 0
  fi

  scan_weak_secrets "$DOCKER_DIR/.env"
  local count=${#WEAK_SECRETS[@]}

  if [[ "$count" -eq 0 ]]; then
    log_ok "密鑰檢查通過：未發現弱值"
    return 0
  fi

  log_warn "偵測到 $count 個弱密鑰："
  echo ""
  local i=1
  local entry key kind val rest
  for entry in "${WEAK_SECRETS[@]}"; do
    key="${entry%%|*}"
    rest="${entry#*|}"
    kind="${rest%%|*}"
    val="${rest#*|}"
    printf "  [%d] %-26s (%s)\n      現值：%s\n" "$i" "$key" "$kind" "$val"
    i=$((i + 1))
  done
  echo ""

  if [[ "$mode" == "fail" ]]; then
    log_error "發現弱密鑰（--fail-on-weak / 非 TTY 環境）"
    log_error "請手動更新 docker/envs/.env.$CURRENT_ENV 後重試"
    return 1
  fi

  local choice=""
  if [[ "$mode" == "auto" ]]; then
    choice="a"
  else
    if [[ ! -t 0 ]]; then
      log_error "非 TTY 環境無法互動，請使用 --auto-secrets / --skip-secrets / --fail-on-weak"
      return 1
    fi
    echo "要為哪些變數自動產生新值？"
    echo "  (a) 全部自動更新"
    echo "  (s) 選擇性更新（逐項詢問）"
    echo "  (k) 全部保留（不安全，但繼續）"
    echo "  (q) 中止部署"
    read -r -p "選擇 [a/s/k/q]: " choice
  fi

  case "$choice" in
    a|A)
      echo ""
      echo "即將產生："
      local rotate_keys=()
      for entry in "${WEAK_SECRETS[@]}"; do
        key="${entry%%|*}"
        rest="${entry#*|}"
        kind="${rest%%|*}"
        rotate_keys+=("$key")
        printf "  %-26s (%s)\n" "$key" "$kind"
      done
      warn_db_password_rotation "${rotate_keys[@]}"
      if [[ "$mode" != "auto" ]]; then
        if ! prompt_yes_no "確認寫入 docker/.env 與 docker/envs/.env.$CURRENT_ENV？"; then
          log_warn "已取消"
          return 1
        fi
      fi
      for entry in "${WEAK_SECRETS[@]}"; do
        key="${entry%%|*}"
        rest="${entry#*|}"
        kind="${rest%%|*}"
        rotate_one_secret "$key" "$kind" || return 1
      done
      log_ok "已同步至 docker/envs/.env.$CURRENT_ENV"
      ;;
    s|S)
      for entry in "${WEAK_SECRETS[@]}"; do
        key="${entry%%|*}"
        rest="${entry#*|}"
        kind="${rest%%|*}"
        if prompt_yes_no "更新 $key ($kind)？"; then
          warn_db_password_rotation "$key"
          rotate_one_secret "$key" "$kind" || return 1
        fi
      done
      ;;
    k|K)
      if [[ "$CURRENT_ENV" == "production" ]]; then
        echo ""
        log_warn "production 環境保留弱密鑰需二次確認"
        local confirm
        read -r -p "請完整輸入「KEEP-WEAK-PRODUCTION」以確認：" confirm
        if [[ "$confirm" != "KEEP-WEAK-PRODUCTION" ]]; then
          log_error "確認字串不符，已中止"
          return 1
        fi
      fi
      log_warn "已選擇保留弱密鑰，請盡快手動更新 docker/envs/.env.$CURRENT_ENV"
      ;;
    q|Q|*)
      log_error "已中止部署"
      return 1
      ;;
  esac

  if [[ "$CURRENT_ENV" == "production" ]]; then
    log_warn "請確認 docker/.env 不會被 commit 至 git（已預設於 .gitignore）"
  fi

  return 0
}

# ==========================================================
# backend/.env 同步
# CI4 後端需要 dot-notation 的資料庫設定，從 docker/.env 衍生
# ==========================================================

BACKEND_KEYS=(
  "APP_ENV" "AUTH_MODE" "MOCK_USER_ID"
  "DB_NAME" "DB_USER" "DB_PASS"
  "MYSQL_ROOT_PASSWORD"
  "LINE_LOGIN_CHANNEL_ID" "LINE_LOGIN_CHANNEL_SECRET" "LINE_LOGIN_CALLBACK_URL"
  "TOKEN_EXPIRE_SECONDS" "FRONTEND_URL"
  "JWT_SECRET_KEY" "JWT_ACCESS_TOKEN_EXPIRE" "JWT_REFRESH_TOKEN_EXPIRE"
  "COOKIE_DOMAIN" "APP_BASEURL" "APP_FORCE_HTTPS" "TZ"
)

# env_value <KEY>
#   從 docker/.env 取出指定 KEY 的值
env_value() {
  local key="$1"
  grep -E "^${key}=" "$DOCKER_DIR/.env" 2>/dev/null | head -n1 | cut -d= -f2- || true
}

# sync_backend_env
#   由 docker/.env 產生 backend/.env（供容器外的本機開發使用）
sync_backend_env() {
  local db_pass db_user db_name
  db_pass="$(env_value DB_PASS)"
  db_user="$(env_value DB_USER)"
  db_name="$(env_value DB_NAME)"

  {
    echo "# Auto-generated by scripts/deploy.sh — do not edit manually"
    echo "# Source: docker/.env  ($(date '+%Y-%m-%d %H:%M:%S'))"
    echo ""
    local var line
    for var in "${BACKEND_KEYS[@]}"; do
      line="$(grep -E "^${var}=" "$DOCKER_DIR/.env" || true)"
      [[ -n "$line" ]] && echo "$line"
    done
    echo ""
    echo "# CI4 Database dot-notation (for local dev outside Docker)"
    echo "database.default.hostname=127.0.0.1"
    echo "database.default.database=${db_name:-free_youtube}"
    echo "database.default.username=${db_user:-app_user}"
    echo "database.default.password=${db_pass}"
    echo "database.default.DBDriver=MySQLi"
    echo "database.default.port=3306"
    echo "database.default.charset=utf8mb4"
    echo "database.default.DBCollat=utf8mb4_unicode_ci"
  } > "$BACKEND_ENV"
  log_ok "已同步 backend/.env"
}

# ==========================================================
# Port 衝突預檢查
# ==========================================================

# kill_port <port> <name>
#   若 port 被非本專案容器的程序佔用，強制終止該程序
kill_port() {
  local port="$1"
  local name="$2"

  [[ -z "$port" ]] && return 0

  local pids
  pids="$(ss -tlnp 2>/dev/null | grep ":${port} " | grep -oP 'pid=\K[0-9]+' || true)"
  if [[ -z "$pids" ]]; then
    pids="$(netstat -tlnp 2>/dev/null | grep ":${port} " | awk '{print $7}' | cut -d/ -f1 | grep -E '^[0-9]+$' || true)"
  fi

  [[ -z "$pids" ]] && return 0

  # 本專案 docker container 佔用 → 交由 compose up 自行取代
  if docker ps --format '{{.Ports}}' 2>/dev/null | grep -q ":${port}->"; then
    log_warn "$name port $port 由現有容器佔用，將重新部署"
    return 0
  fi

  log_warn "$name port $port 被程序 PID=$pids 佔用，強制停止中..."
  local pid
  for pid in $pids; do
    if kill -9 "$pid" 2>/dev/null; then
      log_ok "  已強制停止 PID $pid"
    else
      log_error "無法停止 PID $pid，請以 root 權限執行或手動釋放 port $port"
      return 1
    fi
  done

  local wait=0
  while ss -tlnp 2>/dev/null | grep -q ":${port} "; do
    sleep 1
    wait=$((wait + 1))
    if [[ $wait -ge 5 ]]; then
      log_error "Port $port 仍未釋放，請手動處理"
      return 1
    fi
  done
  log_ok "$name port $port 已釋放"
}

# check_ports
#   讀取 docker/.env 的 APP_PORT / DB_PORT_EXPOSED 並預檢查
check_ports() {
  local app_port db_port
  app_port="$(env_value APP_PORT | tr -d ' ')"
  # DB_PORT_EXPOSED 可能是 "127.0.0.1:3307" 或 "3307"，取最後數字部分
  db_port="$(env_value DB_PORT_EXPOSED | tr -d ' ' | sed 's/.*://')"

  kill_port "${app_port:-80}" "APP_PORT" || return 1
  kill_port "${db_port:-3307}" "DB_PORT_EXPOSED" || return 1
}
