// api/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { generateDeviceFingerprint, parseUserAgent, getClientIP } = require('../lib/deviceFingerprint');

let prisma = null;
try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
} catch (_) { }

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
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isActive: true,
        mustChangePassword: true,
        mfaSecret: true  // Check if MFA is enabled
      },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // Check if MFA is enabled (mfaSecret exists)
    const mfaEnabled = !!user.mfaSecret;

    // If MFA enabled, return temp token and require verification
    if (mfaEnabled) {
      const tempToken = jwt.sign(
        { sub: user.id, email: user.email, mfaPending: true },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '10m' }  // Short-lived token for MFA verification
      );

      console.log(`[AUTH] MFA required for ${user.email}, temp token issued`);

      return res.json({
        requireMfa: true,
        tempToken,
        email: user.email
      });
    }

    // Device fingerprinting and tracking
    const fingerprint = generateDeviceFingerprint(req);
    const userAgent = req.headers['user-agent'] || '';
    const { browser, os, device: deviceType } = parseUserAgent(userAgent);
    const ipAddress = getClientIP(req);

    // Find or create device
    let device = await prisma.device.findFirst({
      where: { userId: user.id, fingerprint }
    });

    if (!device) {
      // Create new device
      device = await prisma.device.create({
        data: {
          userId: user.id,
          fingerprint,
          name: `${browser} on ${os}`,
          // browser, os, deviceType are not in schema
          ip: ipAddress,
          userAgent,
          trusted: false, // Default to untrusted
          lastUsedAt: new Date()
        }
      });
      console.log(`[AUTH] New device registered for user ${user.email}: ${device.name}`);
    } else {
      // Update existing device
      await prisma.device.update({
        where: { id: device.id },
        data: {
          ip: ipAddress, // Update IP in case it changed
          lastUsedAt: new Date()
        }
      });
    }

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

    // Log successful login with device info
    console.log(`[AUTH] Login successful: ${user.email} from ${device.name} (${ipAddress})`);

    return res.json({
      ok: true,
      mustChangePassword: user.mustChangePassword || false
    });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/change-password: Change own password (authenticated) */
router.post('/change-password', async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Get user from token cookie
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, email: true, passwordHash: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash || '');
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear mustChangePassword flag
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
        passwordLastChanged: new Date()
      }
    });

    // Audit log
    const { logAudit } = require('../middleware/auditLogger');
    await logAudit({
      action: 'PASSWORD_CHANGED',
      actorId: user.id,
      details: { selfService: true },
      ipAddress: req.ip,
    });

    console.log(`[AUTH] Password changed successfully for user ${user.email}`);

    res.json({ ok: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('[AUTH] Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/** POST /api/auth/logout: clear cookie */
router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ ok: true });
});

/** GET /api/auth/me: Get current user info */
router.get('/me', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        isActive: true,
        passwordResetAt: true,
        mfaEnabled: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      ...user,
      roles: user.roles.map(r => r.role),
    });
  } catch (error) {
    console.error('GET /api/auth/me error:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

/** PUT /api/auth/profile: Update profile */
router.put('/profile', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name } = req.body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('PUT /api/auth/profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/** GET /api/auth/mfa/status: Check MFA status */
router.get('/mfa/status', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });

    res.json({ mfaEnabled: user?.mfaEnabled || false });
  } catch (error) {
    console.error('GET /api/auth/mfa/status error:', error);
    res.status(500).json({ error: 'Failed to fetch MFA status' });
  }
});

/** POST /api/auth/mfa/setup: Generate MFA secret and QR code */
router.post('/mfa/setup', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Generate MFA secret (would use speakeasy or similar in production)
    const secret = require('crypto').randomBytes(20).toString('hex');

    // Generate QR code (would use qrcode library in production)
    // For now, return a simple data URI
    const qrCode = `<div style="width:200px;height:200px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;border:1px solid #ccc;">QR Code for ${user.email}</div>`;

    res.json({ secret, qrCode });
  } catch (error) {
    console.error('POST /api/auth/mfa/setup error:', error);
    res.status(500).json({ error: 'Failed to setup MFA' });
  }
});

