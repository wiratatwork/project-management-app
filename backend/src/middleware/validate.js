const AppError = require('../utils/AppError');

/**
 * Validates `req[source]` (default `body`) against a zod schema. On failure
 * responds with a 400 VALIDATION_ERROR carrying per-field details. On success
 * replaces the request payload with the parsed (coerced) value.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(
        new AppError('Validation failed', {
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          details,
        })
      );
    }
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
