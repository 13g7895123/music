import request from 'supertest'
import { app } from '../app'
import { prisma } from '../app'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { encryptionService } from '../utils/encryption'

describe('Auth API', () => {
  beforeAll(async () => {
    // 測試資料庫設置
    await prisma.$connect()
  })

  afterAll(async () => {
    // 清理測試資料
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // 清理測試用戶
    await prisma.user.deleteMany()
  })

  describe('POST /api/auth/register', () => {
    it('成功註冊新用戶', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        nickname: 'TestUser'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe(userData.email)
      expect(response.body.data.user.nickname).toBe(userData.nickname)
      expect(response.body.data.accessToken).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()
      expect(response.body.data.expiresIn).toBeDefined()

      // 驗證用戶已在資料庫中建立
      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      })
      expect(user).toBeTruthy()
      expect(user?.nickname).toBe(userData.nickname)
    })

    it('拒絕重複的電子郵件', async () => {
      // 先建立一個用戶
      const hashedPassword = await encryptionService.hashPassword('Password123!')
      await prisma.user.create({
        data: {
          email: 'existing@example.com',
          password: hashedPassword,
          nickname: 'ExistingUser'
        }
      })

      const userData = {
        email: 'existing@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        nickname: 'NewUser'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS')
    })

    it('驗證密碼強度 - 弱密碼', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        confirmPassword: 'weak',
        nickname: 'TestUser'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('Validation failed')
    })

    it('驗證密碼確認不匹配', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!',
        nickname: 'TestUser'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    it('驗證必填欄位', async () => {
      const userData = {
        email: 'test@example.com',
        // 缺少password
        nickname: 'TestUser'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    it('驗證電子郵件格式', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        nickname: 'TestUser'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    it('驗證暱稱長度', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        nickname: 'A' // 太短
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // 建立測試用戶
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          nickname: 'TestUser'
        })
    })

    it('成功登入', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe(loginData.email)
      expect(response.body.data.accessToken).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()
      expect(response.body.data.expiresIn).toBeDefined()
    })

    it('拒絕無效密碼', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
    })

    it('拒絕不存在的用戶', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123!'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
    })

    it('記住我功能', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!',
        rememberMe: true
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200)

      expect(response.body.success).toBe(true)
      // 當rememberMe為true時，refresh token應該有更長的過期時間
      expect(response.body.data.refreshToken).toBeDefined()
    })

    it('處理Rate Limiting', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      }

      // 多次失敗登入嘗試
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData)
      }

      // 第6次應該被Rate Limiter阻擋
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(429)

      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
    })
  })

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string

    beforeEach(async () => {
      // 註冊並登入獲取refresh token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          nickname: 'TestUser'
        })
      
      refreshToken = registerResponse.body.data.refreshToken
    })

    it('成功刷新token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.accessToken).toBeDefined()
      expect(response.body.data.refreshToken).toBeDefined()
      expect(response.body.data.expiresIn).toBeDefined()
    })

    it('拒絕無效的refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('INVALID_TOKEN')
    })

    it('拒絕空的refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    it('拒絕格式錯誤的token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'not.a.jwt.token' })
        .expect(401)

      expect(response.body.success).toBe(false)
    })
  })

  describe('GET /api/auth/profile', () => {
    let accessToken: string

    beforeEach(async () => {
      // 註冊並登入獲取access token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          nickname: 'TestUser'
        })
      
      accessToken = registerResponse.body.data.accessToken
    })

    it('成功獲取用戶資料', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.email).toBe('test@example.com')
      expect(response.body.data.user.nickname).toBe('TestUser')
      expect(response.body.data.user.password).toBeUndefined() // 密碼不應該回傳
    })

    it('拒絕無效的access token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('INVALID_TOKEN')
    })

    it('拒絕無Authorization標頭', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('MISSING_TOKEN')
    })
  })

  describe('POST /api/auth/logout', () => {
    let accessToken: string

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          nickname: 'TestUser'
        })
      
      accessToken = registerResponse.body.data.accessToken
    })

    it('成功登出', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('登出成功')
    })

    it('登出後token應被加入黑名單', async () => {
      // 先登出
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      // 嘗試使用已登出的token
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401)

      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/auth/password-reset', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          nickname: 'TestUser'
        })
    })

    it('成功請求密碼重設', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset')
        .send({ email: 'test@example.com' })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.message).toContain('reset link')
    })

    it('不存在的Email也返回成功（安全考量）', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset')
        .send({ email: 'nonexistent@example.com' })
        .expect(200)

      expect(response.body.success).toBe(true)
    })

    it('驗證Email格式', async () => {
      const response = await request(app)
        .post('/api/auth/password-reset')
        .send({ email: 'invalid-email' })
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    it('處理Rate Limiting', async () => {
      // 多次請求密碼重設
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/auth/password-reset')
          .send({ email: 'test@example.com' })
      }

      // 第4次應該被Rate Limiter阻擋
      const response = await request(app)
        .post('/api/auth/password-reset')
        .send({ email: 'test@example.com' })
        .expect(429)

      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
    })
  })
})