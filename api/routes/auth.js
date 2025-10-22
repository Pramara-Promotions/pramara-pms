// api/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

let prisma = null;
try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
} catch (_) {}

const router = express.Router();

/**
 * POST /api/auth/login
 * Body: { email, password, totp? }
 * On success:
 *   - issues JWT
 *   - sets cookie "token"
 *   - returns { ok: true }
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email = '', password = '' } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!prisma) {
      // Fallback demo: accept our seeded admin.
      if (email === 'admin@pramara.local' && password === 'ChangeMe@123') {
        const token = jwt.sign(
          { sub: 'seed-admin', email },
          process.env.JWT_SECRET || 'dev-secret',
          { expiresIn: '7d' }
        );
        res.cookie('token', token, {
          httpOnly: true,
          sameSite: 'lax',   // ok for localhost:5173 -> localhost:4000
          secure: false,     // use true behind HTTPS
          path: '/',
          maxAge: 7 * 24 * 3600 * 1000,
        });
        return res.json({ ok: true });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase() },
      select: { id: true, email: true, passwordHash: true, isActive: true },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 7 * 24 * 3600 * 1000,
    });

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/logout: clear cookie */
router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ ok: true });
});

module.exports = router;