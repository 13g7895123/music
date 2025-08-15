# Story 22: CI/CD部署流程

## 📋 基本資訊
- **Story ID**: YMP-022
- **Epic**: 系統完善
- **優先級**: Should Have (P1)
- **預估點數**: 10 points
- **預估時間**: 2-3 天
- **依賴關係**: Story 21
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 開發團隊  
**我希望** 有自動化的持續整合和部署流程  
**以便** 快速且可靠地發布新功能和修復

## 📝 詳細需求

### 核心功能需求
1. **GitHub Actions**: 自動化CI/CD流程
2. **自動測試**: 每次提交自動執行測試
3. **程式碼品質檢查**: ESLint、TypeScript檢查
4. **Docker化部署**: 容器化部署流程
5. **環境管理**: 開發、測試、生產環境

### 技術規格

**GitHub Actions工作流程**:
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # 程式碼品質檢查
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies (Frontend)
        run: |
          cd frontend
          npm ci

      - name: Install dependencies (Backend)
        run: |
          cd backend
          npm ci

      - name: Lint Frontend
        run: |
          cd frontend
          npm run lint

      - name: Lint Backend
        run: |
          cd backend
          npm run lint

      - name: Type Check Frontend
        run: |
          cd frontend
          npm run type-check

      - name: Type Check Backend
        run: |
          cd backend
          npm run type-check

  # 單元測試
  unit-tests:
    runs-on: ubuntu-latest
    needs: lint-and-type-check
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: musicplayer_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd backend
          npm ci

      - name: Setup test database
        run: |
          cd backend
          npm run db:migrate:test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/musicplayer_test
          REDIS_URL: redis://localhost:6379

      - name: Run Backend Tests
        run: |
          cd backend
          npm run test:coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/musicplayer_test
          REDIS_URL: redis://localhost:6379
          JWT_SECRET: test-secret
          JWT_REFRESH_SECRET: test-refresh-secret

      - name: Run Frontend Tests
        run: |
          cd frontend
          npm ci
          npm run test:unit

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          directory: ./backend/coverage

  # E2E測試
  e2e-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Setup test environment
        run: |
          docker-compose -f docker-compose.test.yml up -d
          sleep 30

      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          npx playwright install

      - name: Run E2E tests
        run: |
          cd frontend
          npm run test:e2e

      - name: Upload E2E test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: e2e-test-results
          path: frontend/test-results/

      - name: Cleanup
        run: docker-compose -f docker-compose.test.yml down

  # 安全性掃描
  security-scan:
    runs-on: ubuntu-latest
    needs: lint-and-type-check
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

      - name: npm audit (Frontend)
        run: |
          cd frontend
          npm audit --audit-level moderate

      - name: npm audit (Backend)
        run: |
          cd backend
          npm audit --audit-level moderate

  # 建置Docker映像
  build-images:
    runs-on: ubuntu-latest
    needs: [unit-tests, security-scan]
    if: github.ref == 'refs/heads/main'
    
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Frontend image
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          file: ./frontend/Dockerfile
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-frontend:${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

      - name: Build and push Backend image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          file: ./backend/Dockerfile
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-backend:${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

  # 部署到測試環境
  deploy-staging:
    runs-on: ubuntu-latest
    needs: [build-images, e2e-tests]
    if: github.ref == 'refs/heads/develop'
    environment: staging
    
    steps:
      - name: Deploy to staging
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/musicplayer-staging
            docker-compose pull
            docker-compose up -d
            docker system prune -f

  # 部署到生產環境
  deploy-production:
    runs-on: ubuntu-latest
    needs: [build-images, e2e-tests]
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/musicplayer-production
            docker-compose pull
            docker-compose up -d --no-deps web
            docker system prune -f

      - name: Health check
        run: |
          sleep 30
          curl -f ${{ secrets.PRODUCTION_URL }}/health || exit 1

      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment completed successfully! 🚀'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
        if: success()
```

**Docker配置**:
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 複製package文件
COPY package*.json ./
RUN npm ci --only=production

# 複製源代碼並建置
COPY . .
RUN npm run build

# 生產階段
FROM nginx:alpine

# 複製建置結果
COPY --from=builder /app/dist /usr/share/nginx/html

# 複製nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

```dockerfile
# backend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 安裝依賴
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production && npm cache clean --force

# 複製源代碼並建置
COPY . .
RUN npm run build
RUN npx prisma generate

# 生產階段
FROM node:18-alpine

WORKDIR /app

# 建立非root用戶
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 複製必要文件
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

USER nodejs

EXPOSE 3000

CMD ["npm", "start"]
```

**部署配置**:
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  frontend:
    image: ghcr.io/13g7895123/music-frontend:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    image: ghcr.io/13g7895123/music-backend:latest
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

  # 備份服務
  backup:
    image: postgres:15
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - ./backups:/backups
      - postgres_data:/var/lib/postgresql/data:ro
    command: |
      sh -c "
      while true; do
        pg_dump -h postgres -U $$POSTGRES_USER $$POSTGRES_DB > /backups/backup_$$(date +%Y%m%d_%H%M%S).sql
        find /backups -name '*.sql' -mtime +7 -delete
        sleep 86400
      done
      "
    depends_on:
      - postgres
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    driver: bridge
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `.github/workflows/ci-cd.yml` - CI/CD工作流程
- `frontend/Dockerfile` - 前端Docker配置
- `backend/Dockerfile` - 後端Docker配置
- `docker-compose.prod.yml` - 生產環境配置
- `docker-compose.test.yml` - 測試環境配置
- `scripts/deploy.sh` - 部署腳本

**更新檔案**:
- `package.json` - 添加部署腳本
- `.gitignore` - 忽略部署相關檔案
- `README.md` - 添加部署說明

## ✅ 驗收條件

### CI/CD流程驗收
- [ ] 每次提交自動執行測試
- [ ] 程式碼品質檢查通過
- [ ] 安全性掃描無高風險問題
- [ ] Docker映像成功建置
- [ ] 自動部署到對應環境

### 部署驗收
- [ ] 測試環境自動部署
- [ ] 生產環境手動確認部署
- [ ] 健康檢查正常運作
- [ ] 回滾機制正常
- [ ] 備份機制正常運作

### 監控驗收
- [ ] 部署狀態通知正常
- [ ] 日誌收集完整
- [ ] 錯誤追蹤正常

## 🚀 實作指引

### Step 1: 設置GitHub Actions
建立CI/CD工作流程配置

### Step 2: 配置Docker
建立前後端Docker映像

### Step 3: 設置部署環境
配置測試和生產環境

### Step 4: 測試部署流程
驗證整個CI/CD流程

## 📊 預期成果
- ✅ 全自動化CI/CD流程
- ✅ 可靠的測試覆蓋
- ✅ 安全的部署流程
- ✅ 完整的監控機制
- ✅ 快速的問題回應