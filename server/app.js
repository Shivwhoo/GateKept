const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const config = require('./src/config/env');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const dropRoutes = require('./src/routes/dropRoutes');
const parcelRoutes = require('./src/routes/parcelRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Let client load fonts & Cloudinary images smoothly
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
const allowedOrigins = [
  config.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Dev flexible fallback
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body Parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// Sanitize against NoSQL Query Injections (Express 5 compatible)
app.use((req, res, next) => {
  ['body', 'params', 'headers'].forEach((key) => {
    if (req[key]) {
      mongoSanitize.sanitize(req[key]);
    }
  });
  if (req.query) {
    mongoSanitize.sanitize(req.query);
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'gatekept-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/drop', dropRoutes);
app.use('/api/parcels', parcelRoutes);
app.use('/api/admin', adminRoutes);

// Stubs for later stages to be mounted cleanly
// dropRoutes, parcelRoutes, adminRoutes will be mounted as each stage is built

// 404 & Error Handler
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
