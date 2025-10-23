// api/middleware/tempAuthGuard.js
const jwt = require('jsonwebtoken');

/**
 * Temporary auth guard that accepts both:
 * 1. Regular session tokens (for logged-in users)
 * 2. Temporary MFA setup tokens (for first-time login MFA setup)
 */
function tempAuthGuard(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');

    // Check if it's a temporary MFA setup token
    if (decoded.type === 'mfa-setup-required') {
      req.user = {
        id: decoded.userId,
        tempSetup: true
      };
      return next();
    }

    // Check if it's a regular MFA pending token
    if (decoded.type === 'mfa-pending') {
      req.user = {
        id: decoded.userId,
        mfaPending: true
      };
      return next();
    }

    // Regular session token
    req.user = {
      id: decoded.sub || decoded.userId,
      email: decoded.email
    };
    next();
  } catch (error) {
    console.error('[tempAuthGuard] Token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = tempAuthGuard;
