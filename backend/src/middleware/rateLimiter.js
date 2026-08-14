const rateLimit = require('express-rate-limit');

const rateLimitMessage = (message) => ({
  success: false,
  error: {
    code: 'RATE_LIMITED',
    message,
    details: [],
  },
});

/** General API limit: 300 requests / 15 minutes per IP. */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage('Too many requests, please try again later.'),
});

/** Stricter limit for the login endpoint: 10 attempts / 15 minutes per IP. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage('Too many login attempts, please try again later.'),
});

module.exports = { apiLimiter, authLimiter };
