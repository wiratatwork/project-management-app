/**
 * Date helpers. All date comparisons are done on the UTC calendar date
 * (YYYY-MM-DD), ignoring the time-of-day component, so that "due today"
 * semantics are stable regardless of timezone.
 */

/** "YYYY-MM-DD" key for a date, in UTC. */
function toDateKey(value) {
  const d = value instanceof Date ? value : new Date(value);
  return d.toISOString().slice(0, 10);
}

/** UTC midnight today. */
function todayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** "YYYY-MM-DD" key for today (UTC). */
function todayKey() {
  return toDateKey(todayUtc());
}

/** Normalize any accepted date value to a UTC-midnight Date. */
function normalizeDate(value) {
  const d = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new TypeError(`Invalid date: ${value}`);
  }
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Compare two date values by calendar date: a <= b */
function isSameOrBefore(a, b) {
  return toDateKey(a) <= toDateKey(b);
}

/** true when the calendar date of `value` is strictly before today. */
function isBeforeToday(value, today = new Date()) {
  return toDateKey(value) < toDateKey(today);
}

module.exports = {
  toDateKey,
  todayUtc,
  todayKey,
  normalizeDate,
  isSameOrBefore,
  isBeforeToday,
};
