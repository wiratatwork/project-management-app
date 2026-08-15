import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import {
  app,
  auth,
  login,
  RUN,
  iso,
  weekendISO,
  createProject,
  createTask,
  createRisk,
  createStakeholder,
} from './helpers.js';

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

const track = (id) => createdProjectIds.push(id);

describe('project validation', () => {
  it('reports every missing required field', async () => {
    const res = await request(app).post('/api/projects').set(auth(token)).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field).sort();
    expect(fields).toEqual(['name', 'plannedEndDate', 'plannedStartDate', 'projectCode']);
  });

  it('rejects an invalid status enum', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(auth(token))
      .send({
        projectCode: `${RUN}-BADSTATUS`,
        name: 'Bad status',
        plannedStartDate: iso(-5),
        plannedEndDate: iso(5),
        status: 'BOGUS',
      });
    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d) => d.field === 'status')).toBe(true);
  });

  it('rejects progress out of range', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(auth(token))
      .send({
        projectCode: `${RUN}-BADPROG`,
        name: 'Bad progress',
        plannedStartDate: iso(-5),
        plannedEndDate: iso(5),
        progressPercentage: 150,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d) => d.field === 'progressPercentage')).toBe(true);
  });

  it('rejects weekend dates on create and update', async () => {
    const bad = await request(app)
      .post('/api/projects')
      .set(auth(token))
      .send({
        projectCode: `${RUN}-WKND`,
        name: 'Weekend',
        plannedStartDate: weekendISO(),
        plannedEndDate: iso(10),
      });
    expect(bad.status).toBe(400);

    const project = await createProject(token);
    track(project.id);
    const upd = await request(app)
      .put(`/api/projects/${project.id}`)
      .set(auth(token))
      .send({ plannedEndDate: weekendISO() });
    expect(upd.status).toBe(400);
  });

  it('rejects a reversed date range on update', async () => {
    const project = await createProject(token);
    track(project.id);
    const res = await request(app)
      .put(`/api/projects/${project.id}`)
      .set(auth(token))
      .send({ plannedStartDate: iso(20), plannedEndDate: iso(5) });
    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d) => d.field === 'plannedEndDate')).toBe(true);
  });

  it('rejects stakeholder ids that do not exist', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(auth(token))
      .send({
        projectCode: `${RUN}-BADSH`,
        name: 'Bad stakeholders',
        plannedStartDate: iso(-5),
        plannedEndDate: iso(5),
        stakeholderIds: [999999999],
      });
    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d) => d.field === 'stakeholderIds')).toBe(true);
  });
});

describe('task validation', () => {
  it('rejects an unknown priority', async () => {
    const project = await createProject(token);
    track(project.id);
    const res = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(token))
      .send({
        name: 'Bad priority',
        priorityId: 999999999,
        plannedStartDate: iso(0),
        plannedEndDate: iso(5),
        dueDate: iso(5),
      });
    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d) => d.field === 'priorityId')).toBe(true);
  });

  it('rejects dueDate before plannedStartDate on create and update', async () => {
    const project = await createProject(token);
    track(project.id);

    // Create: dueDate before plannedStartDate is rejected.
    const create = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(token))
      .send({
        name: 'Bad dueDate',
        priorityId: 2,
        plannedStartDate: iso(5),
        plannedEndDate: iso(10),
        dueDate: iso(0),
      });
    expect(create.status).toBe(400);
    expect(create.body.error.details.some((d) => d.field === 'dueDate')).toBe(true);

    // Update: the same rule holds even when plannedEndDate is not sent
    // (partial update must not bypass the check).
    const task = await createTask(token, project.id);
    const update = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set(auth(token))
      .send({ plannedStartDate: iso(5), dueDate: iso(0) });
    expect(update.status).toBe(400);
    expect(update.body.error.details.some((d) => d.field === 'dueDate')).toBe(true);

    // A valid range (dueDate on/after plannedStart) still passes.
    const ok = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set(auth(token))
      .send({ plannedStartDate: iso(5), plannedEndDate: iso(10), dueDate: iso(10) });
    expect(ok.status).toBe(200);
  });

  it('rejects unknown stakeholders in the task form', async () => {
    const project = await createProject(token);
    track(project.id);
    const res = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(token))
      .send({
        name: 'Bad stakeholders',
        priorityId: 2,
        plannedStartDate: iso(0),
        plannedEndDate: iso(5),
        dueDate: iso(5),
        stakeholders: [{ stakeholderId: 999999999, role: 'RESPONSIBLE' }],
      });
    expect(res.status).toBe(400);
  });

  it('rejects dependencies from another (or non-existent) project', async () => {
    const project = await createProject(token);
    track(project.id);
    const res = await request(app)
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(token))
      .send({
        name: 'Bad deps',
        priorityId: 2,
        plannedStartDate: iso(0),
        plannedEndDate: iso(5),
        dueDate: iso(5),
        dependencyIds: [999999999],
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an empty reorder list and a non-existent project reorder', async () => {
    const project = await createProject(token);
    track(project.id);

    const empty = await request(app)
      .put(`/api/projects/${project.id}/tasks/reorder`)
      .set(auth(token))
      .send({ taskIds: [] });
    expect(empty.status).toBe(400);

    // All ids must belong to the project: sending a foreign id fails too.
    const task = await createTask(token, project.id);
    const foreign = await createTask(token, project.id);
    const partial = await request(app)
      .put(`/api/projects/${project.id}/tasks/reorder`)
      .set(auth(token))
      .send({ taskIds: [task.id, foreign.id, 999999999] });
    expect(partial.status).toBe(400);
  });
});

