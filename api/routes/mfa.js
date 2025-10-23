// api/routes/mfa.js
const express = require('express');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { generateTOTPSecret, secretToDataURL, verifyTOTP } = require('../lib/mfa');
const { emailService } = require('../lib/emailService');
const { logAudit } = require('../middleware/auditLogger');

const prisma = new PrismaClient();
const router = express.Router();

// Import auth guard
let authGuard = null;
let tempAuthGuard = null;
try {
  const _auth = require('../middleware/authGuard');
  authGuard = _auth && typeof _auth === 'function' ? _auth : (_auth && _auth.authGuard);
  tempAuthGuard = require('../middleware/tempAuthGuard');
} catch (e) {
  console.warn('[mfa] authGuard not found:', e?.message);
  authGuard = (_req, _res, next) => next();
  tempAuthGuard = (_req, _res, next) => next();
}

/**
 * POST /api/mfa/setup (DEPRECATED - use /api/auth/mfa/setup instead)
 * Start MFA setup for current user
 * Returns: { secret, qrCode, backupCodes }
 */
router.post('/setup', tempAuthGuard, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user with email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, mfaSecret: true, mfaEnforcedAt: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userEmail = user.email;

    // Check if MFA already enabled
    if (user.mfaSecret && user.mfaEnforcedAt) {
      return res.status(400).json({ error: 'MFA already enabled. Disable first to re-setup.' });
    }

    // Generate new secret
    const secretObj = generateTOTPSecret(userEmail);
    const qrCodeDataUrl = await secretToDataURL(secretObj.otpauth_url);

    // Generate backup codes (8 codes, 8 characters each)
    const backupCodes = [];
    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(code);
    }

    // Store secret in session/temp (not in DB yet, only after verification)
    // We'll use a temporary field to store pending setup
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: secretObj.base32, // Store temporarily
        // mfaEnforcedAt stays null until verified
      }
    });

    // Log audit
    await logAudit({
      action: 'MFA_SETUP_STARTED',
      entity: 'User',
      entityId: userId,
      userId,
      userEmail,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || 'Unknown',
      details: { step: 'setup_initiated' },
      flagged: true
    });

    res.json({
      base32: secretObj.base32,
      qrDataUrl: qrCodeDataUrl,
      backupCodes, // Frontend should show these for user to save
      otpauthUrl: secretObj.otpauth_url
    });
  } catch (error) {
    console.error('[mfa] setup failed:', error);
    res.status(500).json({ error: 'MFA setup failed' });
  }
});

/**
 * POST /api/mfa/verify
 * Verify TOTP token and complete MFA setup
 * Body: { token, base32 }
 */
router.post('/verify', tempAuthGuard, async (req, res) => {
  try {
    const { token, base32 } = req.body;
    const userId = req.user.id;

    if (!token || !base32) {
      return res.status(400).json({ error: 'Token and base32 secret required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaEnforcedAt: true, email: true, name: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.mfaSecret) {
      return res.status(400).json({ error: 'No MFA setup in progress. Start setup first.' });
    }

    if (user.mfaEnforcedAt) {
      return res.status(400).json({ error: 'MFA already enabled' });
    }

    // Verify TOTP token
    const isValid = verifyTOTP(token, user.mfaSecret);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    // Enable MFA
    const now = new Date();
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnforcedAt: now
      }
    });

    // Log audit
    await logAudit({
      action: 'MFA_ENABLED',
      entity: 'User',
      entityId: userId,
      userId,
      userEmail: user.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || 'Unknown',
      details: { enabledAt: now },
      flagged: true
    });

    // Create session token if this was from temp setup
    const jwt = require('jsonwebtoken');
    const sessionToken = jwt.sign(
      { sub: userId, email: user.email },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    // Create session record for authGuard validation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    
    await prisma.session.create({
      data: {
        userId,
        refreshTokenHash: sessionToken,
        userAgent: req.get('user-agent') || 'Unknown',
        ip: req.ip || 'Unknown',
        deviceId: null, // No device tracking for MFA setup flow
        expiresAt
      }
    });

    // Set cookie so the browser is logged in immediately after enabling MFA
    res.cookie('token', sessionToken, {
      httpOnly: true,
      sameSite: process.env.COOKIE_SAME_SITE || 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      path: '/',
      maxAge: 7 * 24 * 3600 * 1000
    });

    res.json({ 
      ok: true, 
      message: 'MFA enabled successfully',
      token: sessionToken,
      enabledAt: now
    });
  } catch (error) {
    console.error('[mfa] verify failed:', error);
    res.status(500).json({ error: 'MFA verification failed' });
  }
});

