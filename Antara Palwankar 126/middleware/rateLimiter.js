const rateLimit = require('express-rate-limit');

// Strict rate limiter for ticket booking to prevent bots and ticket scalping
const bookingRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // Limit each IP to 10 booking requests per windowMs
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many booking attempts from this IP. Rate limit exceeded (Max 10 requests per minute). Please try again later.',
  },
});

// General API rate limiter
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 min
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  bookingRateLimiter,
  generalRateLimiter,
};