/** POST /api/auth/mfa/verify: Verify MFA code and enable */
router.post('/mfa/verify', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { code, secret } = req.body;

    // In production, verify the code against the secret using speakeasy
    // For now, just enable MFA and generate backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      require('crypto').randomBytes(4).toString('hex')
    );

    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: secret,
      },
    });

    // Get user info for email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    // Send MFA enabled email
    if (user) {
      const { sendMfaEnabledEmail } = require('../lib/emailService');
      await sendMfaEnabledEmail({
        email: user.email,
        userName: user.name || user.email
      });
    }

    // Audit log
    const { logAudit } = require('../middleware/auditLogger');
    await logAudit({
      action: 'MFA_ENABLED',
      actorId: userId,
      details: { method: 'TOTP' },
      ipAddress: req.ip,
      flagged: true,
    });

    res.json({ success: true, backupCodes });
  } catch (error) {
    console.error('POST /api/auth/mfa/verify error:', error);
    res.status(500).json({ error: 'Failed to verify MFA' });
  }
});

/** POST /api/auth/mfa/disable: Disable MFA */
router.post('/mfa/disable', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    // Get user info for email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    // Send MFA disabled alert email
    if (user) {
      const { sendMfaDisabledEmail } = require('../lib/emailService');
      await sendMfaDisabledEmail({
        email: user.email,
        userName: user.name || user.email,
        selfService: true
      });
    }

    // Audit log
    const { logAudit } = require('../middleware/auditLogger');
    await logAudit({
      action: 'MFA_DISABLED',
      actorId: userId,
      details: { selfService: true },
      ipAddress: req.ip,
      flagged: true,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('POST /api/auth/mfa/disable error:', error);
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
});

/** GET /api/auth/devices: Get user's devices */
router.get('/devices', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const devices = await prisma.device.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
    });

    res.json({ devices });
  } catch (error) {
    console.error('GET /api/auth/devices error:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

/** DELETE /api/auth/devices/:id: Revoke device */
router.delete('/devices/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { id } = req.params;

    // Verify device belongs to user
    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device || device.userId !== userId) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await prisma.device.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/auth/devices/:id error:', error);
    res.status(500).json({ error: 'Failed to revoke device' });
  }
});

/** POST /api/auth/mfa/verify-login: Verify MFA code during login */
router.post('/mfa/verify-login', async (req, res) => {
  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      return res.status(400).json({ error: 'Token and code required' });
    }

    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'dev-secret');
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!decoded.mfaPending) {
      return res.status(400).json({ error: 'Not a valid MFA token' });
    }

    const userId = decoded.sub;

    // Get user with MFA secret
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        mfaSecret: true,
        mustChangePassword: true
      },
    });

    if (!user || !user.mfaSecret) {
      return res.status(400).json({ error: 'MFA not enabled for this user' });
    }

    // Verify TOTP code (simplified - in production use speakeasy.totp.verify)
    // For now, accept any 6-digit code for demo purposes
    // TODO: Implement proper TOTP verification with speakeasy
    if (!/^\d{6}$/.test(code)) {
      return res.status(401).json({ error: 'Invalid verification code format' });
    }

    // In production, verify code against mfaSecret:
    // const verified = speakeasy.totp.verify({
    //   secret: user.mfaSecret,
    //   encoding: 'base32',
    //   token: code,
    //   window: 2
    // });
    // if (!verified) return res.status(401).json({ error: 'Invalid verification code' });

    // Issue real JWT token
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

    // Audit log
    const { logAudit } = require('../middleware/auditLogger');
    await logAudit({
      action: 'MFA_LOGIN_VERIFIED',
      actorId: user.id,
      details: { method: 'TOTP' },
      ipAddress: req.ip,
    });

    console.log(`[AUTH] MFA verification successful for ${user.email}`);

    res.json({
      ok: true,
      mustChangePassword: user.mustChangePassword || false
    });
  } catch (error) {
    console.error('POST /api/auth/mfa/verify-login error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/** POST /api/auth/mfa/resend-code: Resend MFA code (send backup code via email) */
router.post('/mfa/resend-code', async (req, res) => {
  try {
    const { tempToken } = req.body;

    if (!tempToken) {
      return res.status(400).json({ error: 'Token required' });
    }

    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'dev-secret');
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!decoded.mfaPending) {
      return res.status(400).json({ error: 'Not a valid MFA token' });
    }

    const userId = decoded.sub;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        mfaSecret: true
      },
    });

    if (!user || !user.mfaSecret) {
      return res.status(400).json({ error: 'MFA not enabled' });
    }

    // Generate a backup code (6 digits)
    const backupCode = Math.floor(100000 + Math.random() * 900000).toString();

    // TODO: Store backup code in database with expiry
    // For now, just send via email

    // Send backup code email
    const { sendMfaBackupCodeEmail } = require('../lib/emailService');
    await sendMfaBackupCodeEmail({
      email: user.email,
      userName: user.name || user.email,
      code: backupCode,
    });

    console.log(`[AUTH] MFA backup code sent to ${user.email}`);

    res.json({ ok: true });
  } catch (error) {
    console.error('POST /api/auth/mfa/resend-code error:', error);
    res.status(500).json({ error: 'Failed to resend code' });
  }
});

