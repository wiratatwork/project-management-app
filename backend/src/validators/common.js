const z = require('zod');

const PROJECT_STATUSES = ['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'];
const RISK_STATUSES = ['OPEN', 'MITIGATED', 'CLOSED', 'ACCEPTED'];
const STAKEHOLDER_ROLES = ['RESPONSIBLE', 'ACCOUNTABLE', 'CONSULTED', 'INFORMED'];

/** Accepts ISO-8601 strings or Date instances. */
const isoDate = () => z.coerce.date();

const optionalIsoDate = () => z.coerce.date().optional().nullable();

const progressNumber = () => z.number().min(0).max(100);

/**
 * Date fields that must never fall on a weekend (Sat/Sun).
 */
const WEEKDAY_FIELDS = ['plannedStartDate', 'plannedEndDate', 'dueDate', 'actualStartDate', 'actualEndDate'];

/**
 * Add cross-field date checks:
 *  - weekend dates (Sat/Sun) are rejected for project/task date fields
 *  - plannedStartDate <= plannedEndDate
 *  - actualStartDate <= actualEndDate (when both present)
 */
function refineDateRanges(schema) {
  return schema.superRefine((data, ctx) => {
    // No Saturdays or Sundays on any project/task date field.
    for (const field of WEEKDAY_FIELDS) {
      const d = data[field];
      if (d instanceof Date && !Number.isNaN(d.getTime())) {
        const day = d.getUTCDay();
        if (day === 0 || day === 6) {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: `${field} cannot be a Saturday or Sunday`,
          });
        }
      }
    }
    if (data.plannedStartDate && data.plannedEndDate && data.plannedStartDate > data.plannedEndDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['plannedEndDate'],
        message: 'plannedEndDate must be on or after plannedStartDate',
      });
    }
    if (data.actualStartDate && data.actualEndDate && data.actualStartDate > data.actualEndDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['actualEndDate'],
        message: 'actualEndDate must be on or after actualStartDate',
      });
    }
  });
}

module.exports = {
  PROJECT_STATUSES,
  TASK_STATUSES,
  RISK_STATUSES,
  STAKEHOLDER_ROLES,
  isoDate,
  optionalIsoDate,
  progressNumber,
  refineDateRanges,
};
