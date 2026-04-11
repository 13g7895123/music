# Cloudflare 無法連到 NPM，出現 SSL handshake failed 的完整修復與除錯手冊

本文針對本專案的實際架構撰寫：

```text
Cloudflare
  -> Nginx Proxy Manager（NPM, 80/443, SSL 終止）
  -> 127.0.0.1:APP_PORT
  -> Docker nginx
  -> frontend / backend / phpMyAdmin
```

如果你看到 Cloudflare 顯示 `SSL handshake failed`、`Error 525`，或判斷 Cloudflare 無法連到 NPM，請直接從這份文件開始查，不要先去改 Vue、CodeIgniter 或 MariaDB。

---

## 先講結論

`SSL handshake failed` 幾乎都表示：

1. **Cloudflare 成功找到你的主機 IP。**
2. **但 Cloudflare 和 NPM 的 443 TLS 握手失敗。**

最常見根因是：

1. 主機的 `443` 根本沒開，或沒到 NPM
2. 防火牆 / 安全群組 / 路由器沒放行 `80/443`
3. DNS 指到錯的 IP，或 AAAA 記錄指到無法服務的 IPv6
4. NPM 憑證失效、過期、簽發錯網域、沒有對應 SNI
5. Cloudflare SSL/TLS 模式設太嚴格，但 NPM 的憑證不合法
6. NAT / Port Forward 沒把公網 `443` 轉到 NPM 所在主機
7. NPM 本身容器壞掉或沒有監聽主機 `443`

---

## 本專案的正確責任分工

### 1. Cloudflare 的責任

- DNS 解析
- Proxy / CDN / WAF
- 對 Origin 發起 HTTPS 連線

### 2. NPM 的責任

- 監聽主機 `80` / `443`
- 管理網域憑證
- 接受 Cloudflare 的 TLS 握手
- 把流量轉到 `127.0.0.1:APP_PORT`

### 3. Docker nginx 的責任

- 接受 NPM 的 HTTP 轉發
- 將 `/` 導向 frontend
- 將 `/api` 導向 backend
- 將 `/pma/` 導向 phpMyAdmin

### 4. 重要結論

若 Cloudflare 連不到 NPM，**應用容器正常與否通常不是第一優先**。先處理公網到 NPM 的問題。

---

## 症狀對照表

| 症狀 | 常見原因 |
|------|----------|
| Cloudflare 525 | Origin 443 無法完成 TLS 握手 |
| Cloudflare 526 | Origin 憑證無效、不受信任或主機名不匹配 |
| Cloudflare 522 | TCP 連不到 origin，常見是 firewall/port/block |
| 直接開 `https://你的網域` 失敗，但本機 `curl http://127.0.0.1:APP_PORT` 正常 | NPM / 443 / 憑證 / Cloudflare 設定問題 |
| NPM 面板顯示憑證正常，但 Cloudflare 還是 525 | 多半是公網 443 沒到 NPM、DNS 錯誤、IPv6 錯誤、或 NPM 綁錯主機 |

---

## 建議除錯順序

依這個順序查，效率最高：

1. DNS 是否正確
2. Cloudflare SSL 模式是否合理
3. 主機 80/443 是否真的有被 NPM 監聽
4. 公網是否可到達 80/443
5. NPM 憑證是否正確且未過期
6. NPM Proxy Host 是否正確轉到 `127.0.0.1:APP_PORT`
7. Docker 服務是否健康

---

## Step 1：確認 Cloudflare DNS 設定

請先看 Cloudflare DNS 是否真的指到 NPM 所在主機的公網 IP。

### 你應該檢查

1. `A` 記錄是否指向正確 IPv4
2. 如果有 `AAAA` 記錄，該 IPv6 是否真的可達
3. 要不要讓該網域走 Proxy（橙色雲）
4. `www`、主網域、子網域是否都設定一致

### 常見錯誤

#### 錯誤 1：A 記錄正確，但 AAAA 記錄是舊的或不可達

Cloudflare 可能優先走 IPv6，結果連到不存在或沒開 443 的主機，表面上就會像 `SSL handshake failed`。

#### 修復方式

- 若你沒有正確配置 IPv6，先刪掉 `AAAA` 記錄
- 或確保 IPv6 也能到達同一台 NPM 主機，且 `443` 已開通

### 查詢指令

```bash
dig +short your-domain.com A
dig +short your-domain.com AAAA
```

如果回傳的 IP 不是 NPM 主機的公網 IP，先修 DNS，不要往下查。

---

## Step 2：確認 Cloudflare SSL/TLS 模式

