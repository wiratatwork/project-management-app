import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, auth, login, RUN, iso, createProject, createTask, createRisk, createStakeholder } from './helpers.js';

let token = null;
const createdProjectIds = [];

beforeAll(async () => {
  token = await login();
});

afterAll(async () => {
  for (const id of createdProjectIds) {
    await request(app).delete(`/api/projects/${id}`).set(auth(token));
  }
});

describe('stakeholder CRUD', () => {
  it('creates a stakeholder and returns its shape', async () => {
    const s = await createStakeholder(token, { name: 'CRUD Alice', email: `crud-${RUN}@example.com` });
    expect(s.id).toBeGreaterThan(0);
    expect(s.name).toBe('CRUD Alice');
    expect(s.email).toBe(`crud-${RUN}@example.com`);
    expect(s.projectCount).toBe(0);
    expect(s.taskCount).toBe(0);
    expect(s.riskCount).toBe(0);
  });

  it('rejects a duplicate email with 409', async () => {
    const s = await createStakeholder(token);
    const res = await request(app)
      .post('/api/stakeholders')
      .set(auth(token))
      .send({ name: 'Duplicate', email: s.email });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rejects an invalid email with 400', async () => {
    const res = await request(app)
      .post('/api/stakeholders')
      .set(auth(token))
      .send({ name: 'Bad Email', email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'email')).toBe(true);
  });

  it('requires a name', async () => {
    const res = await request(app)
      .post('/api/stakeholders')
      .set(auth(token))
      .send({ email: 'noname@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d) => d.field === 'name')).toBe(true);
  });

  it('gets a stakeholder by id and returns 404 for missing ids', async () => {
    const s = await createStakeholder(token);
    const res = await request(app).get(`/api/stakeholders/${s.id}`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(s.id);

    const missing = await request(app).get('/api/stakeholders/999999999').set(auth(token));
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });

  it('updates a stakeholder and returns 404 for missing ids', async () => {
    const s = await createStakeholder(token);
    const res = await request(app)
      .put(`/api/stakeholders/${s.id}`)
      .set(auth(token))
      .send({ position: 'Lead QA', department: 'Engineering' });
    expect(res.status).toBe(200);
    expect(res.body.data.position).toBe('Lead QA');
    expect(res.body.data.department).toBe('Engineering');

    const missing = await request(app).put('/api/stakeholders/999999999').set(auth(token)).send({ position: 'X' });
    expect(missing.status).toBe(404);
  });

  it('deletes a stakeholder and it is gone afterwards', async () => {
    const s = await createStakeholder(token);
    const res = await request(app).delete(`/api/stakeholders/${s.id}`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);

    const gone = await request(app).get(`/api/stakeholders/${s.id}`).set(auth(token));
    expect(gone.status).toBe(404);
  });
});

describe('stakeholder list', () => {
  it('returns the seeded stakeholders plus pagination/search', async () => {
    const plain = await request(app).get('/api/stakeholders').set(auth(token));
    expect(plain.status).toBe(200);
    expect(Array.isArray(plain.body.data)).toBe(true);
    expect(plain.body.data.some((s) => s.email === 'alice.johnson@example.com')).toBe(true);

    const page = await request(app)
      .get('/api/stakeholders')
      .query({ page: 1, limit: 2, search: 'alice', sortBy: 'name', sortDir: 'asc' })
      .set(auth(token));
    expect(page.status).toBe(200);
    expect(page.body.data.total).toBeGreaterThan(0);
    expect(page.body.data.rows.length).toBeLessThanOrEqual(2);
    expect(page.body.data.rows.every((r) => r.name.toLowerCase().includes('alice'))).toBe(true);
  });
});

describe('stakeholder cascade on delete', () => {
  it('removes project/task links and unassigns risk ownership', async () => {
    const s = await createStakeholder(token);
    const project = await createProject(token, { stakeholderIds: [s.id] });
    createdProjectIds.push(project.id);

    // Link the stakeholder to a task too.
    const task = await createTask(token, project.id, { stakeholders: [{ stakeholderId: s.id, role: 'RESPONSIBLE' }] });
    // And make them the owner of a risk.
    const risk = await createRisk(token, project.id, { ownerStakeholderId: s.id });

    // Sanity: everything is linked before the delete.
    const before = await request(app).get(`/api/projects/${project.id}`).set(auth(token));
    expect(before.body.data.stakeholders.map((x) => x.stakeholderId)).toContain(s.id);
    const taskBefore = await request(app).get(`/api/tasks/${task.id}`).set(auth(token));
    expect(taskBefore.body.data.stakeholders.map((x) => x.stakeholderId)).toContain(s.id);

    // Delete the stakeholder.
    const del = await request(app).delete(`/api/stakeholders/${s.id}`).set(auth(token));
    expect(del.status).toBe(200);

    // Project no longer references it.
    const after = await request(app).get(`/api/projects/${project.id}`).set(auth(token));
    expect(after.body.data.stakeholders).toEqual([]);

    // Task no longer references it.
    const taskAfter = await request(app).get(`/api/tasks/${task.id}`).set(auth(token));
    expect(taskAfter.body.data.stakeholders).toEqual([]);

    // Risk ownership is unset (SET NULL), not deleted.
    const riskAfter = await request(app).get(`/api/risks/${risk.id}`).set(auth(token));
    expect(riskAfter.status).toBe(200);
    expect(riskAfter.body.data.ownerStakeholderId).toBeNull();
    expect(riskAfter.body.data.owner).toBeNull();
  });
});
