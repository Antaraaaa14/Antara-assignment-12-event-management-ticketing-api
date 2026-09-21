const { db } = require('../config/firebaseConfig');

// @desc    Browse all upcoming events with optional filters (?category=Technology&city=Mumbai&search=AI)
// @route   GET /api/events
// @access  Public
exports.getAllEvents = async (req, res, next) => {
  try {
    const { category, city, search } = req.query;

    const eventsRef = db.collection('events');
    const snapshot = await eventsRef.get();

    let events = [];
    snapshot.docs.forEach((doc) => {
      events.push(doc.data());
    });

    // Filtering in application layer
    if (category) {
      events = events.filter(
        (e) => e.category && e.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (city) {
      events = events.filter(
        (e) =>
          (e.city && e.city.toLowerCase() === city.toLowerCase()) ||
          (e.venue && e.venue.toLowerCase().includes(city.toLowerCase()))
      );
    }

    if (search) {
      const q = search.toLowerCase();
      events = events.filter(
        (e) =>
          (e.title && e.title.toLowerCase().includes(q)) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.venue && e.venue.toLowerCase().includes(q))
      );
    }

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    View event details & live remaining ticket count
// @route   GET /api/events/:id
// @access  Public
exports.getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const eventRef = db.collection('events').doc(id);
    const doc = await eventRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: `Event with ID '${id}' not found.`,
      });
    }

    const event = doc.data();

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new event listing
// @route   POST /api/events
// @access  Private (Organizer only)
exports.createEvent = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      eventDate,
      venue,
      city,
      ticketPrice,
      totalCapacity,
    } = req.body;

    if (!title || !category || !eventDate || !venue || ticketPrice === undefined || !totalCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required event fields: title, category, eventDate, venue, ticketPrice, totalCapacity.',
      });
    }

    const capacity = parseInt(totalCapacity, 10);
    const price = parseFloat(ticketPrice);

    if (capacity <= 0 || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'totalCapacity must be > 0 and ticketPrice must be >= 0.',
      });
    }

    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const eventRef = db.collection('events').doc(eventId);

    const newEvent = {
      id: eventId,
      title,
      description: description || '',
      category,
      eventDate: new Date(eventDate).toISOString(),
      venue,
      city: city || (venue.includes(',') ? venue.split(',').pop().trim() : 'Mumbai'),
      organizerId: req.user.id,
      organizerName: req.user.name || 'Event Organizer',
      ticketPrice: price,
      totalCapacity: capacity,
      availableTickets: capacity,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await eventRef.set(newEvent);

    res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      data: newEvent,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update event details (Organizer must own event)
// @route   PUT /api/events/:id
// @access  Private (Organizer only)
exports.updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const eventRef = db.collection('events').doc(id);
    const doc = await eventRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: `Event with ID '${id}' not found.`,
      });
    }

    const existingEvent = doc.data();

    // Check ownership
    if (existingEvent.organizerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only update events that you created.',
      });
    }

    const {
      title,
      description,
      category,
      eventDate,
      venue,
      city,
      ticketPrice,
      status,
    } = req.body;

    const updates = {};
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category) updates.category = category;
    if (eventDate) updates.eventDate = new Date(eventDate).toISOString();
    if (venue) updates.venue = venue;
    if (city) updates.city = city;
    if (ticketPrice !== undefined) updates.ticketPrice = parseFloat(ticketPrice);
    if (status) updates.status = status;
    updates.updatedAt = new Date().toISOString();

    await eventRef.update(updates);

    const updatedDoc = await eventRef.get();

    res.status(200).json({
      success: true,
      message: 'Event updated successfully.',
      data: updatedDoc.data(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel and delete event (Organizer must own event)
// @route   DELETE /api/events/:id
// @access  Private (Organizer only)
exports.deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const eventRef = db.collection('events').doc(id);
    const doc = await eventRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: `Event with ID '${id}' not found.`,
      });
    }

    const event = doc.data();

    // Check ownership
    if (event.organizerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only delete events that you created.',
      });
    }

    await eventRef.delete();

    res.status(200).json({
      success: true,
      message: `Event '${event.title}' (ID: ${id}) deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List all registered attendees for the event (Organizer only)
// @route   GET /api/events/:id/attendees
// @access  Private (Organizer only)
exports.getEventAttendees = async (req, res, next) => {
  try {
    const { id } = req.params;
    const eventRef = db.collection('events').doc(id);
    const doc = await eventRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: `Event with ID '${id}' not found.`,
      });
    }

    const event = doc.data();

    // Check organizer ownership
    if (event.organizerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only view attendees for your own events.',
      });
    }

    // Query tickets for this event
    const ticketsSnapshot = await db.collection('tickets').where('eventId', '==', id).get();

    const attendees = [];
    ticketsSnapshot.docs.forEach((doc) => {
      const ticket = doc.data();
      if (ticket.status === 'confirmed') {
        attendees.push({
          ticketId: ticket.id,
          bookingRef: ticket.bookingRef,
          attendeeName: ticket.attendeeName,
          attendeeEmail: ticket.attendeeEmail,
          quantity: ticket.quantity,
          totalPaid: ticket.totalPaid,
          bookedAt: ticket.bookedAt,
        });
      }
    });

    res.status(200).json({
      success: true,
      eventId: id,
      eventTitle: event.title,
      totalAttendees: attendees.length,
      data: attendees,
    });
  } catch (error) {
    next(error);
  }
};
