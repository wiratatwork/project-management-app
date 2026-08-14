import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

// Ensure DB + env are configured before the app is imported.
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://pm_user:pm_password@localhost:5432/project_management';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const { default: app } = await import('../../src/app.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RUN = `T-${Date.now()}`;
let token = null;

const auth = () => ({ Authorization: `Bearer ${token}` });

const iso = (n) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  // Snap to a business day (Mon–Fri) so weekend-date validation never trips.
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
};

/** The next Saturday (or today if today is a weekend) — always a rejected date. */
function weekendISO() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

async function createProject(overrides = {}) {
  const res = await request(app)
    .post('/api/projects')
    .set(auth())
    .send({
      projectCode: `${RUN}-P${Math.floor(Math.random() * 100000)}`,
      name: 'Integration Test Project',
      plannedStartDate: iso(-10),
      plannedEndDate: iso(30),
      ...overrides,
    });
  return res.body.data;
}

async function createTask(projectId, overrides = {}) {
  const res = await request(app)
    .post(`/api/projects/${projectId}/tasks`)
    .set(auth())
    .send({
      taskCode: `${RUN}-T${Math.floor(Math.random() * 100000)}`,
      name: 'Integration Test Task',
      priorityId: 2,
      plannedStartDate: iso(0),
      plannedEndDate: iso(10),
      dueDate: iso(10),
      ...overrides,
    });
  return res.body.data;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('authentication', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects invalid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('logs in with the seeded demo user', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    token = res.body.data.token;
  });
});

describe('project CRUD', () => {
  it('creates, reads, updates and deletes a project', async () => {
    const project = await createProject();
    expect(project.id).toBeGreaterThan(0);
    expect(project.projectCode).toMatch(new RegExp(`^${RUN}`));
    expect(project.status).toBe('PLANNED');

    const read = await request(app).get(`/api/projects/${project.id}`).set(auth());
    expect(read.status).toBe(200);
    expect(read.body.data.name).toBe('Integration Test Project');

    const updated = await request(app)
      .put(`/api/projects/${project.id}`)
      .set(auth())
      .send({ status: 'IN_PROGRESS', name: 'Integration Test Project (updated)' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.status).toBe('IN_PROGRESS');

    const deleted = await request(app).delete(`/api/projects/${project.id}`).set(auth());
    expect(deleted.status).toBe(200);

    const gone = await request(app).get(`/api/projects/${project.id}`).set(auth());
    expect(gone.status).toBe(404);
  });

  it('rejects weekend planned dates (Sat/Sun)', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(auth())
      .send({
        projectCode: `${RUN}-WKND`,
        name: 'Weekend Dates',
        plannedStartDate: weekendISO(),
        plannedEndDate: iso(30),
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'plannedStartDate')).toBe(true);
  });

  it('validates plannedStartDate <= plannedEndDate', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(auth())
      .send({
        projectCode: `${RUN}-BAD`,
        name: 'Bad Dates',
        plannedStartDate: iso(30),
        plannedEndDate: iso(-10),
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'plannedEndDate')).toBe(true);
  });

  it('rejects a duplicate project code with 409', async () => {
    const project = await createProject();
    try {
      const res = await request(app)
        .post('/api/projects')
        .set(auth())
        .send({
          projectCode: project.projectCode,
          name: 'Duplicate',
          plannedStartDate: iso(0),
          plannedEndDate: iso(20),
        });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    } finally {
      await request(app).delete(`/api/projects/${project.id}`).set(auth());
    }
  });
});

