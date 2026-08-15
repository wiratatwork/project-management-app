import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import errorHandler from '../../src/middleware/errorHandler.js';
import AppError from '../../src/utils/AppError';

function resMock(headersSent = false) {
  const res = { headersSent, statusCode: 200, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

function prismaError(code) {
  return new Prisma.PrismaClientKnownRequestError('db message', {
    code,
    clientVersion: '5.22.0',
  });
}

describe('errorHandler', () => {
  it('formats an AppError with its code, status and details — no stack leak', () => {
    const res = resMock();
    const err = new AppError('Validation failed', {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: [{ field: 'name', message: 'name is required' }],
    });
    errorHandler(err, {}, res, vi.fn());
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: [{ field: 'name', message: 'name is required' }] },
    });
    expect(JSON.stringify(res.body)).not.toContain('stack');
  });

  it('defaults a plain Error to 500 INTERNAL_ERROR without leaking the stack', () => {
    const res = resMock();
    errorHandler(new Error('boom'), {}, res, vi.fn());
    expect(res.statusCode).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).toBe('boom'); // message is kept…
    expect(JSON.stringify(res.body)).not.toContain('stack'); // …but never the stack
  });

  it('maps Prisma unique violation P2002 to 409 CONFLICT', () => {
    const res = resMock();
    errorHandler(prismaError('P2002'), {}, res, vi.fn());
    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('maps Prisma P2025 to 404 NOT_FOUND', () => {
    const res = resMock();
    errorHandler(prismaError('P2025'), {}, res, vi.fn());
    expect(res.statusCode).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('maps Prisma P2003 to 400 FOREIGN_KEY_VIOLATION', () => {
    const res = resMock();
    errorHandler(prismaError('P2003'), {}, res, vi.fn());
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('FOREIGN_KEY_VIOLATION');
  });

  it('maps Prisma P2014 to 400 CONSTRAINT_VIOLATION', () => {
    const res = resMock();
    errorHandler(prismaError('P2014'), {}, res, vi.fn());
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('CONSTRAINT_VIOLATION');
  });

  it('maps unknown Prisma codes to 500 DATABASE_ERROR', () => {
    const res = resMock();
    errorHandler(prismaError('P9999'), {}, res, vi.fn());
    expect(res.statusCode).toBe(500);
    expect(res.body.error.code).toBe('DATABASE_ERROR');
  });

  it('maps a malformed JSON body error to 400 INVALID_JSON', () => {
    const res = resMock();
    errorHandler({ type: 'entity.parse.failed' }, {}, res, vi.fn());
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('maps an oversized body to 413 PAYLOAD_TOO_LARGE', () => {
    const res = resMock();
    errorHandler({ type: 'entity.too.large' }, {}, res, vi.fn());
    expect(res.statusCode).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('delegates to next() when headers are already sent', () => {
    const res = resMock(true);
    const next = vi.fn();
    const err = new AppError('late failure', { code: 'X', statusCode: 500 });
    errorHandler(err, {}, res, next);
    expect(next).toHaveBeenCalledWith(err);
    expect(res.body).toBeNull();
  });
});
