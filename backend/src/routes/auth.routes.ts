import express from 'express'
import { register, login, refreshToken, logout, logoutAll, getProfile } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter.middleware'
import { validateRequest, validationSchemas } from '../middleware/validation.middleware'
import { rateLimiters } from '../middleware/security.middleware'
import SecurityUtils from '../utils/security'

const router = express.Router()

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: User ID
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *         nickname:
 *           type: string
 *           description: User nickname
 *         avatarUrl:
 *           type: string
 *           description: User avatar URL
 *         emailVerified:
 *           type: boolean
 *           description: Email verification status
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation date
 *     
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - confirmPassword
 *         - nickname
 *         - agreeToTerms
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *         password:
 *           type: string
 *           minLength: 8
 *           description: User password (min 8 chars, must include uppercase, lowercase, number, special char)
 *         confirmPassword:
 *           type: string
 *           description: Password confirmation
 *         nickname:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: User nickname
 *         agreeToTerms:
 *           type: boolean
 *           description: Agreement to terms and conditions
 *     
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User email address
 *         password:
 *           type: string
 *           description: User password
 *         rememberMe:
 *           type: boolean
 *           description: Remember login session
 *     
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/User'
 *             accessToken:
 *               type: string
 *               description: JWT access token
 *             refreshToken:
 *               type: string
 *               description: JWT refresh token
 *             expiresIn:
 *               type: integer
 *               description: Token expiration time in seconds
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email or nickname already exists
 */
router.post('/register', 
  registerLimiter, 
  validateRequest(validationSchemas.userRegistration),
  register
)

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *       400:
 *         description: Validation error
 */
router.post('/login', 
  loginLimiter, 
  validateRequest(validationSchemas.userLogin),
  login
)

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: JWT refresh token
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', refreshToken)

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout current session
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticate, logout)

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     summary: Logout all sessions
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All sessions logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/logout-all', authenticate, logoutAll)

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/profile', authenticate, getProfile)

/**
 * @swagger
 * /api/auth/password-reset:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 */
router.post('/password-reset', 
  rateLimiters.passwordReset,
  validateRequest(validationSchemas.passwordReset),
  (req, res) => {
    // 暫時回應成功，實際實作需要在controller中處理
    SecurityUtils.logSecurityEvent('password_reset_requested', {
      email: SecurityUtils.sanitizeUserInput(req.body.email),
      ip: SecurityUtils.getClientIP(req)
    }, 'medium')
    
    res.json(SecurityUtils.generateSecureApiResponse(
      { message: 'If the email exists, a reset link has been sent' }, 
      'Password reset processed'
    ))
  }
)

/**
 * @swagger
 * /api/auth/password-update:
 *   post:
 *     summary: Update password with reset token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *               - confirmPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password reset token
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: New password
 *               confirmPassword:
 *                 type: string
 *                 description: Password confirmation
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Invalid token or validation error
 */
router.post('/password-update',
  validateRequest(validationSchemas.passwordUpdate),
  (req, res) => {
    // 暫時回應成功，實際實作需要在controller中處理
    SecurityUtils.logSecurityEvent('password_updated', {
      ip: SecurityUtils.getClientIP(req),
      token: SecurityUtils.maskSensitiveData(req.body.token)
    }, 'high')
    
    res.json(SecurityUtils.generateSecureApiResponse(
      { message: 'Password updated successfully' }, 
      'Password update complete'
    ))
  }
)

export default router