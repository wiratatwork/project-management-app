/**
 * Single source of truth for the test database.
 *
 * Tests never run against the real database. They use a dedicated database
 * (`<POSTGRES_DB>_test`, e.g. `project_management_test`) inside the same
 * PostgreSQL container, derived from the root `.env` (the same values
 * docker-compose uses). Set `TEST_DATABASE_URL` to override the full URL.
 *
 * Usage:
 *   - backend/scripts/prepare-test-db.js  (creates + migrates + seeds it)
 *   - backend/tests/integration/api.test.js (points the app at it)
 */
const fs = require('fs');
const path = require('path');

/** Path of the repo root (two levels up from backend/scripts/). */
const ROOT = path.resolve(__dirname, '..', '..');

/** Minimal .env parser — enough for KEY=VALUE lines (no expansion). */
function parseEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

/** Root `.env` (what docker-compose reads) merged over process.env. */
function composeEnv() {
  return { ...parseEnvFile(path.join(ROOT, '.env')), ...process.env };
}

/** Name of the test database (defaults to `<POSTGRES_DB>_test`). */
function getTestDbName() {
  if (process.env.TEST_DB_NAME) return process.env.TEST_DB_NAME;
  const env = composeEnv();
  return `${env.POSTGRES_DB || 'project_management'}_test`;
}

/**
 * Full connection URL for the test database. Honors `TEST_DATABASE_URL`
 * when set; otherwise builds one from the compose Postgres settings with
 * the host port (`localhost`), since tests run on the host.
 */
function getTestDatabaseUrl() {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const env = composeEnv();
  const user = env.POSTGRES_USER || 'pm_user';
  const pass = env.POSTGRES_PASSWORD || 'pm_password';
  const port = env.POSTGRES_PORT || '5432';
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@localhost:${port}/${getTestDbName()}`;
}

module.exports = { getTestDatabaseUrl, getTestDbName, ROOT };
