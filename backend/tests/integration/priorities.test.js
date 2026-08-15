import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, auth, login, RUN, createPriority, createProject } from './helpers.js';

let token = null;
const createdProjectIds = [];
const createdPriorityIds = [];

beforeAll(async () => {
  token = await login();
});

afterAll(async () => {
  for (const id of createdProjectIds) {
    await request(app).delete(`/api/projects/${id}`).set(auth(token));
  }
  // Clean up every priority this file created (ignore already-deleted ones).
  for (const id of createdPriorityIds) {
    await request(app).delete(`/api/priorities/${id}`).set(auth(token));
  }
});

/** Pick a level (1..100) that no existing priority uses. */
async function unusedLevel() {
  const res = await request(app).get('/api/priorities').set(auth(token));
  const used = new Set(res.body.data.map((p) => p.level));
  for (let level = 5; level <= 100; level += 1) {
    if (!used.has(level)) return level;
  }
  throw new Error('No free priority level left (1..100)');
}

async function makePriority(overrides = {}) {
  const p = await createPriority(token, { level: await unusedLevel(), ...overrides });
  createdPriorityIds.push(p.id);
  return p;
}

describe('priority CRUD', () => {
  it('lists the seeded priorities ordered by level', async () => {
    const res = await request(app).get('/api/priorities').set(auth(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);
    expect(res.body.data[0].name).toBe('Critical');
    expect(res.body.data[0].level).toBe(1);
    const levels = res.body.data.map((p) => p.level);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
  });

  it('creates a priority with a name, level and color', async () => {
    const level = await unusedLevel();
    const p = await makePriority({ name: `Unique Priority ${RUN}`, level, color: '#aabbcc' });
    expect(p.id).toBeGreaterThan(0);
    expect(p.name).toBe(`Unique Priority ${RUN}`);
    expect(p.level).toBe(level);
    expect(p.color).toBe('#aabbcc');
    expect(p.taskCount).toBe(0);
  });

  it('rejects a duplicate name and duplicate level with 409', async () => {
    const p = await makePriority({ name: `Dupe Priority ${RUN}` });

    const dupName = await request(app)
      .post('/api/priorities')
      .set(auth(token))
      .send({ name: p.name, level: await unusedLevel() });
    expect(dupName.status).toBe(409);
    expect(dupName.body.error.code).toBe('CONFLICT');

    const dupLevel = await request(app)
      .post('/api/priorities')
      .set(auth(token))
      .send({ name: `Other Name ${RUN}`, level: p.level });
    expect(dupLevel.status).toBe(409);
  });

  it('rejects out-of-range or fractional levels', async () => {
    for (const level of [0, 101, 1.5, -3]) {
      const res = await request(app)
        .post('/api/priorities')
        .set(auth(token))
        .send({ name: `Bad Level ${RUN} ${level}`, level });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('updates a priority and returns 404 for missing ids', async () => {
    const p = await makePriority({ name: `Update Me ${RUN}` });
    const res = await request(app)
      .put(`/api/priorities/${p.id}`)
      .set(auth(token))
      .send({ description: 'Updated description', color: '#000000' });
    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('Updated description');
    expect(res.body.data.color).toBe('#000000');

    const missing = await request(app).put('/api/priorities/999999999').set(auth(token)).send({ name: 'X' });
    expect(missing.status).toBe(404);
  });

  it('deletes an unused priority', async () => {
    const p = await makePriority({ name: `Delete Me ${RUN}` });
    const res = await request(app).delete(`/api/priorities/${p.id}`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);

    const gone = await request(app).get('/api/priorities').set(auth(token));
    expect(gone.body.data.some((x) => x.id === p.id)).toBe(false);
  });

  it('refuses to delete a priority that is in use by tasks (409)', async () => {
    // Find a seeded priority that tasks actually use.
    const list = await request(app).get('/api/priorities').set(auth(token));
    const inUse = list.body.data.find((p) => p.taskCount > 0);
    expect(inUse).toBeTruthy();

    const res = await request(app).delete(`/api/priorities/${inUse.id}`).set(auth(token));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');

    // It must still be there.
    const again = await request(app).get('/api/priorities').set(auth(token));
    expect(again.body.data.some((p) => p.id === inUse.id)).toBe(true);
  });

  it('supports paginated listing', async () => {
    const res = await request(app).get('/api/priorities').query({ page: 1, limit: 2 }).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.rows).toBeInstanceOf(Array);
    expect(res.body.data.rows.length).toBeLessThanOrEqual(2);
    expect(res.body.data.total).toBeGreaterThan(0);
  });

  it('rejects a task referencing a deleted priority (400)', async () => {
    const p = await makePriority({ name: `FK Check ${RUN}` });
    const project = await createProject(token);
    createdProjectIds.push(project.id);
    await request(app).delete(`/api/priorities/${p.id}`).set(auth(token));

    const res = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(token))
      .send({
        taskCode: `${RUN}-FK`,
        name: 'FK task',
        priorityId: p.id,
        plannedStartDate: '2026-09-01T00:00:00Z',
        plannedEndDate: '2026-09-10T00:00:00Z',
        dueDate: '2026-09-10T00:00:00Z',
      });
    expect(res.status).toBe(400);
  });
});
