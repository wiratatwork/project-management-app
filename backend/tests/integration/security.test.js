import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app, auth, login, RUN } from './helpers.js';
import env from '../../src/config/env.js';

let token = null;

beforeAll(async () => {
  token = await login();
});

describe('health endpoint', () => {
  it('is public and reports ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });
});

describe('unknown routes', () => {
  it('returns a 404 with the standard error envelope', async () => {
    const res = await request(app).get('/api/definitely-not-a-route').set(auth(token));
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('not found');
  });

  it('returns 404 for unknown methods on known paths', async () => {
    const res = await request(app).patch('/api/projects').set(auth(token));
    expect(res.status).toBe(404);
  });
});

describe('malformed JSON bodies', () => {
  it('rejects invalid JSON with INVALID_JSON', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(auth(token))
      .set('Content-Type', 'application/json')
      .send('{"name": "unterminated');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});

describe('authentication edge cases', () => {
  it('rejects a Basic scheme header', async () => {
    const res = await request(app).get('/api/projects').set('Authorization', 'Basic dXNlcjpwYXNz');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a Bearer header without a token', async () => {
    const res = await request(app).get('/api/projects').set('Authorization', 'Bearer');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a malformed token', async () => {
    const res = await request(app).get('/api/projects').set('Authorization', 'Bearer garbage-token');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects a token signed with the wrong secret', async () => {
    const forged = jwt.sign({ sub: 1, username: 'admin' }, 'not-the-secret');
    const res = await request(app).get('/api/projects').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign({ sub: 1, username: 'admin' }, env.jwtSecret, { expiresIn: '-1s' });
    const res = await request(app).get('/api/projects').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('accepts a freshly issued token', async () => {
    const res = await request(app).get('/api/projects').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('invalid route ids', () => {
  it('rejects non-numeric ids with 400 VALIDATION_ERROR', async () => {
    for (const id of ['abc', '0', '-5', '1.5']) {
      const res = await request(app).get(`/api/projects/${id}`).set(auth(token));
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('rejects non-numeric query filters too', async () => {
    const res = await request(app).get('/api/tasks').query({ projectId: 'abc' }).set(auth(token));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for a well-formed but missing id', async () => {
    const res = await request(app).get('/api/projects/999999999').set(auth(token));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('login validation', () => {
  it('requires username and password', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field).sort();
    expect(fields).toEqual(['password', 'username']);
  });
});

// NOTE: the auth limiter allows 10 login attempts / 15 min per IP, and EVERY
// request to /api/auth/login counts — including the successful beforeAll login
// and the validation test above. This describe must stay last in the file:
// total attempts = 1 (beforeAll) + 1 (validation) + 10 (loop) = 12, so the
// 10th and 11th loop iterations are limited.
describe('login rate limiting', () => {
  it('returns 401 for wrong passwords and 429 once the limit is hit', async () => {
    const statuses = [];
    for (let i = 0; i < 10; i += 1) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: `wrong-${RUN}-${i}` });
      statuses.push(res.status);
    }
    // 8 allowed attempts remain (1 beforeAll + 1 validation used), so the
    // first 8 of this loop get 401 and the last 2 iterations are rate-limited.
    expect(statuses.slice(0, 8).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(8).every((s) => s === 429)).toBe(true);

    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});
