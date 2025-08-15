#!/bin/bash
# scripts/postgres-init.sh - PostgreSQL initialization script

set -e

# 建立擴充功能
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- 啟用 pg_stat_statements 擴充功能用於查詢效能監控
    CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
    
    -- 啟用 uuid-ossp 擴充功能用於 UUID 生成
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- 建立索引用於效能優化
    -- 注意：這些索引應該根據實際的 Prisma schema 來調整
    
    -- 顯示已安裝的擴充功能
    SELECT extname FROM pg_extension;
EOSQL

echo "PostgreSQL 初始化完成"