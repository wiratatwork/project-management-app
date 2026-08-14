const { Prisma } = require('@prisma/client');

const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

/** Map common Prisma errors to user-friendly AppErrors. */
function mapPrismaError(err) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return new AppError('A record with the same unique value already exists', {
          code: 'CONFLICT',
          statusCode: 409,
          details: [{ field: 'unique', message: 'Duplicate value' }],
        });
      case 'P2025':
        return new AppError('Record not found', {
          code: 'NOT_FOUND',
          statusCode: 404,
        });
      case 'P2003':
        return new AppError('Referenced record does not exist', {
          code: 'FOREIGN_KEY_VIOLATION',
          statusCode: 400,
        });
      case 'P2014':
        return new AppError('The change would violate a database constraint', {
          code: 'CONSTRAINT_VIOLATION',
          statusCode: 400,
        });
      default:
        return new AppError(`Database error (${err.code})`, {
          code: 'DATABASE_ERROR',
          statusCode: 500,
        });
    }
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return new AppError('Invalid data supplied to the database', {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    });
  }
  return err;
}

function mapBodyParseError(err) {
  if (err.type === 'entity.parse.failed') {
    return new AppError('Request body is not valid JSON', {
      code: 'INVALID_JSON',
      statusCode: 400,
    });
  }
  if (err.type === 'entity.too.large') {
    return new AppError('Request body too large', {
      code: 'PAYLOAD_TOO_LARGE',
      statusCode: 413,
    });
  }
  return err;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let e = mapBodyParseError(err);
  e = mapPrismaError(e);

  const statusCode = e.statusCode || 500;
  const body = {
    success: false,
    error: {
      code: e.code || 'INTERNAL_ERROR',
      message: e.message || 'Internal server error',
      details: e.details || [],
    },
  };

  if (statusCode >= 500) {
    logger.error({ err: { message: e.message, stack: e.stack } }, 'Unhandled error');
  } else {
    logger.warn({ err: { message: e.message, code: e.code } }, 'Request error');
  }

  // Never leak stack traces to clients (the stack is only logged above).
  if (res.headersSent) return next(err);
  return res.status(statusCode).json(body);
}

module.exports = errorHandler;
