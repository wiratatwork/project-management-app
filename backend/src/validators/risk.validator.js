const z = require('zod');

const { RISK_STATUSES, isoDate, optionalIsoDate } = require('./common');

const riskFields = {
  title: z.string().trim().min(1, 'title is required').max(200),
  description: z.string().trim().max(5000).optional().nullable().default(null),
  probability: z.number().int().min(1, 'probability must be between 1 and 5').max(5),
  impact: z.number().int().min(1, 'impact must be between 1 and 5').max(5),
  mitigationPlan: z.string().trim().max(5000).optional().nullable().default(null),
  contingencyPlan: z.string().trim().max(5000).optional().nullable().default(null),
  ownerStakeholderId: z.number().int().positive().nullable().optional(),
  status: z.enum(RISK_STATUSES).optional(),
  identifiedDate: isoDate().optional(),
  resolvedDate: optionalIsoDate(),
};

const createRiskSchema = z.object(riskFields).superRefine((data, ctx) => {
  if (
    data.identifiedDate &&
    data.resolvedDate &&
    data.identifiedDate > data.resolvedDate
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['resolvedDate'],
      message: 'resolvedDate must be on or after identifiedDate',
    });
  }
});

const updateRiskSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(200).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  probability: z.number().int().min(1, 'probability must be between 1 and 5').max(5).optional(),
  impact: z.number().int().min(1, 'impact must be between 1 and 5').max(5).optional(),
  mitigationPlan: z.string().trim().max(5000).nullable().optional(),
  contingencyPlan: z.string().trim().max(5000).nullable().optional(),
  ownerStakeholderId: z.number().int().positive().nullable().optional(),
  status: z.enum(RISK_STATUSES).optional(),
  identifiedDate: isoDate().optional(),
  resolvedDate: optionalIsoDate(),
}).superRefine((data, ctx) => {
  if (
    data.identifiedDate &&
    data.resolvedDate &&
    data.identifiedDate > data.resolvedDate
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['resolvedDate'],
      message: 'resolvedDate must be on or after identifiedDate',
    });
  }
});

module.exports = { createRiskSchema, updateRiskSchema };
