#!/bin/bash
set -e

echo "================================"
echo "Starting Backend Initialization"
echo "================================"

# 設定資料庫連線參數（從環境變數讀取）
DB_HOST="mariadb"
DB_USER="${MYSQL_USER:-root}"
DB_PASSWORD="${MYSQL_PASSWORD:-app_password}"
DB_NAME="${MYSQL_DATABASE:-free_youtube}"

echo "Database Configuration:"
echo "  Host: $DB_HOST"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"

# 等待資料庫就緒
echo "Waiting for database to be ready..."
until mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" --skip-ssl -e "SELECT 1" >/dev/null 2>&1; do
    echo "Database is unavailable - sleeping"
    sleep 2
done

echo "Database is ready!"

# 執行資料庫 migration（CI4 只會跑尚未執行過的檔案）
echo "Running database migrations..."
cd /var/www/html
php spark migrate

# 啟動 CodeIgniter 4 應用程式
echo "Starting CodeIgniter 4 with Spark..."
echo "Environment: $CI_ENVIRONMENT"
cd /var/www/html

# 檢查 spark 是否存在
if [ ! -f "spark" ]; then
    echo "⚠️  Warning: spark file not found!"
    echo "Falling back to PHP built-in server..."
    cd /var/www/html/public
    exec php -S 0.0.0.0:8000 router.php
fi

# 使用 spark serve 啟動（CI4 官方推薦方式）
echo "🚀 Starting with spark serve..."
exec php spark serve --host 0.0.0.0 --port 8000
