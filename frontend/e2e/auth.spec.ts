import { test, expect } from '@playwright/test'

test.describe('用戶認證流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('完整的註冊和登入流程', async ({ page }) => {
    const testEmail = `e2e-test-${Date.now()}@example.com`
    const testNickname = `E2E Test User ${Date.now()}`

    // 導航到註冊頁面
    await page.click('text=註冊')
    await expect(page).toHaveURL(/\/auth\/register/)

    // 填寫註冊表單
    await page.fill('[data-testid="email-input"]', testEmail)
    await page.fill('[data-testid="password-input"]', 'Password123!')
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!')
    await page.fill('[data-testid="nickname-input"]', testNickname)

    // 提交註冊表單
    await page.click('[data-testid="register-button"]')

    // 驗證註冊成功並重導向到儀表板
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator(`text=歡迎, ${testNickname}`)).toBeVisible()

    // 登出
    await page.click('[data-testid="user-menu"]')
    await page.click('text=登出')
    await expect(page).toHaveURL(/\/auth\/login/)

    // 重新登入
    await page.fill('[data-testid="email-input"]', testEmail)
    await page.fill('[data-testid="password-input"]', 'Password123!')
    await page.click('[data-testid="login-button"]')

    // 驗證登入成功
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator(`text=歡迎, ${testNickname}`)).toBeVisible()
  })

  test('註冊表單驗證', async ({ page }) => {
    await page.goto('/auth/register')

    // 測試空表單提交
    await page.click('[data-testid="register-button"]')
    
    // 驗證錯誤訊息
    await expect(page.locator('[data-testid="email-error"]')).toContainText('電子郵件為必填')
    await expect(page.locator('[data-testid="password-error"]')).toContainText('密碼為必填')

    // 測試無效的電子郵件格式
    await page.fill('[data-testid="email-input"]', 'invalid-email')
    await page.blur('[data-testid="email-input"]')
    await expect(page.locator('[data-testid="email-error"]')).toContainText('請輸入有效的電子郵件')

    // 測試弱密碼
    await page.fill('[data-testid="password-input"]', 'weak')
    await page.blur('[data-testid="password-input"]')
    await expect(page.locator('[data-testid="password-error"]')).toContainText('密碼至少需要8個字元')

    // 測試密碼確認不匹配
    await page.fill('[data-testid="password-input"]', 'Password123!')
    await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword!')
    await page.blur('[data-testid="confirm-password-input"]')
    await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText('密碼確認不匹配')

    // 測試暱稱太短
    await page.fill('[data-testid="nickname-input"]', 'A')
    await page.blur('[data-testid="nickname-input"]')
    await expect(page.locator('[data-testid="nickname-error"]')).toContainText('暱稱至少需要2個字元')
  })

  test('登入表單驗證', async ({ page }) => {
    await page.goto('/auth/login')

    // 測試空表單提交
    await page.click('[data-testid="login-button"]')
    
    // 驗證錯誤訊息
    await expect(page.locator('[data-testid="email-error"]')).toContainText('電子郵件為必填')
    await expect(page.locator('[data-testid="password-error"]')).toContainText('密碼為必填')

    // 測試無效憑證
    await page.fill('[data-testid="email-input"]', 'nonexistent@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    await page.click('[data-testid="login-button"]')

    // 驗證登入失敗訊息
    await expect(page.locator('[data-testid="error-message"]')).toContainText('電子郵件或密碼錯誤')
  })

  test('密碼重設流程', async ({ page }) => {
    await page.goto('/auth/login')

    // 點擊忘記密碼
    await page.click('text=忘記密碼？')
    await expect(page).toHaveURL(/\/auth\/forgot-password/)

    // 填寫電子郵件
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.click('[data-testid="reset-button"]')

    // 驗證成功訊息
    await expect(page.locator('[data-testid="success-message"]')).toContainText('重設密碼連結已寄送')
  })

  test('記住我功能', async ({ page }) => {
    // 先註冊一個測試用戶
    const testEmail = `remember-test-${Date.now()}@example.com`
    await page.goto('/auth/register')
    await page.fill('[data-testid="email-input"]', testEmail)
    await page.fill('[data-testid="password-input"]', 'Password123!')
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!')
    await page.fill('[data-testid="nickname-input"]', 'Remember Test User')
    await page.click('[data-testid="register-button"]')

    // 登出
    await page.click('[data-testid="user-menu"]')
    await page.click('text=登出')

    // 使用記住我登入
    await page.fill('[data-testid="email-input"]', testEmail)
    await page.fill('[data-testid="password-input"]', 'Password123!')
    await page.check('[data-testid="remember-me-checkbox"]')
    await page.click('[data-testid="login-button"]')

    // 驗證登入成功
    await expect(page).toHaveURL(/\/dashboard/)

    // 刷新頁面，應該仍然保持登入狀態
    await page.reload()
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('text=Remember Test User')).toBeVisible()
  })

  test('會話過期處理', async ({ page }) => {
    // 註冊並登入
    const testEmail = `session-test-${Date.now()}@example.com`
    await page.goto('/auth/register')
    await page.fill('[data-testid="email-input"]', testEmail)
    await page.fill('[data-testid="password-input"]', 'Password123!')
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!')
    await page.fill('[data-testid="nickname-input"]', 'Session Test User')
    await page.click('[data-testid="register-button"]')

    // 模擬token過期（透過開發者工具清除localStorage）
    await page.evaluate(() => {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    })

    // 嘗試訪問需要認證的頁面
    await page.goto('/playlists')

    // 應該被重導向到登入頁面
    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(page.locator('[data-testid="error-message"]')).toContainText('請先登入')
  })

  test('響應式設計 - 行動版認證', async ({ page }) => {
    // 設定行動裝置視窗大小
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/auth/login')

    // 驗證行動版佈局
    await expect(page.locator('.auth-container')).toHaveClass(/mobile-layout/)
    
    // 確保表單在小螢幕上仍可正常使用
    await page.fill('[data-testid="email-input"]', 'mobile@example.com')
    await page.fill('[data-testid="password-input"]', 'Password123!')

    // 驗證輸入欄位在行動版上的可見性
    const emailInput = page.locator('[data-testid="email-input"]')
    const passwordInput = page.locator('[data-testid="password-input"]')
    
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()

    // 驗證按鈕在行動版上的大小和可點擊性
    const loginButton = page.locator('[data-testid="login-button"]')
    await expect(loginButton).toBeVisible()
    
    const buttonBox = await loginButton.boundingBox()
    expect(buttonBox?.height).toBeGreaterThan(44) // 行動裝置觸控友善的最小高度
  })

  test('鍵盤導航和無障礙功能', async ({ page }) => {
    await page.goto('/auth/login')

    // 測試Tab鍵導航
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="email-input"]')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="password-input"]')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="remember-me-checkbox"]')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="login-button"]')).toBeFocused()

    // 測試Enter鍵提交表單
    await page.fill('[data-testid="email-input"]', 'keyboard@example.com')
    await page.fill('[data-testid="password-input"]', 'Password123!')
    await page.locator('[data-testid="login-button"]').focus()
    await page.keyboard.press('Enter')

    // 應該嘗試登入（雖然可能失敗，但表單應該被提交）
    await page.waitForTimeout(1000) // 等待請求完成
  })
})

