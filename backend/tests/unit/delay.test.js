import { describe, it, expect } from 'vitest';
import { isTaskOverdue, isProjectDelayed, taskScheduleStatus, AT_RISK_WINDOW_DAYS } from '../../src/utils/delay';

// Fixed "today" for deterministic tests.
const TODAY = new Date('2026-08-14T12:00:00Z');

const task = (status, dueDate) => ({ status, dueDate: new Date(dueDate) });
const project = (status, plannedEndDate) => ({
  status,
  plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
});

// Schedule-status helpers. Dates are ISO keys; null = not recorded yet.
const plan = ({
  status = 'TODO',
  plannedStartDate = '2026-08-01',
  plannedEndDate = '2026-08-31',
  actualStartDate = null,
  actualEndDate = null,
} = {}) => ({ status, plannedStartDate, plannedEndDate, actualStartDate, actualEndDate });

describe('task overdue detection', () => {
  it('flags an incomplete task with a due date in the past', () => {
    expect(isTaskOverdue(task('TODO', '2026-08-01'), TODAY)).toBe(true);
    expect(isTaskOverdue(task('IN_PROGRESS', '2026-08-13'), TODAY)).toBe(true);
    expect(isTaskOverdue(task('BLOCKED', '2026-08-10'), TODAY)).toBe(true);
  });

  it('does not flag a task due today or in the future', () => {
    expect(isTaskOverdue(task('TODO', '2026-08-14'), TODAY)).toBe(false);
    expect(isTaskOverdue(task('TODO', '2026-09-01'), TODAY)).toBe(false);
  });

  it('does not flag COMPLETED or CANCELLED tasks', () => {
    expect(isTaskOverdue(task('COMPLETED', '2026-08-01'), TODAY)).toBe(false);
    expect(isTaskOverdue(task('CANCELLED', '2026-08-01'), TODAY)).toBe(false);
  });

  it('handles missing due date', () => {
    expect(isTaskOverdue({ status: 'TODO' }, TODAY)).toBe(false);
  });
});

describe('task schedule status (plan vs actual)', () => {
  it('is ON_TRACK while comfortably inside the planned window', () => {
    const t = plan({ status: 'IN_PROGRESS', plannedStartDate: '2026-07-01', plannedEndDate: '2026-10-01' });
    const s = taskScheduleStatus(t, TODAY);
    expect(s.status).toBe('ON_TRACK');
    expect(s.daysLate).toBe(0);
    expect(s.startedLateDays).toBe(0);
  });

  it('is DELAYED when the planned end passed and the task is unfinished', () => {
    const t = plan({ status: 'IN_PROGRESS', plannedEndDate: '2026-08-01' });
    const s = taskScheduleStatus(t, TODAY);
    expect(s.status).toBe('DELAYED');
    expect(s.daysLate).toBe(13); // Aug 1 → Aug 14
  });

  it('is DELAYED even if no actual dates were ever recorded', () => {
    const t = plan({ status: 'TODO', plannedEndDate: '2026-08-10' });
    expect(taskScheduleStatus(t, TODAY).status).toBe('DELAYED');
  });

  it('is AT_RISK within the warning window before the planned end', () => {
    const t = plan({ status: 'TODO', plannedEndDate: '2026-08-20' }); // 6 days out
    const s = taskScheduleStatus(t, TODAY);
    expect(s.status).toBe('AT_RISK');
    expect(s.daysLate).toBe(0);
  });

  it('is AT_RISK with exactly the warning window remaining', () => {
    const t = plan({ status: 'TODO', plannedEndDate: '2026-08-21' }); // 7 days out
    expect(taskScheduleStatus(t, TODAY).status).toBe('AT_RISK');
  });

  it('is ON_TRACK just outside the warning window', () => {
    const t = plan({ status: 'TODO', plannedEndDate: '2026-08-22' }); // 8 days out
    expect(taskScheduleStatus(t, TODAY).status).toBe('ON_TRACK');
  });

  it('is AT_RISK when the actual start is later than the planned start', () => {
    const t = plan({ status: 'IN_PROGRESS', actualStartDate: '2026-08-10' });
    const s = taskScheduleStatus(t, TODAY);
    expect(s.status).toBe('AT_RISK');
    expect(s.startedLateDays).toBe(9); // Aug 1 → Aug 10
  });

  it('is DELAYED when a completed task finished after its planned end', () => {
    const t = plan({ status: 'COMPLETED', actualStartDate: '2026-08-01', actualEndDate: '2026-09-05' });
    const s = taskScheduleStatus(t, TODAY);
    expect(s.status).toBe('DELAYED');
    expect(s.daysLate).toBe(5); // Aug 31 → Sep 5
  });

  it('is ON_TRACK when a completed task finished on or before its planned end', () => {
    const t = plan({ status: 'COMPLETED', actualEndDate: '2026-08-20' });
    expect(taskScheduleStatus(t, TODAY).status).toBe('ON_TRACK');
  });

  it('never flags CANCELLED tasks', () => {
    const t = plan({ status: 'CANCELLED', plannedEndDate: '2026-07-01' });
    expect(taskScheduleStatus(t, TODAY).status).toBe('ON_TRACK');
  });

  it('handles tasks without planned dates', () => {
    expect(taskScheduleStatus(plan({ plannedStartDate: null, plannedEndDate: null }), TODAY).status).toBe('ON_TRACK');
  });

  it('exposes the warning window constant for the UI', () => {
    expect(AT_RISK_WINDOW_DAYS).toBeGreaterThan(0);
  });
});

describe('project delay detection', () => {
  it('flags an unfinished project whose planned end is in the past', () => {
    expect(isProjectDelayed(project('IN_PROGRESS', '2026-07-31'), TODAY)).toBe(true);
    expect(isProjectDelayed(project('PLANNED', '2026-08-01'), TODAY)).toBe(true);
  });

  it('does not flag a project ending today or later', () => {
    expect(isProjectDelayed(project('IN_PROGRESS', '2026-08-14'), TODAY)).toBe(false);
    expect(isProjectDelayed(project('IN_PROGRESS', '2026-10-01'), TODAY)).toBe(false);
  });

  it('does not flag COMPLETED or CANCELLED projects', () => {
    expect(isProjectDelayed(project('COMPLETED', '2026-06-01'), TODAY)).toBe(false);
    expect(isProjectDelayed(project('CANCELLED', '2026-06-01'), TODAY)).toBe(false);
  });
});