/**
 * POST /api/mfa/disable
 * DISABLED - Users cannot disable MFA themselves
 * Only superadmins can disable MFA via Admin Panel
 */
router.post('/disable', authGuard, async (req, res) => {
  return res.status(403).json({ 
    error: 'MFA cannot be disabled by users. MFA is mandatory for all accounts. Contact your administrator if you need assistance.' 
  });
});

/**
 * POST /api/mfa/verify-login
 * Verify MFA token during login
 * Body: { tempToken, totpToken }
 * Returns: { ok: true, token } with full session
 */
router.post('/verify-login', async (req, res) => {
  try {
    const { tempToken, totpToken, trustDevice = false } = req.body;

    if (!tempToken || !totpToken) {
      return res.status(400).json({ error: 'Temporary token and TOTP token required' });
    }

    // Verify temp token
    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'dev-secret');
    } catch {
      return res.status(401).json({ error: 'Invalid or expired temporary token' });
    }

    if (decoded.type !== 'mfa-pending') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    const userId = decoded.userId;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
          name: true,
        mfaSecret: true,
        role: { select: { code: true } },
        department: { select: { name: true } }
      }
    });

    if (!user || !user.mfaSecret) {
      return res.status(401).json({ error: 'Invalid user or MFA not configured' });
    }

    // Verify TOTP
    const isValid = verifyTOTP(totpToken, user.mfaSecret);

    if (!isValid) {
      // Log failed attempt
      await logAudit({
        action: 'MFA_LOGIN_FAILED',
        entity: 'User',
        entityId: userId,
        userId,
        userEmail: user.email,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || 'Unknown',
        details: { reason: 'invalid_token' },
        flagged: true
      });

      return res.status(401).json({ error: 'Invalid MFA code' });
    }

    // Generate full access token
    const token = jwt.sign(
      {
        sub: userId,
        email: user.email,
        role: user.role?.code || 'User',
        department: user.department?.name
      },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: process.env.ACCESS_TOKEN_TTL_MIN ? `${process.env.ACCESS_TOKEN_TTL_MIN}m` : '15m' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { sub: userId, type: 'refresh' },
      process.env.REFRESH_SECRET || 'dev-refresh-secret',
      { expiresIn: process.env.REFRESH_TOKEN_TTL_DAYS ? `${process.env.REFRESH_TOKEN_TTL_DAYS}d` : '14d' }
    );

    // Create device record
    const { generateDeviceFingerprint } = require('../lib/deviceFingerprint');
    const fingerprint = generateDeviceFingerprint(req);
    const ipAddress = req.ip || req.connection?.remoteAddress || 'Unknown';

    const device = await prisma.device.create({
      data: {
        userId,
        fingerprint,
        ip: ipAddress,
        userAgent: req.get('user-agent') || 'Unknown',
        trusted: trustDevice,
        lastUsedAt: new Date()
      }
    });

    // Create session
    const bcrypt = require('bcryptjs');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const ttlDays = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '14', 10);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        userAgent: req.get('user-agent') || 'Unknown',
        ip: ipAddress,
        deviceId: device.id,
        expiresAt
      }
    });

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: process.env.COOKIE_SAME_SITE || 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      path: '/',
      maxAge: ttlDays * 24 * 3600 * 1000
    });

    // Log successful MFA login
    await logAudit({
      action: 'MFA_LOGIN_SUCCESS',
      entity: 'User',
      entityId: userId,
      userId,
      userEmail: user.email,
      ipAddress,
      userAgent: req.get('user-agent') || 'Unknown',
      details: { 
        deviceId: device.id, 
        deviceTrusted: trustDevice
      },
      flagged: false
    });

    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
          name: user.name,
        role: user.role?.code,
        department: user.department?.name
      }
    });
  } catch (error) {
    console.error('[mfa] verify-login failed:', error);
    res.status(500).json({ error: 'MFA login verification failed' });
  }
});

module.exports = router;
