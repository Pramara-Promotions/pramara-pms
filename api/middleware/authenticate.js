// api/middleware/authenticate.js
// This is an alias/wrapper for authGuard to maintain backward compatibility
const authGuard = require('./authGuard');

module.exports = {
  authenticate: authGuard,
  requireAuth: authGuard
};