describe('risk validation and lifecycle', () => {
  it('rejects probability/impact outside 1..5', async () => {
    const project = await createProject(token);
    track(project.id);
    for (const overrides of [{ probability: 0 }, { probability: 6 }, { impact: 0 }, { impact: 6 }]) {
      const res = await request(app)
        .post(`/api/projects/${project.id}/risks`)
        .set(auth(token))
        .send({ title: 'Bad risk', probability: 3, impact: 3, ...overrides });
      expect(res.status).toBe(400);
    }
  });

  it('rejects an unknown risk owner', async () => {
    const project = await createProject(token);
    track(project.id);
    const res = await request(app)
      .post(`/api/projects/${project.id}/risks`)
      .set(auth(token))
      .send({ title: 'Bad owner', probability: 2, impact: 2, ownerStakeholderId: 999999999 });
    expect(res.status).toBe(400);
  });

  it('rejects resolvedDate before identifiedDate', async () => {
    const project = await createProject(token);
    track(project.id);
    const res = await request(app)
      .post(`/api/projects/${project.id}/risks`)
      .set(auth(token))
      .send({
        title: 'Bad dates',
        probability: 2,
        impact: 2,
        identifiedDate: iso(10),
        resolvedDate: iso(0),
      });
    expect(res.status).toBe(400);
    expect(res.body.error.details.some((d) => d.field === 'resolvedDate')).toBe(true);
  });

  it('stamps resolvedDate when closed/mitigated and clears it when reopened', async () => {
    const project = await createProject(token);
    track(project.id);
    const today = new Date().toISOString().slice(0, 10);

    const closed = await createRisk(token, project.id, { status: 'CLOSED' });
    expect(closed.resolvedDate).toBeTruthy();
    expect(new Date(closed.resolvedDate).toISOString().slice(0, 10)).toBe(today);

    // Reopening clears the resolved date.
    const reopened = await request(app)
      .put(`/api/risks/${closed.id}`)
      .set(auth(token))
      .send({ status: 'OPEN' });
    expect(reopened.status).toBe(200);
    expect(reopened.body.data.resolvedDate).toBeNull();

    // Mitigating stamps it again.
    const mitigated = await request(app)
      .put(`/api/risks/${closed.id}`)
      .set(auth(token))
      .send({ status: 'MITIGATED' });
    expect(mitigated.body.data.resolvedDate).toBeTruthy();

    // Editing other fields keeps the resolved date untouched.
    const kept = await request(app)
      .put(`/api/risks/${closed.id}`)
      .set(auth(token))
      .send({ title: 'Renamed' });
    expect(kept.body.data.resolvedDate).toBe(mitigated.body.data.resolvedDate);
  });
});

describe('pagination edge cases', () => {
  it('clamps page and limit to sane bounds', async () => {
    const res = await request(app)
      .get('/api/projects')
      .query({ page: 0, limit: 1000 })
      .set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(100);
  });

  it('defaults garbage query values', async () => {
    const res = await request(app)
      .get('/api/projects')
      .query({ page: 'abc', limit: 'xyz' })
      .set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(20);
  });
});

describe('project detail shape', () => {
  it('includes tasks, risks, stakeholders, counts and durations', async () => {
    const s = await createStakeholder(token);
    const project = await createProject(token, { stakeholderIds: [s.id], status: 'IN_PROGRESS' });
    track(project.id);
    const task = await createTask(token, project.id, { status: 'COMPLETED', progressPercentage: 100 });
    const risk = await createRisk(token, project.id);

    const res = await request(app).get(`/api/projects/${project.id}`).set(auth(token));
    expect(res.status).toBe(200);
    const data = res.body.data;
    // Diff of the (business-day-snapped) planned dates — matches the app.
    const expectedDuration = Math.round((new Date(iso(30)).getTime() - new Date(iso(-10)).getTime()) / 86400000);
    expect(data.plannedDurationDays).toBe(expectedDuration);
    expect(data.actualDurationDays).toBeNull(); // no actual start
    expect(data.taskCount).toBe(1);
    expect(data.riskCount).toBe(1);
    expect(data.tasks.map((t) => t.id)).toContain(task.id);
    expect(data.tasks[0]).toHaveProperty('scheduleStatus');
    expect(data.risks.map((r) => r.id)).toContain(risk.id);
    expect(data.risks[0].riskLevel).toBe('MEDIUM'); // 2×3 = 6
    expect(data.stakeholders.map((x) => x.stakeholderId)).toContain(s.id);
    expect(data.stakeholders[0]).toHaveProperty('name');
  });
});

describe('list filters', () => {
  it('filters tasks by project and status', async () => {
    const project = await createProject(token);
    track(project.id);
    const todo = await createTask(token, project.id, { status: 'TODO' });
    await createTask(token, project.id, { status: 'COMPLETED', progressPercentage: 100 });

    const byProject = await request(app)
      .get('/api/tasks')
      .query({ projectId: project.id, status: 'TODO' })
      .set(auth(token));
    expect(byProject.status).toBe(200);
    expect(Array.isArray(byProject.body.data)).toBe(true);
    expect(byProject.body.data.length).toBe(1);
    expect(byProject.body.data[0].id).toBe(todo.id);
  });

  it('filters risks by project and status', async () => {
    const project = await createProject(token);
    track(project.id);
    const open = await createRisk(token, project.id, { status: 'OPEN' });
    await createRisk(token, project.id, { status: 'CLOSED' });

    const res = await request(app)
      .get('/api/risks')
      .query({ projectId: project.id, status: 'OPEN' })
      .set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(open.id);
  });

  it('lists tasks of a project via the nested endpoint', async () => {
    const project = await createProject(token);
    track(project.id);
    await createTask(token, project.id);
    const res = await request(app).get(`/api/projects/${project.id}/tasks`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].projectId).toBe(project.id);
  });
});
