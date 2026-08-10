const { ZodError } = require('zod');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'One or more fields are invalid',
        details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      },
    });
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  if (!err.isOperational) {
    // eslint-disable-next-line no-console
    console.error('[unhandled error]', err);
  }

  res.status(statusCode).json({
    error: {
      code,
      message: err.isOperational ? err.message : 'Something went wrong. Please try again.',
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
}

module.exports = { errorHandler, notFoundHandler };