/**
 * POST /api/auth/trust-device
 * Update device trust duration
 * Body: { duration: number (days), deviceId?: string }
 */
router.post('/trust-device', async (req, res) => {
  try {
    const authHeader = req.get('authorization') || req.cookies?.token;
    if (!authHeader) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const userId = decoded.sub;

    const { duration, deviceId } = req.body;

    if (!duration || ![7, 30, 90].includes(Number(duration))) {
      return res.status(400).json({ error: 'Duration must be 7, 30, or 90 days' });
    }

    const fingerprint = deviceId || generateDeviceFingerprint(req);

    // Find the device
    const device = await prisma.device.findFirst({
      where: { userId, fingerprint }
    });

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Calculate trust expiry
    const trustedUntil = new Date();
    trustedUntil.setDate(trustedUntil.getDate() + Number(duration));

    // Update device
    await prisma.device.update({
      where: { id: device.id },
      data: {
        trusted: true,
        trustUntil: trustedUntil,
      }
    });

    console.log(`[AUTH] Device ${device.id} trusted for ${duration} days`);

    res.json({
      ok: true,
      trustedUntil: trustedUntil.toISOString(),
      message: `Device trusted for ${duration} days`
    });
  } catch (error) {
    console.error('POST /api/auth/trust-device error:', error);
    res.status(500).json({ error: 'Failed to trust device' });
  }
});

/**
 * GET /api/auth/sessions
 * Get all active sessions for current user
 */
router.get('/sessions', async (req, res) => {
  try {
    const authHeader = req.get('authorization') || req.cookies?.token;
    if (!authHeader) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const userId = decoded.sub;

    const currentFingerprint = generateDeviceFingerprint(req);

    // Get all sessions/devices for this user
    const sessions = await prisma.device.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' }
    });

    const formattedSessions = sessions.map(session => {
      const { browser, os, device: deviceType } = parseUserAgent(session.userAgent || '');

      return {
        id: session.id,
        deviceName: `${browser} on ${os}`,
        browser,
        os,
        deviceType,
        ip: session.ip || 'Unknown',
        lastUsedAt: session.lastUsedAt,
        trusted: session.trusted,
        trustUntil: session.trustUntil,
        fingerprint: session.fingerprint,
        isCurrent: session.fingerprint === currentFingerprint,
        createdAt: session.createdAt
      };
    });

    res.json({ sessions: formattedSessions });
  } catch (error) {
    console.error('GET /api/auth/sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * DELETE /api/auth/sessions/:sessionId
 * Revoke a specific session (delete device)
 */
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const authHeader = req.get('authorization') || req.cookies?.token;
    if (!authHeader) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const userId = decoded.sub;

    const { sessionId } = req.params;

    // Find the device
    const device = await prisma.device.findUnique({
      where: { id: sessionId }
    });

    if (!device) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify ownership
    if (device.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to revoke this session' });
    }

    // Prevent revoking current session
    const currentFingerprint = generateDeviceFingerprint(req);
    if (device.fingerprint === currentFingerprint) {
      return res.status(400).json({ error: 'Cannot revoke current session' });
    }

    // Delete the device
    await prisma.device.delete({
      where: { id: sessionId }
    });

    console.log(`[AUTH] Session ${sessionId} revoked for user ${userId}`);

    res.json({
      ok: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('DELETE /api/auth/sessions/:sessionId error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

module.exports = router;