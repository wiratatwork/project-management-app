import { describe, it, expect, vi } from 'vitest';
import validate from '../../src/middleware/validate.js';
import { loginSchema } from '../../src/validators/auth.validator.js';
import { createTaskSchema } from '../../src/validators/task.validator.js';

function harness(body) {
  const req = { body };
  const res = {};
  const next = vi.fn();
  return { req, res, next };
}

describe('validate middleware', () => {
  it('passes a valid payload through and applies zod coercion', () => {
    const { req, res, next } = harness({ username: '  admin  ', password: 'secret' });
    validate(loginSchema)(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
    expect(req.body).toEqual({ username: 'admin', password: 'secret' }); // trimmed
  });

  it('rejects a missing field with a 400 VALIDATION_ERROR + details', () => {
    const { req, res, next } = harness({});
    validate(loginSchema)(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.details.map((d) => d.field).sort()).toEqual(['password', 'username']);
  });

  it('flattens nested issue paths (e.g. stakeholders[0].stakeholderId)', () => {
    const body = {
      name: 'Task',
      priorityId: 2,
      plannedStartDate: '2026-08-14T00:00:00Z',
      plannedEndDate: '2026-08-20T00:00:00Z',
      dueDate: '2026-08-20T00:00:00Z',
      stakeholders: [{ stakeholderId: 'not-a-number', role: 'BOGUS_ROLE' }],
    };
    const { req, res, next } = harness(body);
    validate(createTaskSchema)(req, res, next);
    const err = next.mock.calls[0][0];
    expect(err.code).toBe('VALIDATION_ERROR');
    const fields = err.details.map((d) => d.field);
    expect(fields).toContain('stakeholders.0.stakeholderId');
    expect(fields).toContain('stakeholders.0.role');
  });

  it('rejects a non-object payload (null / array / string)', () => {
    for (const bad of [null, 'text', 42]) {
      const { req, res, next } = harness(bad);
      validate(loginSchema)(req, res, next);
      const err = next.mock.calls[0][0];
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.statusCode).toBe(400);
    }
  });
});
