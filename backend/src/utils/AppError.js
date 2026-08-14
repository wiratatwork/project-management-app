/**
 * Operational error with a stable machine-readable code and optional field
 * details. All errors flowing out of controllers/services should be (or wrap)
 * an AppError so the centralized error handler can format them consistently.
 */
class AppError extends Error {
  constructor(
    message,
    { code = 'INTERNAL_ERROR', statusCode = 500, details = [] } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

module.exports = AppError;
