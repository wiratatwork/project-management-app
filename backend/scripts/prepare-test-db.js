/**
 * Prepare the dedicated test database before running tests.
 *
 *   1. Creates the database (`project_management_test` by default) inside the
 *      running postgres container if it does not exist yet.
 *   2. Applies all committed Prisma migrations.
 *   3. Seeds the demo data (idempotent) — integration tests need the `admin`
 *      user and the seeded priorities.
 *
 * The real database used by `docker compose up -d --build` is never touched.
 *
 * Requires the postgres container to be up: `docker compose up -d postgres`.
 */
const { execFileSync } = require('child_process');
const { getTestDatabaseUrl, getTestDbName, ROOT } = require('./testDb');

const BACKEND = `${ROOT}/backend`;

function run(cmd, args, opts = {}) {
  execFileSync(cmd, args, { stdio: 'inherit', ...opts });
}

function runQuiet(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...opts }).trim();
}

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

const dbName = getTestDbName();
const databaseUrl = getTestDatabaseUrl();

console.log(`\nPreparing test database "${dbName}" …`);

// --- 1. Postgres container must be running --------------------------------
const containerId = runQuiet('docker', ['compose', 'ps', '-q', 'postgres'], { cwd: ROOT });
if (!containerId) {
  fail('Postgres container is not running.\n  Start it first with:  docker compose up -d postgres');
}

// --- 2. Create the database if missing -------------------------------------
// psql runs inside the container as the compose superuser (POSTGRES_USER).
// The maintenance database `postgres` always exists. `-tAc` prints "1" if the
// DB exists.
const dbUser = runQuiet('docker', ['compose', 'exec', '-T', 'postgres', 'sh', '-c', 'echo "$POSTGRES_USER"'], { cwd: ROOT });
const exists = runQuiet(
  'docker',
  ['compose', 'exec', '-T', 'postgres', 'psql', '-U', dbUser, '-d', 'postgres', '-tAc',
    `SELECT 1 FROM pg_database WHERE datname = '${dbName}'`],
  { cwd: ROOT }
);
if (exists !== '1') {
  console.log(`  Creating database "${dbName}" …`);
  run(
    'docker',
    ['compose', 'exec', '-T', 'postgres', 'psql', '-U', dbUser, '-d', 'postgres', '-c',
      `CREATE DATABASE "${dbName}"`],
    { cwd: ROOT }
  );
} else {
  console.log(`  Database "${dbName}" already exists.`);
}

// --- 3. Migrate + seed the test database -----------------------------------
// Invoke the local Prisma CLI via node (works on every OS, no npx/.cmd issues).
const PRISMA_CLI = `${BACKEND}/node_modules/prisma/build/index.js`;
console.log('  Applying migrations …');
run(process.execPath, [PRISMA_CLI, 'migrate', 'deploy'], { cwd: BACKEND, env: { ...process.env, DATABASE_URL: databaseUrl } });

console.log('  Seeding demo data …');
run(process.execPath, ['prisma/seed.js'], { cwd: BACKEND, env: { ...process.env, DATABASE_URL: databaseUrl } });

console.log(`\n✓ Test database "${dbName}" is ready.`);
