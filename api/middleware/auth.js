// api/middleware/auth.js
// Unified authentication middleware exports
const authGuard = require('./authGuard');

module.exports = {
  authGuard,
  authenticate: authGuard,
  requireAuth: authGuard,
  auth: authGuard
};
