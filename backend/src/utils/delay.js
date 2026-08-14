const { toDateKey, isBeforeToday } = require('./dateUtils');

const DAY_MS = 24 * 60 * 60 * 1000;

/** Tasks with fewer than this many days left before their planned end are "at risk". */
const AT_RISK_WINDOW_DAYS = 7;

function diffDays(a, b) {
  const start = new Date(`${toDateKey(a)}T00:00:00Z`).getTime();
  const end = new Date(`${toDateKey(b)}T00:00:00Z`).getTime();
  return Math.round((end - start) / DAY_MS);
}

/**
 * A task is overdue when it is not finished (and not cancelled) and its due
 * date is before today.
 *
 * Note: CANCELLED tasks are intentionally excluded from "overdue" — work that
 * was cancelled is not late. COMPLETED tasks are obviously excluded.
 */
function isTaskOverdue(task, today = new Date()) {
  if (!task || !task.dueDate) return false;
  if (task.status === 'COMPLETED' || task.status === 'CANCELLED') return false;
  return isBeforeToday(task.dueDate, today);
}

/**
 * A project is delayed when it is not finished (and not cancelled) and its
 * planned end date is before today. CANCELLED projects are excluded for the
 * same reason as tasks.
 */
function isProjectDelayed(project, today = new Date()) {
  if (!project || !project.plannedEndDate) return false;
  if (project.status === 'COMPLETED' || project.status === 'CANCELLED') return false;
  return isBeforeToday(project.plannedEndDate, today);
}

/**
 * Plan-vs-actual schedule analysis for a single task.
 *
 * Returns { status, daysLate, startedLateDays } where status is one of:
 *   - 'ON_TRACK'  green — on or ahead of the planned timeline
 *   - 'AT_RISK'   amber — likely to slip (started later than planned, or the
 *                 planned end is within AT_RISK_WINDOW_DAYS and work remains)
 *   - 'DELAYED'   red   — already late (planned end passed unfinished, or a
 *                 completed task actually finished after its planned end)
 *
 * `daysLate` is how many days the task is (or was) behind the planned end;
 * `startedLateDays` is how many days late the actual start was versus planned.
 * CANCELLED tasks are always 'ON_TRACK'.
 */
function taskScheduleStatus(task, today = new Date()) {
  const result = { status: 'ON_TRACK', daysLate: 0, startedLateDays: 0 };
  if (!task) return result;

  const plannedStart = task.plannedStartDate ? toDateKey(task.plannedStartDate) : null;
  const plannedEnd = task.plannedEndDate ? toDateKey(task.plannedEndDate) : null;
  const actualStart = task.actualStartDate ? toDateKey(task.actualStartDate) : null;
  const actualEnd = task.actualEndDate ? toDateKey(task.actualEndDate) : null;

  if (actualStart && plannedStart && actualStart > plannedStart) {
    result.startedLateDays = diffDays(plannedStart, actualStart);
  }

  if (!plannedEnd || task.status === 'CANCELLED') return result;

  // Completed: compare the actual finish against the plan.
  if (task.status === 'COMPLETED') {
    if (actualEnd && actualEnd > plannedEnd) {
      result.status = 'DELAYED';
      result.daysLate = diffDays(plannedEnd, actualEnd);
    }
    return result;
  }

  const todayKey = toDateKey(today);

  // Still open: planned end already passed → delayed.
  if (todayKey > plannedEnd) {
    result.status = 'DELAYED';
    result.daysLate = diffDays(plannedEnd, todayKey);
    return result;
  }

  // Started later than planned → at risk of slipping.
  if (result.startedLateDays > 0) {
    result.status = 'AT_RISK';
    return result;
  }

  // Approaching the planned end with work remaining → at risk.
  if (diffDays(todayKey, plannedEnd) <= AT_RISK_WINDOW_DAYS) {
    result.status = 'AT_RISK';
  }

  return result;
}

module.exports = { isTaskOverdue, isProjectDelayed, taskScheduleStatus, AT_RISK_WINDOW_DAYS };
