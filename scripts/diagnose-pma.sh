#!/bin/bash
# phpMyAdmin port 問題診斷腳本

COMPOSE_DIR="$(cd "$(dirname "$0")/../docker" && pwd)"
CONTAINER="music-phpmyadmin-1"

echo "======================================"
echo " phpMyAdmin 診斷報告"
echo "======================================"

echo ""
echo "── 1. docker/.env 的 PMA 相關變數 ──"
grep -E "PMA" "$COMPOSE_DIR/.env" 2>/dev/null || echo "[找不到 docker/.env]"

echo ""
echo "── 2. docker compose config 解析結果（phpmyadmin section）──"
cd "$COMPOSE_DIR" && docker compose config 2>/dev/null | awk '/^  phpmyadmin:/{found=1} found{print} /^  [a-z]/ && !/^  phpmyadmin:/{if(found) exit}'

echo ""
echo "── 3. docker port ──"
docker port "$CONTAINER" 2>/dev/null || echo "[容器不存在或無 port mapping]"

echo ""
echo "── 4. docker inspect port bindings ──"
docker inspect "$CONTAINER" 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
if data:
    ports = data[0].get('NetworkSettings', {}).get('Ports', {})
    if ports:
        for k, v in ports.items():
            print(f'  {k} -> {v}')
    else:
        print('  [無 port binding]')
" 2>/dev/null || docker inspect "$CONTAINER" 2>/dev/null | grep -A 5 '"Ports"'

echo ""
echo "── 5. 容器狀態 ──"
docker ps -a --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAMES|phpmyadmin"

echo ""
echo "── 6. host 上佔用 9205 / 8081 的程序 ──"
sudo ss -tlnp | grep -E "9205|8081" || echo "[無程序佔用]"

echo ""
echo "── 7. docker inspect HostConfig.PortBindings ──"
docker inspect "$CONTAINER" 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
if data:
    pb = data[0].get('HostConfig', {}).get('PortBindings', {})
    print(json.dumps(pb, indent=2))
" 2>/dev/null

echo ""
echo "── 8. docker logs (最後 20 行) ──"
docker logs --tail 20 "$CONTAINER" 2>&1

echo ""
echo "======================================"
echo " 診斷完成"
echo "======================================"
