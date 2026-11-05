const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';

// Auth endpoints rate limiter (signups, logins, OTPs)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 1000 : 30, // 30 requests per 15 mins in production
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please try again after 15 minutes.',
      },
    });
  },
});

// Public drop form rate limiter
const dropLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: isTest ? 1000 : 60, // 60 drops per 10 mins per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many parcel submissions from this network. Please wait a few moments.',
      },
    });
  },
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isTest ? 5000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please slow down.',
      },
    });
  },
});

module.exports = {
  authLimiter,
  dropLimiter,
  apiLimiter,
};
