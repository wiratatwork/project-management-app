const z = require('zod');

const stakeholderFields = {
  name: z.string().trim().min(1, 'name is required').max(200),
  email: z.string().trim().email('email must be a valid email address').max(255),
  phone: z.string().trim().max(50).optional().nullable().default(null),
  department: z.string().trim().max(200).optional().nullable().default(null),
  position: z.string().trim().max(200).optional().nullable().default(null),
  organization: z.string().trim().max(200).optional().nullable().default(null),
};

const createStakeholderSchema = z.object(stakeholderFields);

const updateStakeholderSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(200).optional(),
  email: z.string().trim().email('email must be a valid email address').max(255).optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  department: z.string().trim().max(200).nullable().optional(),
  position: z.string().trim().max(200).nullable().optional(),
  organization: z.string().trim().max(200).nullable().optional(),
});

module.exports = { createStakeholderSchema, updateStakeholderSchema };