describe('task CRUD and progress calculation', () => {
  it('creates tasks, auto-calculates project progress, deletes task', async () => {
    const project = await createProject();
    try {
      const taskA = await createTask(project.id, { status: 'COMPLETED', progressPercentage: 100 });
      const taskB = await createTask(project.id, { status: 'TODO' });
      expect(taskA.id).toBeGreaterThan(0);
      expect(taskB.status).toBe('TODO');

      // Project progress = completed tasks / total tasks * 100 = 1/2 = 50
      const detail = await request(app).get(`/api/projects/${project.id}`).set(auth());
      expect(detail.body.data.progressPercentage).toBe(50);

      // Completing the second task pushes progress to 100
      const res = await request(app)
        .put(`/api/tasks/${taskB.id}`)
        .set(auth())
        .send({ status: 'COMPLETED' });
      expect(res.status).toBe(200);
      expect(res.body.data.progressPercentage).toBe(100); // auto-set on completion

      const detail2 = await request(app).get(`/api/projects/${project.id}`).set(auth());
      expect(detail2.body.data.progressPercentage).toBe(100);

      // Delete task A: 1 remaining completed task -> 100%
      await request(app).delete(`/api/tasks/${taskA.id}`).set(auth());
      const detail3 = await request(app).get(`/api/projects/${project.id}`).set(auth());
      expect(detail3.body.data.progressPercentage).toBe(100);
    } finally {
      await request(app).delete(`/api/projects/${project.id}`).set(auth());
    }
  });

  it('auto-generates task codes {projectCode}-{NNN} and never reuses deleted ones', async () => {
    const project = await createProject({ name: 'Auto Code Project' });
    try {
      // No taskCode sent -> the service generates {projectCode}-{001..}
      const t1 = await createTask(project.id, { taskCode: undefined });
      expect(t1.taskCode).toBe(`${project.projectCode}-001`);
      const t2 = await createTask(project.id, { taskCode: undefined });
      expect(t2.taskCode).toBe(`${project.projectCode}-002`);
      const t3 = await createTask(project.id, { taskCode: undefined });
      expect(t3.taskCode).toBe(`${project.projectCode}-003`);

      // Delete the highest-numbered task, then create another: the counter
      // must keep going (next is 004), never reusing the deleted 003.
      await request(app).delete(`/api/tasks/${t3.id}`).set(auth());
      const t4 = await createTask(project.id, { taskCode: undefined });
      expect(t4.taskCode).toBe(`${project.projectCode}-004`);

      // An explicit taskCode is still honored.
      const explicit = await createTask(project.id, { taskCode: `${project.projectCode}-XYZ` });
      expect(explicit.taskCode).toBe(`${project.projectCode}-XYZ`);
    } finally {
      await request(app).delete(`/api/projects/${project.id}`).set(auth());
    }
  });

  it('does not re-stamp actualEndDate when updating an already-completed task', async () => {
    const project = await createProject();
    try {
      const task = await createTask(project.id, { status: 'COMPLETED', progressPercentage: 100, actualStartDate: iso(-5), actualEndDate: iso(-1) });

      // Renaming or moving a completed task must not rewrite its actual end.
      const renamed = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set(auth())
        .send({ name: 'Renamed after completion' });
      expect(renamed.status).toBe(200);
      expect(renamed.body.data.actualEndDate).toBe(iso(-1));
      expect(renamed.body.data.progressPercentage).toBe(100);

      // Same protection when the update transitions nothing (e.g. project move).
      const other = await createProject();
      try {
        const moved = await request(app)
          .put(`/api/tasks/${task.id}`)
          .set(auth())
          .send({ projectId: other.id });
        expect(moved.status).toBe(200);
        expect(moved.body.data.actualEndDate).toBe(iso(-1));
      } finally {
        await request(app).delete(`/api/projects/${other.id}`).set(auth());
      }
    } finally {
      await request(app).delete(`/api/projects/${project.id}`).set(auth());
    }
  });

  it('validates task dates (planned start <= end, due >= start)', async () => {
    const project = await createProject();
    try {
      const badRange = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth())
        .send({
          taskCode: `${RUN}-BAD`,
          name: 'Bad range',
          priorityId: 1,
          plannedStartDate: iso(10),
          plannedEndDate: iso(0),
          dueDate: iso(10),
        });
      expect(badRange.status).toBe(400);

      const badDue = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth())
        .send({
          taskCode: `${RUN}-BAD2`,
          name: 'Bad due date',
          priorityId: 1,
          plannedStartDate: iso(0),
          plannedEndDate: iso(10),
          dueDate: iso(-5), // before planned start
        });
      expect(badDue.status).toBe(400);
      expect(badDue.body.error.details.some((d) => d.field === 'dueDate')).toBe(true);

      const badWeekend = await request(app)
        .post(`/api/projects/${project.id}/tasks`)
        .set(auth())
        .send({
          taskCode: `${RUN}-WKND`,
          name: 'Weekend task dates',
          priorityId: 1,
          plannedStartDate: iso(0),
          plannedEndDate: weekendISO(), // Saturday
          dueDate: iso(10),
        });
      expect(badWeekend.status).toBe(400);
      expect(badWeekend.body.error.details.some((d) => d.field === 'plannedEndDate')).toBe(true);
    } finally {
      await request(app).delete(`/api/projects/${project.id}`).set(auth());
    }
  });

  it('marks a past-due unfinished task as overdue', async () => {
    const project = await createProject();
    try {
      const overdueTask = await createTask(project.id, {
        status: 'TODO',
        plannedStartDate: iso(-30),
        plannedEndDate: iso(-10),
        dueDate: iso(-5), // already due
      });
      const res = await request(app).get(`/api/tasks/${overdueTask.id}`).set(auth());
      expect(res.body.data.overdue).toBe(true);

      // A completed past-due task is NOT overdue
      const doneTask = await createTask(project.id, {
        status: 'COMPLETED',
        plannedStartDate: iso(-30),
        plannedEndDate: iso(-10),
        dueDate: iso(-5),
      });
      const done = await request(app).get(`/api/tasks/${doneTask.id}`).set(auth());
      expect(done.body.data.overdue).toBe(false);
    } finally {
      await request(app).delete(`/api/projects/${project.id}`).set(auth());
    }
  });
});

