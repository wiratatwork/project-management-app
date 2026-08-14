const AppError = require('./AppError');

/** Parse a route `:id` parameter into a positive integer or throw 400. */
function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(`Invalid id: "${raw}"`, {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: [{ field: 'id', message: 'id must be a positive integer' }],
    });
  }
  return id;
}

module.exports = { parseId };
