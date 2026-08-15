import request from 'supertest';

// ---------------------------------------------------------------------------
// Environment: tests ALWAYS run against the dedicated test database. This
// must happen before the app (and its Prisma client) is imported.
// ---------------------------------------------------------------------------
import { getTestDatabaseUrl } from '../../scripts/testDb.js';

process.env.DATABASE_URL = getTestDatabaseUrl();
process.env.NODE_ENV = 'test';

export const app = (await import('../../src/app.js')).default;

// ---------------------------------------------------------------------------
// Run prefix — every entity created by a test carries it so afterAll cleanup
// (and cross-run isolation) is deterministic.
// ---------------------------------------------------------------------------
export const RUN = `T-${Date.now()}`;

/** Authorization header for a given token (or null before login). */
export const auth = (token) => ({ Authorization: `Bearer ${token}` });

/** Login as the seeded demo user and return the token. */
export async function login(token = null) {
  if (token) return token;
  const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
  if (res.status !== 200) throw new Error(`Login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data.token;
}

/**
 * UTC-midnight date `n` days from today, snapped to a business day (Mon–Fri)
 * so the weekend-date rule never trips.
 */
export function iso(n) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

/** The next Saturday (or today if today is a weekend) — always rejected. */
export function weekendISO() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Entity factories (all names/codes carry the RUN prefix for cleanup)
// ---------------------------------------------------------------------------

export async function createProject(token, overrides = {}) {
  const res = await request(app)
    .post('/api/projects')
    .set(auth(token))
    .send({
      projectCode: `${RUN}-P${Math.floor(Math.random() * 100000)}`,
      name: 'Integration Test Project',
      plannedStartDate: iso(-10),
      plannedEndDate: iso(30),
      ...overrides,
    });
  if (res.status >= 400) throw new Error(`createProject failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data;
}

export async function createTask(token, projectId, overrides = {}) {
  const res = await request(app)
    .post(`/api/projects/${projectId}/tasks`)
    .set(auth(token))
    .send({
      taskCode: `${RUN}-T${Math.floor(Math.random() * 100000)}`,
      name: 'Integration Test Task',
      priorityId: 2,
      plannedStartDate: iso(0),
      plannedEndDate: iso(10),
      dueDate: iso(10),
      ...overrides,
    });
  if (res.status >= 400) throw new Error(`createTask failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data;
}

export async function createRisk(token, projectId, overrides = {}) {
  const res = await request(app)
    .post(`/api/projects/${projectId}/risks`)
    .set(auth(token))
    .send({ title: 'Integration Test Risk', probability: 2, impact: 3, ...overrides });
  if (res.status >= 400) throw new Error(`createRisk failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data;
}

export async function createStakeholder(token, overrides = {}) {
  const res = await request(app)
    .post('/api/stakeholders')
    .set(auth(token))
    .send({
      name: `Test Stakeholder ${Math.floor(Math.random() * 100000)}`,
      email: `test-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`,
      position: 'QA',
      ...overrides,
    });
  if (res.status >= 400) throw new Error(`createStakeholder failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data;
}

export async function createPriority(token, overrides = {}) {
  const res = await request(app)
    .post('/api/priorities')
    .set(auth(token))
    .send({
      name: `Test Priority ${Math.floor(Math.random() * 100000)}`,
      level: 10 + Math.floor(Math.random() * 80),
      color: '#123456',
      ...overrides,
    });
  if (res.status >= 400) throw new Error(`createPriority failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data;
}
