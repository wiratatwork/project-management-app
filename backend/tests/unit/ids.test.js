import { describe, it, expect } from 'vitest';
import { parseId } from '../../src/utils/ids';

describe('parseId', () => {
  it('accepts a positive integer string', () => {
    expect(parseId('1')).toBe(1);
    expect(parseId('42')).toBe(42);
  });

  it('rejects zero, negatives, floats and non-numbers with a 400 AppError', () => {
    for (const bad of ['0', '-1', '1.5', 'abc', 'NaN', '']) {
      expect(() => parseId(bad)).toThrow();
      try {
        parseId(bad);
      } catch (err) {
        expect(err.name).toBe('AppError');
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe('VALIDATION_ERROR');
        expect(err.isOperational).toBe(true);
        expect(err.details).toEqual([{ field: 'id', message: 'id must be a positive integer' }]);
      }
    }
  });
});
