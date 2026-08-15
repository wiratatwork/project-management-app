const z = require('zod');

const {
  TASK_STATUSES,
  STAKEHOLDER_ROLES,
  isoDate,
  optionalIsoDate,
  progressNumber,
  refineDateRanges,
} = require('./common');

const taskStakeholderEntry = z.object({
  stakeholderId: z.number().int().positive(),
  role: z.enum(STAKEHOLDER_ROLES).optional(),
});

const taskFields = {
  // Optional: when omitted, the service auto-generates {projectCode}-{NNN}.
  taskCode: z.string().trim().min(1, 'taskCode is required').max(50).optional(),
  name: z.string().trim().min(1, 'name is required').max(200),
  description: z.string().trim().max(5000).optional().nullable().default(null),
  priorityId: z.number().int().positive(),
  plannedStartDate: isoDate(),
  plannedEndDate: isoDate(),
  actualStartDate: optionalIsoDate(),
  actualEndDate: optionalIsoDate(),
  dueDate: isoDate(),
  status: z.enum(TASK_STATUSES).optional(),
  progressPercentage: progressNumber().optional(),
  // Stakeholders to assign: [{ stakeholderId, role? }]
  stakeholders: z.array(taskStakeholderEntry).max(200).optional(),
  // Dependencies: task ids this task depends on (FINISH_TO_START)
  dependencyIds: z.array(z.number().int().positive()).max(200).optional(),
};

const createTaskSchema = refineDateRanges(
  z.object(taskFields).superRefine((data, ctx) => {
    if (data.dueDate && data.plannedStartDate && data.dueDate < data.plannedStartDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['dueDate'],
        message: 'dueDate must be on or after plannedStartDate',
      });
    }
  })
);

const updateTaskSchema = refineDateRanges(
  z.object({
    projectId: z.number().int().positive().optional().describe('Move the task to another project'),
    taskCode: z.string().trim().min(1, 'taskCode is required').max(50).optional(),
    name: z.string().trim().min(1, 'name is required').max(200).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    priorityId: z.number().int().positive().optional(),
    plannedStartDate: isoDate().optional(),
    plannedEndDate: isoDate().optional(),
    actualStartDate: optionalIsoDate(),
    actualEndDate: optionalIsoDate(),
    dueDate: isoDate().optional(),
    status: z.enum(TASK_STATUSES).optional(),
    progressPercentage: progressNumber().optional(),
    stakeholders: z.array(taskStakeholderEntry).max(200).optional(),
    dependencyIds: z.array(z.number().int().positive()).max(200).optional(),
  }).superRefine((data, ctx) => {
    if (
      data.dueDate &&
      data.plannedStartDate &&
      data.dueDate < data.plannedStartDate
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['dueDate'],
        message: 'dueDate must be on or after plannedStartDate',
      });
    }
  })
);

const reorderTasksSchema = z.object({
  // Complete, ordered list of a project's task ids (position = new order).
  taskIds: z.array(z.number().int().positive()).min(1).max(1000),
});

module.exports = { createTaskSchema, updateTaskSchema, taskStakeholderEntry, reorderTasksSchema };