Cloudflare 到 NPM 這一段要用哪種模式，取決於 NPM 上的憑證。

### 建議策略

| 模式 | 用途 | 建議 |
|------|------|------|
| Flexible | Cloudflare 到 origin 用 HTTP | 不建議，本專案不應使用 |
| Full | Cloudflare 到 origin 用 HTTPS，但不嚴格驗證憑證 | 可作為暫時除錯 |
| Full (strict) | Cloudflare 到 origin 用 HTTPS，且驗證憑證 | 正式環境建議 |

### 實務判斷

- 若 NPM 使用 **Let's Encrypt** 且憑證有效，請用 **Full (strict)**
- 若你正在修憑證問題，暫時可以切成 **Full** 來驗證網路通不通
- **不要用 Flexible**，容易讓轉址與安全設定混亂

### 關鍵觀念

`525` 偏向 TLS 握手失敗；`526` 比較像是握到了，但 Cloudflare 不接受該憑證。

---

## Step 3：確認 NPM 真的有監聽主機的 80/443

在 NPM 主機上執行：

```bash
sudo ss -tlnp | grep -E ':80 |:443 '
```

你要看到類似：

```text
LISTEN 0 511 0.0.0.0:80  ... nginx
LISTEN 0 511 0.0.0.0:443 ... nginx
```

或是 NPM 容器對映到主機的 `80:80`、`443:443`。

### 如果看不到 443

表示 Cloudflare 不可能和你的 origin 完成 TLS 握手。

請檢查：

1. NPM 是否啟動
2. 其他服務是否搶占 `80/443`
3. 反向代理是否其實不在這台主機上

