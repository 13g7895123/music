import { performance } from 'perf_hooks'
import request from 'supertest'
import { app } from '../app'
import { prisma } from '../app'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'

describe('API Performance Tests', () => {
  let authToken: string

  beforeAll(async () => {
    await prisma.$connect()
    
    // 建立測試用戶並獲取認證token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'performance-test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        nickname: 'PerformanceTestUser'
      })
    
    authToken = registerResponse.body.data.accessToken
  })

  afterAll(async () => {
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  describe('Authentication Performance', () => {
    it('登入API回應時間應小於500ms', async () => {
      const startTime = performance.now()
      
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'performance-test@example.com',
          password: 'Password123!'
        })
        .expect(200)
      
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      console.log(`Login response time: ${responseTime.toFixed(2)}ms`)
      expect(responseTime).toBeLessThan(500)
    })

    it('註冊API回應時間應小於1000ms', async () => {
      const startTime = performance.now()
      
      await request(app)
        .post('/api/auth/register')
        .send({
          email: `perf-test-${Date.now()}@example.com`,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          nickname: `PerfUser${Date.now()}`
        })
        .expect(201)
      
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      console.log(`Register response time: ${responseTime.toFixed(2)}ms`)
      expect(responseTime).toBeLessThan(1000)
    })

    it('Token刷新API回應時間應小於300ms', async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: `refresh-test-${Date.now()}@example.com`,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          nickname: `RefreshUser${Date.now()}`
        })
      
      const refreshToken = registerResponse.body.data.refreshToken
      
      const startTime = performance.now()
      
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200)
      
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      console.log(`Token refresh response time: ${responseTime.toFixed(2)}ms`)
      expect(responseTime).toBeLessThan(300)
    })

    it('獲取用戶資料API回應時間應小於200ms', async () => {
      const startTime = performance.now()
      
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      console.log(`Profile API response time: ${responseTime.toFixed(2)}ms`)
      expect(responseTime).toBeLessThan(200)
    })
  })

  describe('Playlist Performance', () => {
    beforeEach(async () => {
      // 清理測試播放清單
      await prisma.playlist.deleteMany()
    })

    it('建立播放清單API回應時間應小於400ms', async () => {
      const startTime = performance.now()
      
      await request(app)
        .post('/api/playlists')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Performance Test Playlist ${Date.now()}`,
          description: 'Test playlist for performance testing',
          isPublic: false
        })
        .expect(201)
      
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      console.log(`Create playlist response time: ${responseTime.toFixed(2)}ms`)
      expect(responseTime).toBeLessThan(400)
    })

    it('獲取播放清單列表API回應時間應小於300ms', async () => {
      // 先建立一些測試播放清單
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/playlists')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Test Playlist ${i}`,
            description: `Description ${i}`,
            isPublic: i % 2 === 0
          })
      }

      const startTime = performance.now()
      
      await request(app)
        .get('/api/playlists')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      console.log(`Get playlists response time: ${responseTime.toFixed(2)}ms`)
      expect(responseTime).toBeLessThan(300)
    })

    it('獲取播放清單詳情API回應時間應小於250ms', async () => {
      const createResponse = await request(app)
        .post('/api/playlists')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Detail Test Playlist',
          description: 'Test playlist for detail performance',
          isPublic: false
        })
      
      const playlistId = createResponse.body.data.playlist.id

      const startTime = performance.now()
      
      await request(app)
        .get(`/api/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      console.log(`Get playlist detail response time: ${responseTime.toFixed(2)}ms`)
      expect(responseTime).toBeLessThan(250)
    })
  })

  describe('Concurrent Request Performance', () => {
    it('健康檢查API能處理高併發請求', async () => {
      const concurrentRequests = 50
      const promises: Promise<any>[] = []
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/health')
            .expect(200)
        )
      }
      
      const startTime = performance.now()
      const responses = await Promise.all(promises)
      const endTime = performance.now()
      
      // 所有請求都應該成功
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })
      
      // 總處理時間應該合理
      const totalTime = endTime - startTime
      console.log(`${concurrentRequests} concurrent health checks completed in: ${totalTime.toFixed(2)}ms`)
      expect(totalTime).toBeLessThan(5000)
      
      // 平均回應時間
      const avgResponseTime = totalTime / concurrentRequests
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`)
      expect(avgResponseTime).toBeLessThan(100)
    })

    it('認證API能處理併發請求', async () => {
      const concurrentRequests = 20
      const promises: Promise<any>[] = []
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/auth/profile')
            .set('Authorization', `Bearer ${authToken}`)
        )
      }
      
      const startTime = performance.now()
      const responses = await Promise.all(promises)
      const endTime = performance.now()
      
      // 所有請求都應該成功
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })
      
      // 總處理時間應該合理
      const totalTime = endTime - startTime
      console.log(`${concurrentRequests} concurrent auth requests completed in: ${totalTime.toFixed(2)}ms`)
      expect(totalTime).toBeLessThan(3000)
    })

    it('播放清單API能處理併發請求', async () => {
      // 先建立一些播放清單
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/playlists')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Concurrent Test Playlist ${i}`,
            description: `Description ${i}`,
            isPublic: false
          })
      }

      const concurrentRequests = 15
      const promises: Promise<any>[] = []
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/playlists')
            .set('Authorization', `Bearer ${authToken}`)
        )
      }
      
      const startTime = performance.now()
      const responses = await Promise.all(promises)
      const endTime = performance.now()
      
      // 所有請求都應該成功
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })
      
      // 總處理時間應該合理
      const totalTime = endTime - startTime
      console.log(`${concurrentRequests} concurrent playlist requests completed in: ${totalTime.toFixed(2)}ms`)
      expect(totalTime).toBeLessThan(2000)
    })
  })

  describe('Database Query Performance', () => {
    beforeEach(async () => {
      // 清理並建立測試資料
      await prisma.playlist.deleteMany()
      
      // 建立大量播放清單用於測試
      const playlists = []
      for (let i = 0; i < 100; i++) {
        playlists.push({
          name: `Batch Playlist ${i}`,
          description: `Description for playlist ${i}`,
          isPublic: i % 3 === 0,
          userId: (await prisma.user.findFirst())!.id
        })
      }
      
      await prisma.playlist.createMany({
        data: playlists
      })
    })

    it('分頁查詢效能測試', async () => {
      const startTime = performance.now()
      
      const response = await request(app)
        .get('/api/playlists?page=1&limit=20')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      const endTime = performance.now()
      const queryTime = endTime - startTime
      
      console.log(`Paginated query time: ${queryTime.toFixed(2)}ms`)
      expect(queryTime).toBeLessThan(500)
      expect(response.body.data.playlists).toHaveLength(20)
    })

    it('搜尋查詢效能測試', async () => {
      const startTime = performance.now()
      
      await request(app)
        .get('/api/playlists?search=Batch')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      const endTime = performance.now()
      const queryTime = endTime - startTime
      
      console.log(`Search query time: ${queryTime.toFixed(2)}ms`)
      expect(queryTime).toBeLessThan(800)
    })

    it('排序查詢效能測試', async () => {
      const startTime = performance.now()
      
      await request(app)
        .get('/api/playlists?sort=createdAt&order=desc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      const endTime = performance.now()
      const queryTime = endTime - startTime
      
      console.log(`Sorted query time: ${queryTime.toFixed(2)}ms`)
      expect(queryTime).toBeLessThan(600)
    })
  })

  describe('Memory Usage Tests', () => {
    it('記憶體使用應在合理範圍內', async () => {
      const initialMemory = process.memoryUsage()
      
      // 執行多個API請求
      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app)
            .get('/health')
            .expect(200)
        )
      }
      
      await Promise.all(promises)
      
      // 強制垃圾回收（如果可用）
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024
      
      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`)
      console.log(`Current heap used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
      
      // 記憶體增長應該在合理範圍內（小於50MB）
      expect(memoryIncreaseMB).toBeLessThan(50)
    })

    it('長時間運行不應有記憶體洩漏', async () => {
      const measurements: number[] = []
      
      for (let round = 0; round < 5; round++) {
        // 執行一批API請求
        const promises = []
        for (let i = 0; i < 50; i++) {
          promises.push(
            request(app)
              .get('/api/auth/profile')
              .set('Authorization', `Bearer ${authToken}`)
          )
        }
        
        await Promise.all(promises)
        
        // 強制垃圾回收
        if (global.gc) {
          global.gc()
        }
        
        // 稍微等待讓垃圾回收完成
        await new Promise(resolve => setTimeout(resolve, 100))
        
        const memory = process.memoryUsage().heapUsed / 1024 / 1024
        measurements.push(memory)
        console.log(`Round ${round + 1} memory usage: ${memory.toFixed(2)}MB`)
      }
      
      // 檢查記憶體使用趨勢，不應該持續增長
      const firstMeasurement = measurements[0]
      const lastMeasurement = measurements[measurements.length - 1]
      const memoryGrowth = lastMeasurement - firstMeasurement
      
      console.log(`Total memory growth: ${memoryGrowth.toFixed(2)}MB`)
      
      // 記憶體增長應該小於20MB
      expect(memoryGrowth).toBeLessThan(20)
    })
  })
})