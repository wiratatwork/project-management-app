import { describe, it, expect } from 'vitest';
import {
  toDateKey,
  todayUtc,
  todayKey,
  normalizeDate,
  isSameOrBefore,
  isBeforeToday,
} from '../../src/utils/dateUtils';

describe('dateUtils', () => {
  it('formats a YYYY-MM-DD key in UTC from a Date or string', () => {
    expect(toDateKey(new Date('2026-08-14T23:59:59Z'))).toBe('2026-08-14');
    expect(toDateKey('2026-08-14T00:00:00Z')).toBe('2026-08-14');
  });

  it('todayUtc returns UTC midnight and todayKey matches it', () => {
    const t = todayUtc();
    expect(t.getUTCHours()).toBe(0);
    expect(t.getUTCMinutes()).toBe(0);
    expect(todayKey()).toBe(t.toISOString().slice(0, 10));
  });

  it('normalizeDate strips the time-of-day component', () => {
    const d = normalizeDate('2026-08-14T18:45:30Z');
    expect(d.toISOString()).toBe('2026-08-14T00:00:00.000Z');
  });

  it('normalizeDate throws on invalid input', () => {
    expect(() => normalizeDate('not-a-date')).toThrow(TypeError);
  });

  it('compares calendar dates regardless of time-of-day', () => {
    expect(isSameOrBefore('2026-08-14T23:00:00Z', '2026-08-14T01:00:00Z')).toBe(true);
    expect(isSameOrBefore('2026-08-15T00:00:00Z', '2026-08-14T00:00:00Z')).toBe(false);
  });

  it('isBeforeToday compares against a fixed today', () => {
    const today = new Date('2026-08-14T12:00:00Z');
    expect(isBeforeToday('2026-08-13T23:59:00Z', today)).toBe(true);
    expect(isBeforeToday('2026-08-14T00:00:00Z', today)).toBe(false); // due today is not overdue
    expect(isBeforeToday(new Date('2026-08-15T00:00:00Z'), today)).toBe(false);
  });
});
