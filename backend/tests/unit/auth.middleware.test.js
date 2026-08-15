import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../../src/middleware/auth.js';
import env from '../../src/config/env.js';

const PAYLOAD = { sub: 1, username: 'admin' };
const validToken = () => jwt.sign(PAYLOAD, env.jwtSecret);

/** Build a mock req/res/next trio. */
function harness(headerValue) {
  const req = { headers: headerValue !== undefined ? { authorization: headerValue } : {} };
  const res = {};
  const next = vi.fn();
  return { req, res, next };
}

/** Assert next() was called once with an AppError of the given code/status. */
function expectError(next, code, statusCode) {
  expect(next).toHaveBeenCalledTimes(1);
  const err = next.mock.calls[0][0];
  expect(err).toBeDefined();
  expect(err.code).toBe(code);
  expect(err.statusCode).toBe(statusCode);
  expect(err.isOperational).toBe(true);
}

describe('requireAuth middleware', () => {
  it('rejects requests without an Authorization header (UNAUTHORIZED)', async () => {
    const { req, res, next } = harness(undefined);
    await requireAuth(req, res, next);
    expectError(next, 'UNAUTHORIZED', 401);
  });

  it('rejects non-Bearer schemes', async () => {
    const { req, res, next } = harness('Basic dXNlcjpwYXNz');
    await requireAuth(req, res, next);
    expectError(next, 'UNAUTHORIZED', 401);
  });

  it('rejects a Bearer header without a token', async () => {
    const { req, res, next } = harness('Bearer');
    await requireAuth(req, res, next);
    expectError(next, 'UNAUTHORIZED', 401);
  });

  it('rejects an empty token string', async () => {
    const { req, res, next } = harness('Bearer ');
    await requireAuth(req, res, next);
    expectError(next, 'UNAUTHORIZED', 401);
  });

  it('rejects a malformed token (INVALID_TOKEN)', async () => {
    const { req, res, next } = harness('Bearer not-a-real-token');
    await requireAuth(req, res, next);
    expectError(next, 'INVALID_TOKEN', 401);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const forged = jwt.sign(PAYLOAD, 'some-other-secret');
    const { req, res, next } = harness(`Bearer ${forged}`);
    await requireAuth(req, res, next);
    expectError(next, 'INVALID_TOKEN', 401);
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign(PAYLOAD, env.jwtSecret, { expiresIn: '-1s' });
    const { req, res, next } = harness(`Bearer ${expired}`);
    await requireAuth(req, res, next);
    expectError(next, 'INVALID_TOKEN', 401);
  });

  it('accepts a valid token and attaches the decoded identity', async () => {
    const { req, res, next } = harness(`Bearer ${validToken()}`);
    await requireAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined(); // no error → next()
    expect(req.user).toMatchObject({ id: 1, username: 'admin' });
  });
});
