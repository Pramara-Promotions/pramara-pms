// api/routes/auth.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const { v4: uuid } = require('uuid');
const { z } = require('zod');

const { audit } = require('../lib/audit');
const { signAccessToken, signRefreshToken, verifyRefreshToken, hashValue } = require('../lib/auth');
const { generateTOTPSecret, secretToDataURL, verifyTOTP } = require('../lib/mfa');
const { authGuard } = require('../middleware/authGuard');
// const { permissionGuard } = require('../middleware/permissionGuard'); // keep if you use later

const prisma = new PrismaClient();
const router = express.Router();

/* =========================================================
   LOGIN
   body: { email, password, totp? }
   returns: { accessToken, refreshToken }
   ========================================================= */
router.post('/login', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string(),
      totp: z.string().optional(),
    });
    const { email, password, totp } = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // If MFA enabled, verify TOTP
    if (user.mfaSecret) {
      if (!totp || !verifyTOTP(totp, user.mfaSecret)) {
        return res.status(401).json({ error: 'Invalid or missing TOTP' });
      }
    }

    const accessToken = signAccessToken({ sub: user.id });
    const refreshRaw = uuid() + uuid();
    const refreshToken = signRefreshToken({ sub: user.id, jti: refreshRaw });
    const expiresAt = new Date(
      Date.now() + Number(process.env.REFRESH_TOKEN_TTL_DAYS || 14) * 24 * 60 * 60 * 1000
    );

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: hashValue(refreshToken),
        userAgent: req.headers['user-agent'] || null,
        ip: req.ip || null,
        expiresAt,
      },
    });

    await audit(user.id, 'LOGIN', 'USER', user.id, null, req);
    res.json({ accessToken, refreshToken });
  } catch (err) {
    // surface validation + other errors back to the client
  console.error('POST /auth/login failed:', err);

  // If it's Zod, send the specific messages
  if (err?.issues) {
    return res.status(400).json({
      error: err.issues.map(i => i.message).join(', ')
    });
  }

  // Otherwise send whatever message we have
  return res.status(400).json({ error: err.message || 'Login failed' });

  }
});

/* =========================================================
   REFRESH
   body: { refreshToken }
   returns: { accessToken, refreshToken }
   ========================================================= */
router.post('/refresh', async (req, res) => {
  try {
    const schema = z.object({ refreshToken: z.string().min(20) });
    const { refreshToken } = schema.parse(req.body);

    const decoded = verifyRefreshToken(refreshToken);
    const hash = hashValue(refreshToken);

    const session = await prisma.session.findUnique({ where: { refreshTokenHash: hash } });
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Expired/invalid session' });
    }

    // rotate: delete old session, create new
    await prisma.session.delete({ where: { refreshTokenHash: hash } });

    const accessToken = signAccessToken({ sub: decoded.sub });
    const newRaw = uuid() + uuid();
    const newRefresh = signRefreshToken({ sub: decoded.sub, jti: newRaw });
    const expiresAt = new Date(
      Date.now() + Number(process.env.REFRESH_TOKEN_TTL_DAYS || 14) * 24 * 60 * 60 * 1000
    );

    await prisma.session.create({
      data: {
        userId: decoded.sub,
        refreshTokenHash: hashValue(newRefresh),
        userAgent: req.headers['user-agent'] || null,
        ip: req.ip || null,
        expiresAt,
      },
    });

    res.json({ accessToken, refreshToken: newRefresh });
  } catch (err) {
    console.error('POST /auth/refresh failed', err);
    res.status(400).json({ error: 'Refresh failed' });
  }
});

/* =========================================================
   LOGOUT
   body: { refreshToken }
   ========================================================= */
router.post('/logout', async (req, res) => {
  try {
    const schema = z.object({ refreshToken: z.string().min(20) });
    const { refreshToken } = schema.parse(req.body);
    await prisma.session.deleteMany({ where: { refreshTokenHash: hashValue(refreshToken) } });
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('POST /auth/logout failed', err);
    res.status(400).json({ error: 'Logout failed' });
  }
});

/* =========================================================
   MFA SETUP & VERIFY (requires auth)
   ========================================================= */
router.post('/mfa/setup', authGuard, async (req, res) => {
  try {
    const user = req.auth.user;
    const secret = generateTOTPSecret(user.email);
    const qr = await secretToDataURL(secret.otpauth_url);
    res.json({ otpauthUrl: secret.otpauth_url, qrDataUrl: qr, base32: secret.base32 });
  } catch (err) {
    console.error('POST /auth/mfa/setup failed', err);
    res.status(400).json({ error: 'MFA setup failed' });
  }
});

router.post('/mfa/verify', authGuard, async (req, res) => {
  try {
    const schema = z.object({ base32: z.string(), token: z.string() });
    const { base32, token } = schema.parse(req.body);
    if (!verifyTOTP(token, base32)) return res.status(400).json({ error: 'Invalid TOTP' });

    await prisma.user.update({ where: { id: req.auth.user.id }, data: { mfaSecret: base32 } });
    await audit(req.auth.user.id, 'MFA_ENABLE', 'USER', req.auth.user.id, null, req);
    res.json({ message: 'MFA enabled' });
  } catch (err) {
    console.error('POST /auth/mfa/verify failed', err);
    res.status(400).json({ error: 'MFA verify failed' });
  }
});
/* =========================================================
   DISABLE MFA (requires auth)
   ========================================================= */
router.post('/mfa/disable', authGuard, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.auth.user.id },
      data: { mfaSecret: null },
    });
    // optional audit entry
    // await audit(req.auth.user.id, 'MFA_DISABLE', 'USER', req.auth.user.id, null, req);
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /auth/mfa/disable failed', err);
    res.status(400).json({ error: 'Disable MFA failed' });
  }
});
/* =========================================================
   CHANGE PASSWORD (requires auth)
   body: { old, neu(min 8) }
   ========================================================= */
router.post('/change-password', authGuard, async (req, res) => {
  try {
    const schema = z.object({
      old: z.string().min(1),
      neu: z.string().min(8),
    });
    const { old, neu } = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.auth.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ok = await argon2.verify(user.passwordHash, old);
    if (!ok) return res.status(400).json({ error: 'Incorrect current password' });

    const newHash = await argon2.hash(neu);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /auth/change-password failed', err);
    res.status(400).json({ error: 'Change password failed' });
  }
});

/* =========================================================
   SESSIONS (requires auth)
   GET /sessions -> list
   DELETE /sessions/:id -> revoke
   NOTE: requires Session model with `id` field
   ========================================================= */
router.get('/sessions', authGuard, async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.auth.user.id },
      select: { id: true, userAgent: true, ip: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sessions);
  } catch (err) {
    console.error('GET /auth/sessions failed', err);
    res.json([]); // degrade gracefully
  }
});

router.delete('/sessions/:id', authGuard, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid session id' });

    const sess = await prisma.session.findUnique({ where: { id } });
    if (!sess || sess.userId !== req.auth.user.id) return res.status(404).json({ error: 'Not found' });

    await prisma.session.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /auth/sessions/:id failed', err);
    res.status(400).json({ error: 'Revoke failed' });
  }
});

module.exports = { authRouter: router };
