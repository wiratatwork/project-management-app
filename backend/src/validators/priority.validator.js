const z = require('zod');

const priorityFields = {
  name: z.string().trim().min(1, 'name is required').max(50),
  level: z.number().int().min(1, 'level must be >= 1').max(100),
  description: z.string().trim().max(500).optional().nullable().default(null),
  color: z.string().trim().max(20).optional().nullable().default(null),
};

const createPrioritySchema = z.object(priorityFields);

const updatePrioritySchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(50).optional(),
  level: z.number().int().min(1, 'level must be >= 1').max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  color: z.string().trim().max(20).nullable().optional(),
});

module.exports = { createPrioritySchema, updatePrioritySchema };
