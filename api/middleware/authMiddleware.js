// api/middleware/authMiddleware.js
// Alias for authGuard - backward compatibility
const authGuard = require('./authGuard');

module.exports = {
  requireAuth: authGuard,
  authenticate: authGuard,
  authGuard
};
