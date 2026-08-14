const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const prisma = require('../prisma/client');
const env = require('../config/env');
const AppError = require('../utils/AppError');

class AuthService {
  async login(username, password) {
    const user = await prisma.user.findUnique({ where: { username } });

    // Same error for unknown user and wrong password (no user enumeration).
    const invalid = () =>
      new AppError('Invalid username or password', {
        code: 'INVALID_CREDENTIALS',
        statusCode: 401,
      });

    if (!user) throw invalid();

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) throw invalid();

    const token = jwt.sign(
      { sub: user.id, username: user.username },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    return {
      token,
      tokenType: 'Bearer',
      expiresIn: env.jwtExpiresIn,
      user: { id: user.id, username: user.username, name: user.name },
    };
  }
}

module.exports = new AuthService();
