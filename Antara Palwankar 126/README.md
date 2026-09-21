# 🎟️ Assignment 12: Event Management & Ticketing API with Firebase & Swagger

**Track:** Backend Development | **Level:** Advanced  
**Author:** Antara Palwankar (Roll No: 126)  
**Tech Stack:** Node.js, Express.js, Firebase Firestore & Auth, express-rate-limit, swagger-ui-express, swagger-jsdoc, dotenv, cors, bcryptjs, jsonwebtoken

---

## 📌 1. Objective & Overview
A high-concurrency Event Ticketing & Live Booking REST API backed by Google Firebase Firestore, secured with JWT Role-Based Access Control (Organizer vs Attendee), protected against bot ticket-scalping using strict API rate limiting, and documented using OpenAPI 3.0 interactive Swagger UI.

### Key Highlights:
- **Firestore ACID Transactions (`runTransaction`)**: Guarantees zero double-selling/overselling under heavy concurrent booking traffic.
- **Scalper Protection Rate Limiter**: 10 requests per minute limit on ticket bookings (`/api/tickets/book`) with HTTP 429 responses.
- **Role-Based Access Control (RBAC)**: Distinct permissions for Organizers (create/edit/delete events, view attendees) vs Attendees (browse, atomic book, view & cancel tickets).
- **Interactive OpenAPI 3.0 Documentation**: Live Swagger UI accessible at `/api-docs` with JWT Bearer authorization testing.

---

## 🏗️ 2. Project Architecture

```
assignment-12-event-ticketing-api/
├── config/
│   ├── firebaseConfig.js    # Firebase Admin Firestore init & offline fallback
│   └── swagger.js           # Swagger OpenAPI 3.0 configuration & UI setup
├── controllers/
│   ├── authController.js    # Register, login, profile with JWT and role
│   ├── eventController.js   # Event CRUD, category/city filters, live ticket count
│   └── ticketController.js  # Transactional booking & inventory restoration
├── middleware/
│   ├── auth.js              # JWT verification middleware
│   ├── checkRole.js         # Organizer vs Attendee guard
│   ├── errorHandler.js      # Centralized error handler
│   └── rateLimiter.js       # Strict booking rate limit (10 req / min)
├── routes/
│   ├── authRoutes.js        # Auth routes with Swagger tags
│   ├── eventRoutes.js       # Event routes with Swagger tags
│   └── ticketRoutes.js      # Booking routes with Swagger tags
├── serviceAccountKey.json.example
├── .env.example
├── .env
├── .gitignore
├── package.json
├── server.js                # Server entry point
└── README.md
```

---

## 🗄️ 3. Firebase Firestore Schema

### 1. `events` Collection
```json
{
  "id": "event_techconf_2026",
  "title": "Global Cloud & AI Summit 2026",
  "description": "Annual flagship backend conference",
  "category": "Technology",
  "eventDate": "2026-06-15T09:00:00Z",
  "venue": "Bandra Kurla Complex, Mumbai",
  "city": "Mumbai",
  "organizerId": "usr_organizer_01",
  "organizerName": "Tech Events Global",
  "ticketPrice": 1499,
  "totalCapacity": 500,
  "availableTickets": 482,
  "createdAt": "2026-03-01T12:00:00Z",
  "status": "active"
}
```

### 2. `tickets` Collection
```json
{
  "id": "ticket_rec_88219",
  "eventId": "event_techconf_2026",
  "eventTitle": "Global Cloud & AI Summit 2026",
  "userId": "usr_attendee_99",
  "attendeeName": "Kunal Sharma",
  "attendeeEmail": "kunal@gmail.com",
  "quantity": 2,
  "totalPaid": 2998,
  "bookingRef": "TKT-2026-88219",
  "status": "confirmed",
  "bookedAt": "2026-03-02T16:20:00Z"
}
```

---

## 🚀 4. Installation & Setup

