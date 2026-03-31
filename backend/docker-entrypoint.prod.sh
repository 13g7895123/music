#!/bin/bash
set -e

echo "================================"
echo "Starting Backend - Production"
echo "================================"

# 顯示環境信息
echo "Environment: ${CI_ENVIRONMENT:-production}"
echo "PHP Version: $(php -v | head -n 1)"

# 等待資料庫就緒
echo "Waiting for database to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

until mysql -h "${MYSQL_HOST:-mariadb}" \
           -u "${MYSQL_USER:-app_user}" \
           -p"${MYSQL_PASSWORD}" \
           --skip-ssl \
           -e "SELECT 1" >/dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ Error: Database connection failed after ${MAX_RETRIES} retries"
        exit 1
    fi
    echo "Database is unavailable - retry ${RETRY_COUNT}/${MAX_RETRIES}"
    sleep 2
done

echo "✅ Database is ready!"

# ========================================
# 檢查並安裝 PHP 依賴
# ========================================
echo ""
echo "Checking PHP dependencies..."

# 定義必需的依賴套件
REQUIRED_PACKAGES=(
    "firebase/php-jwt"
    "codeigniter4/framework"
)

MISSING_PACKAGES=()

# 檢查每個必需套件是否存在
for package in "${REQUIRED_PACKAGES[@]}"; do
    PACKAGE_PATH="/var/www/html/vendor/${package}"
    if [ ! -d "$PACKAGE_PATH" ]; then
        echo "⚠️  Missing package: ${package}"
        MISSING_PACKAGES+=("${package}")
    else
        echo "✅ Found: ${package}"
    fi
done

# 如果有缺少的套件，執行安裝
if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
    echo ""
    echo "⚠️  Found ${#MISSING_PACKAGES[@]} missing package(s), installing..."

    # 切換回應用根目錄（確保在正確位置執行 composer）
    cd /var/www/html

    # 逐一安裝缺少的套件
    for package in "${MISSING_PACKAGES[@]}"; do
        echo "Installing ${package}..."
        if composer require "${package}" --no-interaction --prefer-dist; then
            echo "✅ ${package} installed successfully!"
        else
            echo "❌ Failed to install ${package}"
            exit 1
        fi
    done

    # 重新優化自動加載
    echo "Optimizing autoloader..."
    composer dump-autoload --optimize --classmap-authoritative

    echo "✅ All missing dependencies installed!"
else
    echo "✅ All required dependencies are installed"
fi

echo ""

# 檢查數據庫是否存在
DB_EXISTS=$(mysql -h "${MYSQL_HOST:-mariadb}" \
                  -u "${MYSQL_USER:-app_user}" \
                  -p"${MYSQL_PASSWORD}" \
                  --skip-ssl \
                  -e "SHOW DATABASES LIKE '${MYSQL_DATABASE:-free_youtube}';" | grep -c "${MYSQL_DATABASE:-free_youtube}" || true)

if [ "$DB_EXISTS" -eq 0 ]; then
    echo "⚠️  Database does not exist, creating..."
    mysql -h "${MYSQL_HOST:-mariadb}" \
          -u root \
          -p"${MYSQL_ROOT_PASSWORD}" \
          --skip-ssl \
          -e "CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE:-free_youtube}\`;"
    echo "✅ Database created!"
fi

# 執行 migrations
echo "Running database migrations..."
if [ -f /var/www/html/database/migrations.sql ]; then
    mysql -h "${MYSQL_HOST:-mariadb}" \
          -u "${MYSQL_USER:-app_user}" \
          -p"${MYSQL_PASSWORD}" \
          --skip-ssl \
          "${MYSQL_DATABASE:-free_youtube}" < /var/www/html/database/migrations.sql 2>&1
    echo "✅ Migrations completed successfully!"
else
    echo "⚠️  Migration file not found, skipping..."
fi

# 清理舊的緩存
echo "Cleaning cache..."
rm -rf /var/www/html/writable/cache/* 2>/dev/null || true
echo "✅ Cache cleaned!"

# 顯示啟動信息
echo ""
echo "================================"
echo "🚀 Starting CodeIgniter 4 (php-fpm)"
echo "================================"
echo "Listening on: 0.0.0.0:9000 (FastCGI)"
echo "Environment: ${CI_ENVIRONMENT:-production}"
echo ""

# 以 root 啟動 php-fpm，由 fpm 內建機制 drop privilege 到 www-data
# 不用 su-exec，避免切換用戶後 /proc/self/fd/2 (stderr) 權限問題
exec php-fpm --nodaemonize
