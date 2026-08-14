const jwt = require('jsonwebtoken');

const env = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Requires a valid `Authorization: Bearer <jwt>` header. Attaches the decoded
 * identity to `req.user`.
 */
const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Authentication required', {
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch (err) {
    throw new AppError('Invalid or expired token', {
      code: 'INVALID_TOKEN',
      statusCode: 401,
    });
  }
});

module.exports = { requireAuth };
