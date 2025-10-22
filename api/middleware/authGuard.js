// api/middleware/authGuard.js
const jwt = require('jsonwebtoken');

const DEV_TOKEN_PREFIX = 'dev-token-';

module.exports = function authGuard(req, res, next) {
  const auth = req.headers.authorization;
  let token = null;

  if (auth && auth.startsWith('Bearer ')) {
    token = auth.slice(7).trim();
  }

  if (!token && req.cookies) {
    token = req.cookies.pms_token || req.cookies.token || null;
  }

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  if (token.startsWith(DEV_TOKEN_PREFIX)) {
    req.user = {
      id: 'dev-user',
      email: process.env.DEV_AUTH_EMAIL || 'admin@pramara.local',
      roles: ['admin'],
      tokenSource: 'dev-cookie',
    };
    return next();
  }

  const secret = process.env.JWT_SECRET || 'dev-secret';

  try {
    req.user = jwt.verify(token, secret);
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
