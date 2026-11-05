const { ZodError } = require('zod');

/**
 * Higher-order middleware to validate req.body, req.query, or req.params against a Zod schema
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} [source='body']
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed; // assign sanitized & coerced data back
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const firstIssue = err.issues[0];
        const field = firstIssue ? firstIssue.path.join('.') : 'field';
        const msg = firstIssue ? `${field}: ${firstIssue.message}` : 'Validation failed';
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: msg,
            details: err.issues.map((i) => ({
              field: i.path.join('.'),
              message: i.message,
            })),
          },
        });
      }
      next(err);
    }
  };
}

module.exports = { validate };
