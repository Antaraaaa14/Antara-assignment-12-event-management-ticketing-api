const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authenticateJWT = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');
const { bookingRateLimiter } = require('../middleware/rateLimiter');

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Atomic ticket booking, rate limiting, and ticket lifecycle operations
 */

/**
 * @swagger
 * /api/tickets/book:
 *   post:
 *     summary: Atomic Ticket Booking (Rate Limited - 10 req/min, Attendee only)
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *               - quantity
 *             properties:
 *               eventId:
 *                 type: string
 *                 example: event_techconf_2026
 *               quantity:
 *                 type: integer
 *                 example: 2
 *               attendeeName:
 *                 type: string
 *                 example: Kunal Sharma
 *               attendeeEmail:
 *                 type: string
 *                 example: kunal@gmail.com
 *     responses:
 *       201:
 *         description: Tickets booked successfully
 *       400:
 *         description: Insufficient tickets or event not found
 *       429:
 *         description: Too Many Requests - Rate limit exceeded (10 req/min)
 */
router.post(
  '/book',
  authenticateJWT,
  checkRole('attendee'),
  bookingRateLimiter,
  ticketController.bookTicket
);

/**
 * @swagger
 * /api/tickets/my-tickets:
 *   get:
 *     summary: View purchased tickets for authenticated attendee
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of purchased tickets
 *       403:
 *         description: Forbidden - Attendee only
 */
router.get(
  '/my-tickets',
  authenticateJWT,
  checkRole('attendee'),
  ticketController.getMyTickets
);

/**
 * @swagger
 * /api/tickets/{id}/cancel:
 *   post:
 *     summary: Cancel ticket & restore ticket inventory in event
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket cancelled successfully and inventory restored
 *       400:
 *         description: Cannot cancel ticket
 */
router.post(
  '/:id/cancel',
  authenticateJWT,
  checkRole('attendee'),
  ticketController.cancelTicket
);

module.exports = router;
