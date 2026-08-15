import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, auth, login, iso, createProject, createTask, createRisk } from './helpers.js';

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

describe('dashboard endpoints', () => {
  it('returns project progress rows with counts and delay flags', async () => {
    const project = await createProject(token, { status: 'IN_PROGRESS' });
    createdProjectIds.push(project.id);
    await createTask(token, project.id, { status: 'COMPLETED', progressPercentage: 100 });

    const res = await request(app).get('/api/dashboard/projects').set(auth(token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const row = res.body.data.find((p) => p.id === project.id);
    expect(row).toMatchObject({
      id: project.id,
      projectCode: project.projectCode,
      name: project.name,
      status: 'IN_PROGRESS',
      taskCount: 1,
      delayed: expect.any(Boolean),
    });
    expect(typeof row.progressPercentage).toBe('number');
  });

  it('returns risk aggregates, by-level, by-status and the matrix', async () => {
    const project = await createProject(token);
    createdProjectIds.push(project.id);
    await createRisk(token, project.id, { probability: 4, impact: 4, status: 'OPEN' }); // CRITICAL 16
    await createRisk(token, project.id, { probability: 2, impact: 2, status: 'CLOSED' }); // LOW 4

    const res = await request(app).get('/api/dashboard/risks').set(auth(token));
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.totalRisks).toBeGreaterThanOrEqual(2);
    expect(data.critical).toBeGreaterThanOrEqual(1);
    expect(data.byLevel.map((l) => l.level)).toEqual(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
    expect(data.byStatus.map((s) => s.status)).toEqual(['OPEN', 'MITIGATED', 'CLOSED', 'ACCEPTED']);
    expect(Array.isArray(data.matrix)).toBe(true);
    // The critical open risk must appear in the matrix.
    expect(data.matrix.some((m) => m.probability === 4 && m.impact === 4 && m.count > 0)).toBe(true);
  });
});

describe('gantt endpoints', () => {
  it('returns 404 for a missing project', async () => {
    const res = await request(app).get('/api/projects/999999999/gantt').set(auth(token));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns an empty schedule for a project without tasks', async () => {
    const project = await createProject(token);
    createdProjectIds.push(project.id);
    const res = await request(app).get(`/api/projects/${project.id}/gantt`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.project.id).toBe(project.id);
    expect(res.body.data.tasks).toEqual([]);
    expect(res.body.data.schedule).toEqual({ ON_TRACK: 0, AT_RISK: 0, DELAYED: 0 });
  });

  it('flags a delayed task in the project and global schedule', async () => {
    const project = await createProject(token, { status: 'IN_PROGRESS' });
    createdProjectIds.push(project.id);
    // Past-due unfinished task → DELAYED.
    await createTask(token, project.id, {
      status: 'TODO',
      plannedStartDate: iso(-30),
      plannedEndDate: iso(-10),
      dueDate: iso(-5),
    });
    // Comfortable future task → ON_TRACK.
    await createTask(token, project.id, {
      status: 'TODO',
      plannedStartDate: iso(10),
      plannedEndDate: iso(30),
      dueDate: iso(30),
    });

    const proj = await request(app).get(`/api/projects/${project.id}/gantt`).set(auth(token));
    expect(proj.body.data.schedule.DELAYED).toBeGreaterThanOrEqual(1);
    expect(proj.body.data.schedule.ON_TRACK).toBeGreaterThanOrEqual(1);
    const delayedTask = proj.body.data.tasks.find((t) => t.scheduleStatus === 'DELAYED');
    expect(delayedTask).toBeTruthy();
    expect(delayedTask.scheduleDaysLate).toBeGreaterThan(0);

    // Global gantt sums every project's schedule.
    const global = await request(app).get('/api/gantt').set(auth(token));
    expect(global.status).toBe(200);
    const group = global.body.data.projects.find((g) => g.project.id === project.id);
    expect(group).toBeTruthy();
    const sum = global.body.data.projects.reduce(
      (acc, g) => ({
        ON_TRACK: acc.ON_TRACK + g.schedule.ON_TRACK,
        AT_RISK: acc.AT_RISK + g.schedule.AT_RISK,
        DELAYED: acc.DELAYED + g.schedule.DELAYED,
      }),
      { ON_TRACK: 0, AT_RISK: 0, DELAYED: 0 }
    );
    expect(global.body.data.schedule).toEqual(sum);
    expect(global.body.data.schedule.DELAYED).toBeGreaterThanOrEqual(1);
  });
});
