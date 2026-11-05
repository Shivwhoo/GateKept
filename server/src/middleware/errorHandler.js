/**
 * Uniform error handler enforcing { error: { code, message } }
 */
function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle Mongoose CastError (invalid ObjectId format)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: {
        code: 'INVALID_ID_FORMAT',
        message: `Invalid format for resource identifier (${err.path}).`,
      },
    });
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
      },
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR');
  const message = err.message || 'An unexpected error occurred';

  if (process.env.NODE_ENV !== 'test' && statusCode === 500) {
    console.error('Unhandled Server Error:', err);
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    },
  });
}

/**
 * 404 handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