### Docker 版 NPM 檢查

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}' | grep -E '80->|443->'
```

如果 NPM 容器沒有把主機 `80/443` 對映出來，Cloudflare 一定連不到它。

---

## Step 4：確認公網 80/443 是否真正可到達

這一步要區分「本機有監聽」和「公網可達」是兩回事。

### 先檢查主機防火牆

#### UFW

```bash
sudo ufw status
```

你至少要放行：

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

#### firewalld

```bash
sudo firewall-cmd --list-services
sudo firewall-cmd --add-service=http --permanent
sudo firewall-cmd --add-service=https --permanent
sudo firewall-cmd --reload
```

### 如果在雲端主機

你還要檢查：

- AWS Security Group
- GCP Firewall Rules
- Azure NSG
- Hetzner / DigitalOcean / Vultr 的網路 ACL

### 如果在家用或機房 NAT 後面

你還要檢查：

- Router/NAT 是否將公網 `80/443` 轉發到 NPM 主機
- 是否轉發到正確的 LAN IP
- 是否有 ISP 阻擋 80/443

### 外部可達性驗證

從外部網路測：

```bash
curl -I http://your-domain.com
curl -vk https://your-domain.com
```

如果 `curl -vk` 在 Cloudflare 關閉代理時也打不通，那問題就是 origin 自己，不是 Cloudflare。

---

## Step 5：暫時灰雲，直接驗證 NPM Origin

這是最有效的切割法。

### 操作方式

1. 到 Cloudflare DNS
2. 把目標網域從橙雲改成灰雲（DNS only）
3. 等 1 到 3 分鐘
4. 直接測試：

```bash
curl -vk https://your-domain.com
```

### 結果判讀

#### 情況 A：灰雲後 HTTPS 仍失敗

表示 NPM 自己就有問題，常見是：

- NPM 443 沒監聽
- 憑證錯誤
- 防火牆 / Port Forward 問題
- DNS 指錯 IP

#### 情況 B：灰雲後 HTTPS 正常，橙雲才失敗

表示問題集中在：

- Cloudflare SSL 模式
- Cloudflare DNS / IPv6
- Cloudflare 到 origin 的憑證驗證
- Cloudflare 特定安全規則

這一步可以快速把問題範圍砍半。

---

## Step 6：檢查 NPM 的 SSL 憑證本身

NPM 若是用 Let's Encrypt，請檢查：

1. 憑證是否對應正確網域
2. 是否已過期
3. 是否成功續簽
4. 該 Proxy Host 是否真的綁定這張憑證

### 你應該在 NPM UI 檢查

- Proxy Hosts -> 你的網域 -> SSL
- SSL Certificates -> 憑證狀態

### 常見錯誤

#### 錯誤 1：Proxy Host 綁了錯網域的憑證

例如憑證是 `example.com`，但你實際訪問的是 `app.example.com`。

#### 錯誤 2：憑證過期但沒注意

Cloudflare 在 Full (strict) 下會直接拒絕。

#### 錯誤 3：只建立了 HTTP Proxy Host，沒勾 SSL

這種情況下主機可能只有 80 正常，443 無對應 SNI。

### 命令列驗證憑證

```bash
openssl s_client -connect your-domain.com:443 -servername your-domain.com </dev/null
```

你要檢查：

- `subject=` 是否是正確網域
- `issuer=` 是否合理
- `Verify return code: 0 (ok)` 是否成立

如果這一步在灰雲狀態下就失敗，先修 NPM 憑證。

---

## Step 7：確認 NPM Proxy Host 代理目標正確

本專案的正確 NPM Forward 目標不是 frontend 容器，也不是 backend 容器，而是：

```text
Scheme: http
Forward Hostname / IP: 127.0.0.1
Forward Port: APP_PORT
```

### 為什麼

因為 `docker/docker-compose.yml` 將 Docker `nginx` 映射到主機 `${APP_PORT}:80`，而 Docker nginx 已經負責：

- `/` -> frontend
- `/api` -> backend
- `/pma/` -> phpMyAdmin

### 常見錯誤配置

#### 錯誤 1：NPM 指到舊的 port

例如主機現在 `APP_PORT=80`，但 NPM 仍轉到 `3000`、`5173`、`8080`。

#### 錯誤 2：NPM 指到容器內部 port

例如把 `backend:9000` 或 `frontend:80` 直接填進 NPM，但 NPM 根本不在同一個 Docker network。

#### 錯誤 3：NPM 指到錯主機

例如填了另一台內網主機 IP。

### 驗證方式

在 NPM 所在主機上測：

```bash
curl -I http://127.0.0.1:80
curl -I http://127.0.0.1:${APP_PORT}
```

如果 NPM 設定的目標 port 打不通，就算 TLS 正常，網站也仍然會壞，只是那通常會變成 502，而不是 525。

---

## Step 8：確認本專案 Docker 服務本身正常

雖然 525 大多不在這層，但仍要確認內部服務沒有跟著壞掉。

### 檢查 compose 狀態

```bash
cd /path/to/project/docker
docker compose ps
```

應至少看到：

- `nginx` 為 `Up`
- `frontend` 為 `healthy`
- `backend` 為 `healthy`
- `phpmyadmin` 為 `healthy`
- `mariadb` 為 `healthy`

### 如果 docker nginx 沒起來

NPM 會代理不到 `APP_PORT`，但這通常呈現為 502/504，而非 525。

### 檢查 APP_PORT 是否正確

```bash
grep '^APP_PORT=' docker/.env
sudo ss -tlnp | grep ':80 '
```

若 `.env` 裡 APP_PORT 不是你預期的值，NPM 也要同步修改。

---

## Step 9：針對 Cloudflare 特有問題做交叉驗證

### 問題 1：Cloudflare 只在 Proxy 狀態失敗

優先檢查：

- SSL/TLS mode 是否 `Full (strict)` 但 NPM 憑證無效
- 是否有 AAAA 指到錯誤 IPv6
- Cloudflare 是否有 Origin Rule / Redirect Rule 造成錯亂
- 是否啟用了 Authenticated Origin Pulls，但 NPM 沒配置對應 client cert 驗證

### 問題 2：只特定子網域失敗

優先檢查：

- 該子網域是否有獨立 Proxy Host
- 該 Proxy Host 是否綁定正確憑證
- Cloudflare DNS 是否該筆記錄獨立指到別的 IP

### 問題 3：HTTP 正常，HTTPS 才失敗

幾乎直接指向：

- NPM SSL 設定
- 主機 443 沒開
- 憑證錯誤
- Cloudflare SSL mode 錯配

---

## Step 10：快速修復策略

如果你需要先把站救起來，再做完整整理，建議用以下順序：

### 方案 A：先確認 origin 可直接 HTTPS

1. 灰雲
2. 修好 NPM 443、憑證、DNS
3. `curl -vk https://your-domain.com` 成功
4. 再切回橙雲

### 方案 B：Cloudflare 暫時改 Full

適用於：

- NPM 憑證暫時有瑕疵
- 你要先確認網路通路

修法：

1. Cloudflare SSL/TLS 模式從 `Full (strict)` 改成 `Full`
2. 驗證網站是否恢復
3. 之後補好 NPM 憑證，再切回 `Full (strict)`

### 方案 C：重新簽發 NPM 憑證

適用於：

- 憑證過期
- 綁錯網域
- 續簽失敗

修法：

1. 確認 Cloudflare 暫時灰雲或允許 ACME 驗證通過
2. 在 NPM 重新申請 Let's Encrypt
3. 成功後重新綁到對應 Proxy Host
4. 再切回 Cloudflare 橙雲

