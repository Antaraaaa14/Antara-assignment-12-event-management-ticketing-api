const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const authenticateJWT = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management endpoints for browsing and organizer listings
 */

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Browse all upcoming events with optional filters
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category (e.g. Technology, Music)
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city (e.g. Mumbai)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search keyword in title, description, or venue
 *     responses:
 *       200:
 *         description: List of upcoming events
 */
router.get('/', eventController.getAllEvents);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: View event details & live remaining ticket count
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event details
 *       404:
 *         description: Event not found
 */
router.get('/:id', eventController.getEventById);

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create new event listing (Organizer role only)
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - category
 *               - eventDate
 *               - venue
 *               - ticketPrice
 *               - totalCapacity
 *             properties:
 *               title:
 *                 type: string
 *                 example: Global Cloud & AI Summit 2026
 *               description:
 *                 type: string
 *                 example: Annual flagship backend conference
 *               category:
 *                 type: string
 *                 example: Technology
 *               eventDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-06-15T09:00:00Z
 *               venue:
 *                 type: string
 *                 example: Bandra Kurla Complex, Mumbai
 *               city:
 *                 type: string
 *                 example: Mumbai
 *               ticketPrice:
 *                 type: number
 *                 example: 1499
 *               totalCapacity:
 *                 type: integer
 *                 example: 500
 *     responses:
 *       201:
 *         description: Event created successfully
 *       400:
 *         description: Bad request / missing fields
 *       403:
 *         description: Forbidden - Only organizers can create events
 */
router.post('/', authenticateJWT, checkRole('organizer'), eventController.createEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: Update event details (Organizer must own event)
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               ticketPrice:
 *                 type: number
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       403:
 *         description: Forbidden - Not the event owner
 *       404:
 *         description: Event not found
 */
router.put('/:id', authenticateJWT, checkRole('organizer'), eventController.updateEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Cancel and delete event (Organizer must own event)
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Event not found
 */
router.delete('/:id', authenticateJWT, checkRole('organizer'), eventController.deleteEvent);

/**
 * @swagger
 * /api/events/{id}/attendees:
 *   get:
 *     summary: List all registered attendees for the event (Organizer only)
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of registered attendees
 *       403:
 *         description: Forbidden
 */
router.get('/:id/attendees', authenticateJWT, checkRole('organizer'), eventController.getEventAttendees);

module.exports = router;