describe('task dependencies', () => {
  it('prevents a task depending on itself', async () => {
    const project = await createProject();
    try {
      const task = await createTask(project.id);
      const res = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set(auth())
        .send({ dependencyIds: [task.id] });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CIRCULAR_DEPENDENCY');
    } finally {
      await request(app).delete(`/api/projects/${project.id}`).set(auth());
    }
  });

  it('prevents direct circular dependencies (A -> B, B -> A)', async () => {
    const project = await createProject();
    try {
      const a = await createTask(project.id);
      const b = await createTask(project.id);

      const dep = await request(app)
        .put(`/api/tasks/${a.id}`)
        .set(auth())
        .send({ dependencyIds: [b.id] });
      expect(dep.status).toBe(200);
      expect(dep.body.data.dependencies.map((d) => d.dependsOnTaskId)).toContain(b.id);

      const cycle = await request(app)
        .put(`/api/tasks/${b.id}`)
        .set(auth())
        .send({ dependencyIds: [a.id] });
      expect(cycle.status).toBe(400);
      expect(cycle.body.error.code).toBe('CIRCULAR_DEPENDENCY');
    } finally {
      await request(app).delete(`/api/projects/${project.id}`).set(auth());
    }
  });

  it('prevents indirect circular dependencies (A -> B, B -> C, C -> A)', async () => {
    const project = await createProject();
    try {
      const a = await createTask(project.id);
      const b = await createTask(project.id);
      const c = await createTask(project.id);

      await request(app).put(`/api/tasks/${a.id}`).set(auth()).send({ dependencyIds: [b.id] });
      await request(app).put(`/api/tasks/${b.id}`).set(auth()).send({ dependencyIds: [c.id] });

      const cycle = await request(app)
        .put(`/api/tasks/${c.id}`)
        .set(auth())
        .send({ dependencyIds: [a.id] });
      expect(cycle.status).toBe(400);
      expect(cycle.body.error.code).toBe('CIRCULAR_DEPENDENCY');
    } finally {
      await request(app).delete(`/api/projects/${project.id}`).set(auth());
    }
  });

  it('reorders tasks within a project and rejects partial lists', async () => {
    const project = await createProject();
    try {
      const a = await createTask(project.id);
      const b = await createTask(project.id);
      const c = await createTask(project.id);

      const reversed = await request(app)
        .put(`/api/projects/${project.id}/tasks/reorder`)
        .set(auth())
        .send({ taskIds: [c.id, b.id, a.id] });
      expect(reversed.status).toBe(200);
      expect(reversed.body.data.map((t) => t.id)).toEqual([c.id, b.id, a.id]);
      expect(reversed.body.data[0].sortOrder).toBe(0);
      expect(reversed.body.data[2].sortOrder).toBe(2);

      // A partial list is rejected — hidden tasks must keep their place.
      const partial = await request(app)
        .put(`/api/projects/${project.id}/tasks/reorder`)
        .set(auth())
        .send({ taskIds: [a.id, b.id] });
      expect(partial.status).toBe(400);
      expect(partial.body.error.code).toBe('VALIDATION_ERROR');

      const dup = await request(app)
        .put(`/api/projects/${project.id}/tasks/reorder`)
        .set(auth())
        .send({ taskIds: [a.id, a.id, b.id, c.id] });
      expect(dup.status).toBe(400);
    } finally {
      await request(app).delete(`/api/projects/${project.id}`).set(auth());
    }
  });

  it('rejects dependencies from another project', async () => {
    const projectA = await createProject();
    const projectB = await createProject();
    try {
      const a = await createTask(projectA.id);
      const foreign = await createTask(projectB.id);

      const res = await request(app)
        .put(`/api/tasks/${a.id}`)
        .set(auth())
        .send({ dependencyIds: [foreign.id] });
      expect(res.status).toBe(400);
    } finally {
      await request(app).delete(`/api/projects/${projectA.id}`).set(auth());
      await request(app).delete(`/api/projects/${projectB.id}`).set(auth());
    }
  });

  it('moves a task to another project and recalculates both progresses', async () => {
    const projectA = await createProject();
    const projectB = await createProject();
    try {
      const task = await createTask(projectA.id, { status: 'COMPLETED', progressPercentage: 100 });
      await createTask(projectA.id, { status: 'TODO' }); // A: 1/2 = 50%
      await createTask(projectB.id, { status: 'TODO' }); // B: 0/1 = 0%

      const moved = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set(auth())
        .send({ projectId: projectB.id });
      expect(moved.status).toBe(200);
      expect(moved.body.data.projectId).toBe(projectB.id);
      expect(moved.body.data.project.projectCode).toBe(projectB.projectCode);

      const a = await request(app).get(`/api/projects/${projectA.id}`).set(auth());
      expect(a.body.data.progressPercentage).toBe(0); // completed task left A
      const b = await request(app).get(`/api/projects/${projectB.id}`).set(auth());
      expect(b.body.data.progressPercentage).toBe(50); // 1 completed / 2 now in B
    } finally {
      await request(app).delete(`/api/projects/${projectA.id}`).set(auth());
      await request(app).delete(`/api/projects/${projectB.id}`).set(auth());
    }
  });

  it('rejects moving a task whose dependencies do not exist in the target project', async () => {
    const projectA = await createProject();
    const projectB = await createProject();
    try {
      const dep = await createTask(projectA.id);
      const task = await createTask(projectA.id);
      await request(app).put(`/api/tasks/${task.id}`).set(auth()).send({ dependencyIds: [dep.id] });

      const res = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set(auth())
        .send({ projectId: projectB.id });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.field === 'dependencyIds')).toBe(true);

      // Still in the original project after the rejected move.
      const still = await request(app).get(`/api/tasks/${task.id}`).set(auth());
      expect(still.body.data.projectId).toBe(projectA.id);
    } finally {
      await request(app).delete(`/api/projects/${projectA.id}`).set(auth());
      await request(app).delete(`/api/projects/${projectB.id}`).set(auth());
    }
  });
});

