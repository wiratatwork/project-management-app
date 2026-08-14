const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const data = await authService.login(username, password);
  res.json({ success: true, data });
});

module.exports = { login };