test.describe('導航和佈局', () => {
  test.beforeEach(async ({ page }) => {
    // 註冊並登入測試用戶
    const testEmail = `nav-test-${Date.now()}@example.com`
    await page.goto('/auth/register')
    await page.fill('[data-testid="email-input"]', testEmail)
    await page.fill('[data-testid="password-input"]', 'Password123!')
    await page.fill('[data-testid="confirm-password-input"]', 'Password123!')
    await page.fill('[data-testid="nickname-input"]', 'Nav Test User')
    await page.click('[data-testid="register-button"]')
  })

  test('主導航功能', async ({ page }) => {
    // 測試儀表板導航
    await page.click('[data-testid="nav-dashboard"]')
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('h1')).toContainText('儀表板')

    // 測試播放清單導航
    await page.click('[data-testid="nav-playlists"]')
    await expect(page).toHaveURL(/\/playlists/)
    await expect(page.locator('h1')).toContainText('播放清單')

    // 測試搜尋導航
    await page.click('[data-testid="nav-search"]')
    await expect(page).toHaveURL(/\/search/)
    await expect(page.locator('h1')).toContainText('搜尋')

    // 測試設定導航
    await page.click('[data-testid="nav-settings"]')
    await expect(page).toHaveURL(/\/settings/)
    await expect(page.locator('h1')).toContainText('設定')
  })

  test('用戶選單功能', async ({ page }) => {
    // 點擊用戶頭像或選單
    await page.click('[data-testid="user-menu"]')

    // 驗證選單項目
    await expect(page.locator('[data-testid="menu-profile"]')).toBeVisible()
    await expect(page.locator('[data-testid="menu-settings"]')).toBeVisible()
    await expect(page.locator('[data-testid="menu-logout"]')).toBeVisible()

    // 測試個人檔案連結
    await page.click('[data-testid="menu-profile"]')
    await expect(page).toHaveURL(/\/profile/)

    // 回到儀表板並測試設定連結
    await page.goto('/dashboard')
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="menu-settings"]')
    await expect(page).toHaveURL(/\/settings/)
  })

  test('麵包屑導航', async ({ page }) => {
    // 導航到播放清單詳情頁面（假設有播放清單）
    await page.goto('/playlists/1')

    // 驗證麵包屑
    await expect(page.locator('[data-testid="breadcrumb"]')).toBeVisible()
    await expect(page.locator('[data-testid="breadcrumb-home"]')).toContainText('首頁')
    await expect(page.locator('[data-testid="breadcrumb-playlists"]')).toContainText('播放清單')
    await expect(page.locator('[data-testid="breadcrumb-current"]')).toBeVisible()

    // 測試麵包屑導航
    await page.click('[data-testid="breadcrumb-playlists"]')
    await expect(page).toHaveURL(/\/playlists/)
  })

  test('行動版選單', async ({ page }) => {
    // 設定行動裝置視窗
    await page.setViewportSize({ width: 375, height: 667 })

    // 在行動版本中，主導航應該隱藏，顯示漢堡選單
    await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible()
    await expect(page.locator('[data-testid="desktop-nav"]')).toBeHidden()

    // 點擊漢堡選單
    await page.click('[data-testid="mobile-menu-toggle"]')
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible()

    // 測試行動版導航項目
    await page.click('[data-testid="mobile-nav-playlists"]')
    await expect(page).toHaveURL(/\/playlists/)

    // 選單應該自動關閉
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeHidden()
  })
})