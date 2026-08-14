const z = require('zod');

const loginSchema = z.object({
  username: z.string().trim().min(1, 'username is required').max(100),
  password: z.string().min(1, 'password is required').max(200),
});

module.exports = { loginSchema };
