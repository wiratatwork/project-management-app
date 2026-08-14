const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const swaggerSpec = require('./config/swagger');
const routes = require('./routes');
const httpLogger = require('./middleware/requestLogger');
const { apiLimiter } = require('./middleware/rateLimiter');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// --- Security & parsing -----------------------------------------------------
app.set('trust proxy', 1);
app.use(helmet());

const corsOptions = {
  origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((o) => o.trim()),
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '1mb' }));

// --- Logging ----------------------------------------------------------------
app.use(httpLogger);

// --- Health -----------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } });
});

// --- Rate limiting (API only, not swagger) -----------------------------------
app.use('/api', apiLimiter);

// --- Swagger / OpenAPI -------------------------------------------------------
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Project Management API Docs',
}));
app.get('/api-docs.json', (req, res) => {
  res.json(swaggerSpec);
});

// --- API routes --------------------------------------------------------------
app.use('/api', routes);

// --- 404 + error handling ----------------------------------------------------
app.use(notFound);
app.use(errorHandler);

// Report unhandled rejections/uncaught exceptions without crashing silently.
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

module.exports = app;
