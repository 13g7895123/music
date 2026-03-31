#!/bin/bash

# Docker 清理腳本
# 清除所有未使用的 images、volumes、containers 和 networks

set -e

echo "=========================================="
echo "Docker 清理腳本"
echo "=========================================="
echo ""

# 顯示清理前的空間使用情況
echo "📊 清理前的 Docker 空間使用情況："
docker system df
echo ""

# 確認是否繼續
read -p "⚠️  確定要清理所有未使用的 Docker 資源嗎？(y/N): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "❌ 已取消清理"
    exit 0
fi

echo ""
echo "🧹 開始清理..."
echo ""

# 1. 停止所有運行中的容器（可選，取消註釋啟用）
# echo "🛑 停止所有容器..."
# docker stop $(docker ps -q) 2>/dev/null || true

# 2. 刪除所有停止的容器
echo "🗑️  刪除停止的容器..."
docker container prune -f

# 3. 刪除未使用的 images（dangling images）
echo "🗑️  刪除 dangling images..."
docker image prune -f

# 4. 刪除所有未使用的 images（包含沒有被任何容器引用的）
echo "🗑️  刪除所有未使用的 images..."
docker image prune -a -f

# 5. 刪除未使用的 volumes
echo "🗑️  刪除未使用的 volumes..."
docker volume prune -f

# 6. 刪除未使用的 networks
echo "🗑️  刪除未使用的 networks..."
docker network prune -f

# 7. 刪除 build cache
echo "🗑️  刪除 build cache..."
docker builder prune -a -f

# 8. 一次性清理所有未使用的資源（替代方案）
# echo "🗑️  執行 system prune..."
# docker system prune -a --volumes -f

echo ""
echo "=========================================="
echo "✅ 清理完成！"
echo "=========================================="
echo ""

# 顯示清理後的空間使用情況
echo "📊 清理後的 Docker 空間使用情況："
docker system df

echo ""
echo "💡 提示：如果需要更徹底的清理，可以執行："
echo "   docker system prune -a --volumes -f"
