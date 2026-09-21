const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateJWT = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User registration, login, and profile operations (Attendee & Organizer)
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new Attendee or Organizer
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Kunal Sharma
 *               email:
 *                 type: string
 *                 example: kunal@gmail.com
 *               password:
 *                 type: string
 *                 example: mysecurepassword123
 *               role:
 *                 type: string
 *                 enum: [attendee, organizer]
 *                 default: attendee
 *                 example: attendee
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate and obtain JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: kunal@gmail.com
 *               password:
 *                 type: string
 *                 example: mysecurepassword123
 *     responses:
 *       200:
 *         description: Login successful with JWT token
 *       401:
 *         description: Invalid email or password
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Retrieve currently authenticated user profile & role
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile details
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authenticateJWT, authController.getProfile);

module.exports = router;
