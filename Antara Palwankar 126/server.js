const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const setupSwagger = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Core Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Setup Interactive Swagger Documentation UI (/api-docs)
setupSwagger(app);

// Root & Overview Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🎟️ Event Management & Ticketing API (Firebase & Swagger)',
    version: '1.0.0',
    documentation: `http://localhost:${PORT}/api-docs`,
    endpoints: {
      swaggerUI: '/api-docs',
      swaggerJSON: '/api-docs.json',
      auth: '/api/auth',
      events: '/api/events',
      tickets: '/api/tickets',
    },
    author: 'Antara Palwankar (Roll No: 126)',
  });
});

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route ${req.originalUrl} not found. Visit /api-docs for documentation.`,
  });
});

// Centralized Error Handling
app.use(errorHandler);

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Event Ticketing API Server running on port ${PORT}`);
    console.log(`📚 Swagger OpenAPI UI: http://localhost:${PORT}/api-docs`);
    console.log(`🌐 Base API: http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}

module.exports = app;
