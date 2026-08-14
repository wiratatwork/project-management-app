const z = require('zod');

const { PROJECT_STATUSES, isoDate, optionalIsoDate, progressNumber, refineDateRanges } = require('./common');

const projectFields = {
  projectCode: z.string().trim().min(1, 'projectCode is required').max(50),
  name: z.string().trim().min(1, 'name is required').max(200),
  description: z.string().trim().max(5000).optional().nullable().default(null),
  plannedStartDate: isoDate(),
  plannedEndDate: isoDate(),
  actualStartDate: optionalIsoDate(),
  actualEndDate: optionalIsoDate(),
  status: z.enum(PROJECT_STATUSES).optional(),
  progressPercentage: progressNumber().optional(),
  stakeholderIds: z.array(z.number().int().positive()).max(200).optional(),
};

const createProjectSchema = refineDateRanges(z.object(projectFields));

const updateProjectSchema = refineDateRanges(
  z.object({
    projectCode: z.string().trim().min(1, 'projectCode is required').max(50).optional(),
    name: z.string().trim().min(1, 'name is required').max(200).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    plannedStartDate: isoDate().optional(),
    plannedEndDate: isoDate().optional(),
    actualStartDate: optionalIsoDate(),
    actualEndDate: optionalIsoDate(),
    status: z.enum(PROJECT_STATUSES).optional(),
    progressPercentage: progressNumber().optional(),
    stakeholderIds: z.array(z.number().int().positive()).max(200).optional(),
  })
);

module.exports = { createProjectSchema, updateProjectSchema };