describe('risks', () => {
  it('computes riskScore = probability * impact on create and update', async () => {
    const project = await createProject();
    try {
      const res = await request(app)
        .post(`/api/projects/${project.id}/risks`)
        .set(auth())
        .send({ title: 'Test risk', probability: 4, impact: 4 });
      expect(res.status).toBe(201);
      expect(res.body.data.riskScore).toBe(16);
      expect(res.body.data.riskLevel).toBe('CRITICAL');

      const updated = await request(app)
        .put(`/api/risks/${res.body.data.id}`)
        .set(auth())
        .send({ probability: 2, impact: 3 });
      expect(updated.status).toBe(200);
      expect(updated.body.data.riskScore).toBe(6);
      expect(updated.body.data.riskLevel).toBe('MEDIUM');
    } finally {
      await request(app).delete(`/api/projects/${project.id}`).set(auth());
    }
  });

  it('rejects out-of-range probability', async () => {
    const project = await createProject();
    try {
      const res = await request(app)
        .post(`/api/projects/${project.id}/risks`)
        .set(auth())
        .send({ title: 'Bad risk', probability: 9, impact: 3 });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    } finally {
      await request(app).delete(`/api/projects/${project.id}`).set(auth());
    }
  });
});

describe('list pagination, search and sort', () => {
  it('returns a paginated envelope when a page param is passed', async () => {
    const project = await createProject({ name: `Pagination ${RUN}` });
    try {
      const res = await request(app)
        .get('/api/projects')
        .query({ page: 1, limit: 2, sortBy: 'name', sortDir: 'desc', search: RUN })
        .set(auth());
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ page: 1, limit: 2, totalPages: expect.any(Number) });
      expect(res.body.data.total).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.rows)).toBe(true);
      expect(res.body.data.rows.length).toBeLessThanOrEqual(2);
      // every row matches the search term (case-insensitive)
      expect(res.body.data.rows.every((r) => r.name.toLowerCase().includes(RUN.toLowerCase()))).toBe(true);
      // sorted desc by name
      const names = res.body.data.rows.map((r) => r.name);
      expect([...names].sort((a, b) => b.localeCompare(a))).toEqual(names);
    } finally {
      await request(app).delete(`/api/projects/${project.id}`).set(auth());
    }
  });

  it('supports pagination on nested task/risk lists too', async () => {
    const project = await createProject();
    try {
      await createTask(project.id);
      const tasks = await request(app).get(`/api/projects/${project.id}/tasks`).query({ page: 1, limit: 5 }).set(auth());
      expect(tasks.status).toBe(200);
      expect(tasks.body.data.rows).toBeInstanceOf(Array);
      expect(tasks.body.data.total).toBeGreaterThan(0);

      const risks = await request(app).get(`/api/projects/${project.id}/risks`).query({ page: 1, limit: 5 }).set(auth());
      expect(risks.status).toBe(200);
      expect(risks.body.data).toHaveProperty('rows');
      expect(risks.body.data).toHaveProperty('total');
    } finally {
      await request(app).delete(`/api/projects/${project.id}`).set(auth());
    }
  });

  it('still returns a plain array without a page param (backward compatible)', async () => {
    const res = await request(app).get('/api/projects').set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('dashboard and gantt', () => {
  it('returns dashboard aggregates', async () => {
    const summary = await request(app).get('/api/dashboard/summary').set(auth());
    expect(summary.status).toBe(200);
    expect(summary.body.data).toMatchObject({
      totalProjects: expect.any(Number),
      totalTasks: expect.any(Number),
      openRisks: expect.any(Number),
    });

    const tasks = await request(app).get('/api/dashboard/tasks').set(auth());
    expect(tasks.body.data.byStatus).toBeInstanceOf(Array);
    expect(tasks.body.data.byPriority).toBeInstanceOf(Array);
    expect(tasks.body.data.byProject).toBeInstanceOf(Array);
  });

  it('returns gantt data for a project with tasks', async () => {
    const project = await createProject();
    try {
      await createTask(project.id);
      const res = await request(app).get(`/api/projects/${project.id}/gantt`).set(auth());
      expect(res.status).toBe(200);
      expect(res.body.data.project.id).toBe(project.id);
      expect(res.body.data.tasks.length).toBeGreaterThan(0);
      expect(res.body.data.tasks[0]).toHaveProperty('plannedStartDate');
      expect(res.body.data.tasks[0]).toHaveProperty('dependencies');
      expect(res.body.data.tasks[0]).toHaveProperty('scheduleStatus');
    } finally {
      await request(app).delete(`/api/projects/${project.id}`).set(auth());
    }
  });

  it('returns global gantt data for all projects with a schedule summary', async () => {
    const res = await request(app).get('/api/gantt').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.projects).toBeInstanceOf(Array);
    expect(res.body.data.schedule).toMatchObject({ ON_TRACK: expect.any(Number), AT_RISK: expect.any(Number), DELAYED: expect.any(Number) });
    const group = res.body.data.projects[0];
    expect(group).toHaveProperty('project.id');
    expect(group).toHaveProperty('tasks');
    expect(group).toHaveProperty('schedule');
  });
});

afterAll(async () => {
  // Clean up any leftover projects from this run.
  const res = await request(app).get('/api/projects').set(auth());
  for (const project of res.body.data) {
    if (String(project.projectCode).startsWith(RUN)) {
      await request(app).delete(`/api/projects/${project.id}`).set(auth());
    }
  }
});