1. **Navigate to the directory**:
   ```bash
   cd "Assignment 12/Antara Palwankar 126"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Firebase Setup**:
   - Place your Google Cloud service account JSON in this folder as `serviceAccountKey.json`.
   - Alternatively, configure environment variables in `.env`.
   - *(Note: If no service account is provided, the API automatically runs with an in-memory Firestore transaction simulator for instant testing.)*

4. **Start the server**:
   ```bash
   # Development mode with Nodemon
   npm run dev

   # Production mode
   npm start
   ```

5. **Open Swagger Documentation**:
   Visit [http://localhost:5000/api-docs](http://localhost:5000/api-docs) in your browser.

---

## 📋 5. API Endpoints Specification

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Role Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register as Attendee or Organizer |
| `POST` | `/api/auth/login` | Public | Authenticate and obtain JWT token |
| `GET` | `/api/auth/profile` | Authenticated | Retrieve user profile & role |

### 🎪 Event Management (`/api/events`)
| Method | Endpoint | Role Access | Description |
|---|---|---|---|
| `GET` | `/api/events` | Public | Browse upcoming events (`?category=Technology&city=Mumbai&search=AI`) |
| `GET` | `/api/events/:id` | Public | View event details & live remaining ticket count |
| `POST` | `/api/events` | Organizer | Create new event listing |
| `PUT` | `/api/events/:id` | Organizer | Update event details (Organizer must own event) |
| `DELETE`| `/api/events/:id` | Organizer | Cancel and delete event |
| `GET` | `/api/events/:id/attendees`| Organizer | List all registered attendees for the event |

### 🎟️ Ticket Booking & Scalper Protection (`/api/tickets`)
| Method | Endpoint | Role Access | Description |
|---|---|---|---|
| `POST` | `/api/tickets/book` | Attendee | **Atomic Booking**: 10 req/min limit. Decrements tickets via transaction |
| `GET` | `/api/tickets/my-tickets` | Attendee | View purchased tickets |
| `POST` | `/api/tickets/:id/cancel`| Attendee | Cancel ticket & restore ticket inventory in event |

### 📚 Interactive Swagger Documentation
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api-docs` | Full interactive Swagger UI documentation for all endpoints |

---

## ⚡ 6. Concurrency Transaction Example

```javascript
// controllers/ticketController.js
const result = await db.runTransaction(async (t) => {
  const eventDoc = await t.get(eventRef);
  if (!eventDoc.exists) throw new Error('Event not found');

  const eventData = eventDoc.data();
  if (eventData.availableTickets < qty) {
    throw new Error('Insufficient tickets available');
  }

  // 1. Decrement available tickets
  t.update(eventRef, {
    availableTickets: eventData.availableTickets - qty
  });

  // 2. Create ticket document
  const bookingRef = `TKT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const newTicket = {
    id: ticketRef.id,
    eventId,
    eventTitle: eventData.title,
    userId,
    attendeeName,
    attendeeEmail,
    quantity: qty,
    totalPaid: qty * eventData.ticketPrice,
    bookingRef,
    status: 'confirmed',
    bookedAt: new Date().toISOString()
  };

  t.set(ticketRef, newTicket);
  return newTicket;
});
```

---

## 🧪 7. Testing & Verification Guide

1. **View Swagger Documentation**:
   Open `http://localhost:5000/api-docs` to test all endpoints interactively.
2. **Register an Organizer**:
   ```json
   POST /api/auth/register
   {
     "name": "Tech Events Global",
     "email": "organizer@events.com",
     "password": "organizerpass",
     "role": "organizer"
   }
   ```
3. **Create an Event with Capacity = 5**:
   ```json
   POST /api/events
   Authorization: Bearer <ORGANIZER_TOKEN>
   {
     "title": "Exclusive Backend Masterclass",
     "category": "Technology",
     "eventDate": "2026-08-01T10:00:00Z",
     "venue": "BKC, Mumbai",
     "ticketPrice": 2000,
     "totalCapacity": 5
   }
   ```
4. **Register and Log in as Attendee**:
   ```json
   POST /api/auth/register
   {
     "name": "Kunal Sharma",
     "email": "kunal@gmail.com",
     "password": "attendeepass",
     "role": "attendee"
   }
   ```
5. **Atomic Booking Verification**:
   Make a booking for 3 tickets -> `availableTickets` drops to 2.
   Attempt to book 3 more tickets -> Fails with `400 Bad Request: Insufficient tickets available. Only 2 tickets remaining.`
6. **Rate Limiting Test**:
   Make > 10 requests within 60 seconds on `/api/tickets/book` -> Server returns `429 Too Many Requests`.