---

## 實際排查指令清單

以下指令可直接在主機上執行。

### DNS

```bash
dig +short your-domain.com A
dig +short your-domain.com AAAA
```

### 主機監聽

```bash
sudo ss -tlnp | grep -E ':80 |:443 '
```

### Docker 容器與 port

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}'
cd /path/to/project/docker && docker compose ps
```

### 本機測 NPM 轉發目標

```bash
curl -I http://127.0.0.1:80
curl -I http://127.0.0.1:${APP_PORT}
```

### 直接測 origin TLS

```bash
curl -vk https://your-domain.com
openssl s_client -connect your-domain.com:443 -servername your-domain.com </dev/null
```

### 防火牆

```bash
sudo ufw status
sudo iptables -S
sudo nft list ruleset
```

---

## 建議檢查表

### Layer 1：DNS

- [ ] `A` 記錄是正確公網 IPv4
- [ ] 若有 `AAAA`，IPv6 可用且 443 有開
- [ ] 目標網域已啟用 Cloudflare Proxy 或刻意灰雲測試

### Layer 2：主機入口

- [ ] 主機 `80/443` 有監聽
- [ ] 防火牆放行 `80/443`
- [ ] 雲平台安全群組放行 `80/443`
- [ ] NAT / Port Forward 正確

### Layer 3：NPM

- [ ] Proxy Host 網域正確
- [ ] SSL 憑證正確且未過期
- [ ] Proxy Host 綁定正確憑證
- [ ] Forward Hostname/IP = `127.0.0.1`
- [ ] Forward Port = `APP_PORT`

### Layer 4：應用

- [ ] Docker `nginx` 正常
- [ ] `frontend` healthy
- [ ] `backend` healthy
- [ ] `phpmyadmin` healthy
- [ ] `mariadb` healthy

---

## 對本專案最容易踩到的幾個點

### 1. `APP_PORT` 改了，但 NPM 沒同步

`scripts/deploy.sh` 會依 `docker/envs/.env.production` 產生 `docker/.env`。如果 `APP_PORT` 曾改動，但 NPM Proxy Host 還指向舊 port，就會發生 origin 不可用。

### 2. 有 `AAAA` 記錄，但主機根本沒設 IPv6

這是 Cloudflare 站點很常見的假性 SSL 問題。

### 3. NPM 的憑證過期，但你只測了 HTTP

HTTP 正常不代表 Cloudflare 到 origin 的 HTTPS 正常。

### 4. 在 Cloudflare 開了 Full (strict)，但 NPM 憑證網域不匹配

這種情況常在改子網域、切換主網域、搬站後發生。

---

## 建議的修復決策樹

### 情況一：灰雲後 `https://your-domain.com` 也失敗

先修：

1. DNS 是否正確
2. 主機 `443` 是否有到 NPM
3. NPM 憑證是否有效
4. 防火牆 / NAT / 安全群組

### 情況二：灰雲正常，橙雲失敗

先修：

1. Cloudflare SSL mode 改成 `Full`
2. 測試是否恢復
3. 若恢復，檢查 NPM 憑證是否適合 `Full (strict)`
4. 檢查 AAAA / IPv6

### 情況三：只有某子網域失敗

先修：

1. 該 DNS 記錄
2. 該 NPM Proxy Host
3. 該憑證是否涵蓋該子網域

---

## 修好後的建議最終狀態

正式環境建議收斂到以下狀態：

1. Cloudflare DNS 指向正確的公網 IP
2. 不保留錯誤的 `AAAA` 記錄
3. 主機 `80/443` 對外可達
4. NPM 正常監聽 `80/443`
5. NPM Proxy Host 指向 `127.0.0.1:APP_PORT`
6. NPM 持有有效的 Let's Encrypt 憑證
7. Cloudflare SSL/TLS 模式使用 `Full (strict)`
8. Docker `nginx`、frontend、backend、mariadb 都健康

---

## 若你要我直接幫你進一步定位

請至少提供以下資訊，我可以更快判斷是哪一層出錯：

1. Cloudflare 的錯誤代碼是 `525`、`526` 還是別的
2. 目前 DNS 有沒有 `AAAA`
3. NPM 是主機安裝還是 Docker 容器安裝
4. `sudo ss -tlnp | grep -E ':80 |:443 '` 的結果
5. 灰雲後 `curl -vk https://your-domain.com` 的結果
6. NPM 該 Proxy Host 的 Forward Host / Port 與憑證狀態

有了這些，通常可以在很短時間內縮到單一根因。