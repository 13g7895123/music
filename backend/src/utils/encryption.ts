import crypto from 'crypto'
import bcrypt from 'bcrypt'

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly keyLength = 32
  private readonly ivLength = 16
  private readonly tagLength = 16
  private readonly saltRounds = 12

  private getEncryptionKey(): Buffer {
    const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key'
    return crypto.scryptSync(secret, 'salt', this.keyLength)
  }

  // 加密敏感資料
  encrypt(text: string): string {
    const key = this.getEncryptionKey()
    const iv = crypto.randomBytes(this.ivLength)
    
    const cipher = crypto.createCipher(this.algorithm, key)
    cipher.setAAD(Buffer.from('mytune-app'))
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    // 組合 IV + encrypted + tag
    return iv.toString('hex') + ':' + encrypted + ':' + tag.toString('hex')
  }

  // 解密敏感資料
  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format')
    }

    const key = this.getEncryptionKey()
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    const tag = Buffer.from(parts[2], 'hex')

    const decipher = crypto.createDecipher(this.algorithm, key)
    decipher.setAAD(Buffer.from('mytune-app'))
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  // 密碼雜湊
  async hashPassword(password: string): Promise<string> {
    // 添加pepper（應用程式級別的秘密）
    const pepper = process.env.PASSWORD_PEPPER || 'default-pepper'
    const passwordWithPepper = password + pepper
    
    return bcrypt.hash(passwordWithPepper, this.saltRounds)
  }

  // 驗證密碼
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const pepper = process.env.PASSWORD_PEPPER || 'default-pepper'
    const passwordWithPepper = password + pepper
    
    return bcrypt.compare(passwordWithPepper, hash)
  }

  // 生成安全的隨機字串
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  // 生成API密鑰
  generateApiKey(): string {
    const timestamp = Date.now().toString()
    const random = crypto.randomBytes(16).toString('hex')
    return `mtk_${timestamp}_${random}`
  }

  // 雜湊敏感資料（用於索引或比較）
  hashSensitiveData(data: string): string {
    return crypto.createHash('sha256')
      .update(data + (process.env.HASH_SALT || 'default-salt'))
      .digest('hex')
  }

  // 生成HMAC簽名
  generateHmacSignature(data: string, secret?: string): string {
    const hmacSecret = secret || process.env.HMAC_SECRET || 'default-hmac-secret'
    return crypto.createHmac('sha256', hmacSecret)
      .update(data)
      .digest('hex')
  }

  // 驗證HMAC簽名
  verifyHmacSignature(data: string, signature: string, secret?: string): boolean {
    const expectedSignature = this.generateHmacSignature(data, secret)
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }

  // 生成一次性token
  generateOneTimeToken(): { token: string, hash: string, expiresAt: Date } {
    const token = crypto.randomBytes(32).toString('hex')
    const hash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15分鐘後過期

    return { token, hash, expiresAt }
  }

  // 驗證一次性token
  verifyOneTimeToken(token: string, storedHash: string, expiresAt: Date): boolean {
    if (new Date() > expiresAt) {
      return false
    }

    const hash = crypto.createHash('sha256').update(token).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash))
  }

  // 加密檔案
  encryptFile(buffer: Buffer): { encrypted: Buffer, key: string, iv: string } {
    const key = crypto.randomBytes(32)
    const iv = crypto.randomBytes(16)
    
    const cipher = crypto.createCipher('aes-256-cbc', key)
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()])
    
    return {
      encrypted,
      key: key.toString('hex'),
      iv: iv.toString('hex')
    }
  }

  // 解密檔案
  decryptFile(encryptedBuffer: Buffer, keyHex: string, ivHex: string): Buffer {
    const key = Buffer.from(keyHex, 'hex')
    const iv = Buffer.from(ivHex, 'hex')
    
    const decipher = crypto.createDecipher('aes-256-cbc', key)
    const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()])
    
    return decrypted
  }

  // 生成安全的會話ID
  generateSessionId(): string {
    const timestamp = Date.now().toString()
    const random = crypto.randomBytes(16).toString('hex')
    const userAgent = 'server' // 伺服器端生成
    
    const combined = `${timestamp}-${random}-${userAgent}`
    return crypto.createHash('sha256').update(combined).digest('hex')
  }

  // 密碼強度檢查
  checkPasswordStrength(password: string): {
    score: number
    feedback: string[]
    isStrong: boolean
  } {
    const feedback: string[] = []
    let score = 0

    // 長度檢查
    if (password.length >= 8) score += 1
    else feedback.push('密碼至少需要8個字元')

    if (password.length >= 12) score += 1

    // 包含小寫字母
    if (/[a-z]/.test(password)) score += 1
    else feedback.push('需要包含小寫字母')

    // 包含大寫字母
    if (/[A-Z]/.test(password)) score += 1
    else feedback.push('需要包含大寫字母')

    // 包含數字
    if (/\d/.test(password)) score += 1
    else feedback.push('需要包含數字')

    // 包含特殊字元
    if (/[@$!%*?&]/.test(password)) score += 1
    else feedback.push('需要包含特殊字元 (@$!%*?&)')

    // 檢查常見密碼模式
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /letmein/i
    ]

    if (commonPatterns.some(pattern => pattern.test(password))) {
      score -= 2
      feedback.push('避免使用常見的密碼模式')
    }

    // 檢查重複字元
    if (/(.)\1{2,}/.test(password)) {
      score -= 1
      feedback.push('避免連續重複的字元')
    }

    return {
      score: Math.max(0, score),
      feedback,
      isStrong: score >= 5 && feedback.length === 0
    }
  }

  // 資料遮罩（用於日誌）
  maskSensitiveData(data: string, maskChar: string = '*', visibleChars: number = 4): string {
    if (data.length <= visibleChars) {
      return maskChar.repeat(data.length)
    }

    const visibleStart = data.substring(0, Math.floor(visibleChars / 2))
    const visibleEnd = data.substring(data.length - Math.floor(visibleChars / 2))
    const maskedMiddle = maskChar.repeat(data.length - visibleChars)

    return visibleStart + maskedMiddle + visibleEnd
  }

  // 產生安全的隨機密碼
  generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numbers = '0123456789'
    const symbols = '@$!%*?&'
    
    const allChars = lowercase + uppercase + numbers + symbols
    
    let password = ''
    
    // 確保包含每種類型的字元至少一個
    password += lowercase[crypto.randomInt(0, lowercase.length)]
    password += uppercase[crypto.randomInt(0, uppercase.length)]
    password += numbers[crypto.randomInt(0, numbers.length)]
    password += symbols[crypto.randomInt(0, symbols.length)]
    
    // 填充剩餘長度
    for (let i = password.length; i < length; i++) {
      password += allChars[crypto.randomInt(0, allChars.length)]
    }
    
    // 隨機打亂密碼字元順序
    return password.split('').sort(() => crypto.randomInt(-1, 2)).join('')
  }
}

export const encryptionService = new EncryptionService()