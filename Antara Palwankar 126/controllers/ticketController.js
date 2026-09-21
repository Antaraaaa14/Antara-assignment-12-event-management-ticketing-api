const { db } = require('../config/firebaseConfig');

// @desc    Atomic Booking: Decrements tickets via transaction with concurrency safety
// @route   POST /api/tickets/book
// @access  Private (Attendee only)
exports.bookTicket = async (req, res, next) => {
  const { eventId, quantity = 1, attendeeName, attendeeEmail } = req.body;
  const userId = req.user.id;
  const qty = parseInt(quantity, 10);

  if (!eventId || !qty || qty <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid eventId and ticket quantity (minimum 1).',
    });
  }

  const name = attendeeName || req.user.name || 'Attendee';
  const email = attendeeEmail || req.user.email;

  const eventRef = db.collection('events').doc(eventId);
  const ticketRef = db.collection('tickets').doc();

  try {
    const result = await db.runTransaction(async (t) => {
      const eventDoc = await t.get(eventRef);

      if (!eventDoc.exists) {
        throw new Error('Event not found');
      }

      const eventData = eventDoc.data();

      if (eventData.status && eventData.status !== 'active') {
        throw new Error(`Event is not open for bookings (status: ${eventData.status})`);
      }

      if (eventData.availableTickets < qty) {
        throw new Error(`Insufficient tickets available. Only ${eventData.availableTickets} tickets remaining.`);
      }

      // 1. Decrement available tickets
      t.update(eventRef, {
        availableTickets: eventData.availableTickets - qty,
      });

      // 2. Create ticket document
      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const bookingRef = `TKT-${new Date().getFullYear()}-${randomSuffix}`;
      
      const newTicket = {
        id: ticketRef.id,
        eventId,
        eventTitle: eventData.title,
        venue: eventData.venue,
        eventDate: eventData.eventDate,
        userId,
        attendeeName: name,
        attendeeEmail: email,
        quantity: qty,
        unitPrice: eventData.ticketPrice,
        totalPaid: qty * eventData.ticketPrice,
        bookingRef,
        status: 'confirmed',
        bookedAt: new Date().toISOString(),
      };

      t.set(ticketRef, newTicket);
      return newTicket;
    });

    res.status(201).json({
      success: true,
      message: 'Tickets booked successfully.',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    View purchased tickets for logged-in attendee
// @route   GET /api/tickets/my-tickets
// @access  Private (Attendee only)
exports.getMyTickets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const ticketsSnapshot = await db.collection('tickets').where('userId', '==', userId).get();

    const tickets = [];
    ticketsSnapshot.docs.forEach((doc) => {
      tickets.push(doc.data());
    });

    // Sort newest first
    tickets.sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));

    res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel ticket & restore ticket inventory
// @route   POST /api/tickets/:id/cancel
// @access  Private (Attendee only)
exports.cancelTicket = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  const ticketRef = db.collection('tickets').doc(id);

  try {
    const result = await db.runTransaction(async (t) => {
      const ticketDoc = await t.get(ticketRef);

      if (!ticketDoc.exists) {
        throw new Error(`Ticket with ID '${id}' not found.`);
      }

      const ticketData = ticketDoc.data();

      // Check ownership
      if (ticketData.userId !== userId && req.user.role !== 'organizer') {
        throw new Error('Unauthorized: You can only cancel your own tickets.');
      }

      if (ticketData.status === 'cancelled') {
        throw new Error('Ticket is already cancelled.');
      }

      // 1. Mark ticket as cancelled
      t.update(ticketRef, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      });

      // 2. Restore available tickets in the event
      const eventRef = db.collection('events').doc(ticketData.eventId);
      const eventDoc = await t.get(eventRef);

      if (eventDoc.exists) {
        const eventData = eventDoc.data();
        const updatedCapacity = Math.min(
          eventData.totalCapacity || 99999,
          eventData.availableTickets + ticketData.quantity
        );

        t.update(eventRef, {
          availableTickets: updatedCapacity,
        });
      }

      return {
        ...ticketData,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      };
    });

    res.status(200).json({
      success: true,
      message: 'Ticket cancelled successfully and ticket capacity restored.',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
