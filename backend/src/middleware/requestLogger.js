const { pinoHttp } = require('pino-http');

const logger = require('../utils/logger');

const httpLogger = pinoHttp({
  logger,
  // Never log credentials/tokens
  redact: {
    paths: ['req.headers.authorization', 'req.body.password', 'password'],
    censor: '[REDACTED]',
  },
  autoLogging: {
    ignore: (req) => req.url === '/api/health',
  },
});

module.exports = httpLogger;
