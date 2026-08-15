import { describe, it, expect } from 'vitest';
import {
  parsePagination,
  buildOrderBy,
  buildSearchWhere,
  pageEnvelope,
} from '../../src/utils/pagination';

describe('parsePagination', () => {
  it('applies defaults when no params are given', () => {
    expect(parsePagination({})).toMatchObject({ page: 1, limit: 20, search: '', sortBy: '', sortDir: 'asc', skip: 0 });
  });

  it('clamps page to >= 1', () => {
    expect(parsePagination({ page: '0' }).page).toBe(1);
    expect(parsePagination({ page: '-3' }).page).toBe(1);
    expect(parsePagination({ page: 'abc' }).page).toBe(1);
  });

  it('clamps limit to 100 and treats 0/unset as the default', () => {
    expect(parsePagination({ limit: '0' }).limit).toBe(20); // 0 is falsy → default
    expect(parsePagination({ limit: '1000' }).limit).toBe(100);
    expect(parsePagination({ limit: 'abc' }).limit).toBe(20);
  });

  it('computes skip from page and limit', () => {
    expect(parsePagination({ page: '3', limit: '10' }).skip).toBe(20);
  });

  it('trims search and only accepts desc as sortDir', () => {
    expect(parsePagination({ search: '  hello  ', sortDir: 'desc' })).toMatchObject({ search: 'hello', sortDir: 'desc' });
    expect(parsePagination({ sortDir: 'ASC' }).sortDir).toBe('asc');
    expect(parsePagination({ sortDir: 'bogus' }).sortDir).toBe('asc');
  });
});

describe('buildOrderBy', () => {
  const fallback = [{ id: 'asc' }];

  it('maps a whitelisted column with the direction', () => {
    expect(buildOrderBy('name', 'desc', { name: 'name' }, fallback)).toEqual([{ name: 'desc' }, { id: 'asc' }]);
  });

  it('supports function entries (relation counts)', () => {
    const map = { tasks: (dir) => ({ tasks: { _count: dir } }) };
    expect(buildOrderBy('tasks', 'desc', map, fallback)).toEqual([{ tasks: { _count: 'desc' } }, { id: 'asc' }]);
  });

  it('falls back to the default order for unknown columns', () => {
    expect(buildOrderBy('hack', 'desc', { name: 'name' }, fallback)).toEqual(fallback);
    expect(buildOrderBy('', 'desc', { name: 'name' }, fallback)).toEqual(fallback);
  });
});

describe('buildSearchWhere', () => {
  it('returns an empty filter without a search term', () => {
    expect(buildSearchWhere('', ['name'])).toEqual({});
  });

  it('matches case-insensitively across all given fields', () => {
    expect(buildSearchWhere('abc', ['name', 'email'])).toEqual({
      OR: [
        { name: { contains: 'abc', mode: 'insensitive' } },
        { email: { contains: 'abc', mode: 'insensitive' } },
      ],
    });
  });
});

describe('pageEnvelope', () => {
  it('shapes the envelope and never reports 0 pages', () => {
    expect(pageEnvelope([], 0, 1, 20)).toEqual({ rows: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    expect(pageEnvelope(['a'], 1, 1, 20)).toMatchObject({ total: 1, totalPages: 1 });
    expect(pageEnvelope([...Array(21)], 21, 1, 20).totalPages).toBe(2);
    expect(pageEnvelope([...Array(41)], 41, 2, 20).totalPages).toBe(3);
  });
});
