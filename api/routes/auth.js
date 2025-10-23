// api/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { logAudit } = require('../middleware/auditLogger');

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
      where: { email: String(email).toLowerCase().trim() },
      select: { 
        id: true, 
        email: true, 
        passwordHash: true, 
        isActive: true,
        status: true,
        mustChangePassword: true 
      },
    });
    
    console.log('[LOGIN] User found:', user ? { id: user.id, email: user.email, status: user.status, isActive: user.isActive } : 'NOT FOUND');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if user is still pending invitation acceptance
    if (user.status === 'PENDING') {
      console.log('[LOGIN] User status is PENDING - blocking login');
      return res.status(401).json({ 
        error: 'Please accept your invitation email first to activate your account' 
      });
    }

    const argon2 = require('argon2');
    let ok = false;
    try {
      ok = await argon2.verify(user.passwordHash || '', password);
    } catch (e) {
      ok = false;
    }
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // Check if MFA is enabled for this user
    const userWithMFA = await prisma.user.findUnique({
      where: { id: user.id },
      select: { 
        mfaSecret: true, 
        mfaEnforcedAt: true,
        name: true,
        roles: {
          include: {
            role: { 
              select: { 
                id: true,
                name: true 
              } 
            }
          }
        },
        department: { select: { name: true } }
      }
    });

    // If MFA is set up and enforced, require verification
    if (userWithMFA.mfaSecret && userWithMFA.mfaEnforcedAt) {
      const tempToken = jwt.sign(
        { 
          userId: user.id, 
          type: 'mfa-pending'
        },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '5m' } // Short-lived temp token
      );

      return res.json({
        requiresMfa: true,
        tempToken,
        message: 'MFA verification required'
      });
    }

    // If MFA is not set up yet, require setup (mandatory for all users)
    if (!userWithMFA.mfaSecret) {
      const tempToken = jwt.sign(
        { 
          userId: user.id, 
          type: 'mfa-setup-required'
        },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '10m' } // Time to complete setup
      );

      return res.json({
        requiresMfaSetup: true,
        tempToken,
        message: 'MFA setup required for security'
      });
    }

    // Create or update device fingerprint
    const { generateDeviceFingerprint, getClientIP } = require('../lib/deviceFingerprint');
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = getClientIP(req);
    const fingerprint = generateDeviceFingerprint(req);
    
    // Parse user agent for device info
    const getBrowserInfo = (ua) => {
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Safari')) return 'Safari';
      if (ua.includes('Edge')) return 'Edge';
      return 'Unknown';
    };
    
    const getOSInfo = (ua) => {
      if (ua.includes('Windows')) return 'Windows';
      if (ua.includes('Mac')) return 'MacOS';
      if (ua.includes('Linux')) return 'Linux';
      if (ua.includes('Android')) return 'Android';
      if (ua.includes('iOS')) return 'iOS';
      return 'Unknown';
    };
    
    const browser = getBrowserInfo(userAgent);
    const os = getOSInfo(userAgent);
    const deviceType = userAgent.includes('Mobile') ? 'Mobile' : 'Desktop';
    
    // Find or create device
    let device = await prisma.device.findFirst({
      where: {
        userId: user.id,
        fingerprint
      }
    });
    
    if (!device) {
      // Create new device
      try {
        device = await prisma.device.create({
          data: {
            userId: user.id,
            fingerprint,
            name: `${browser} on ${os}`,
            ip: ipAddress,
            userAgent,
            trusted: false,
            lastUsedAt: new Date()
          }
        });
        console.log('[LOGIN] Device created:', device.id);
      } catch (deviceError) {
        console.error('[LOGIN] Failed to create device:', deviceError);
        // Continue without device - don't block login
        device = null;
      }
    } else {
      // Update existing device
      try {
        await prisma.device.update({
          where: { id: device.id },
          data: {
            lastUsedAt: new Date(),
            ip: ipAddress, // Update IP if changed
            userAgent
          }
        });
        console.log('[LOGIN] Device updated:', device.id);
      } catch (deviceError) {
        console.error('[LOGIN] Failed to update device:', deviceError);
      }
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

    // Create session for tracking
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
      
      await prisma.session.create({
        data: {
          userId: user.id,
          refreshTokenHash: token, // Using JWT token as the session identifier
          userAgent,
          ip: ipAddress,
          deviceId: device?.id,
          expiresAt
        }
      });
      console.log('[LOGIN] Session created for device:', device?.id);
    } catch (sessionError) {
      console.error('[LOGIN] Failed to create session:', sessionError);
    }

    // Log successful login
    try {
      await logAudit({
        actorId: user.id,
        action: 'LOGIN',
        entity: 'USER',
        entityId: user.id,
        meta: { browser, os, deviceType },
        ip: ipAddress,
        userAgent,
        deviceId: device?.id
      });
      console.log('[LOGIN] Audit log created for user:', user.email);
    } catch (auditError) {
      console.error('[LOGIN] Failed to create audit log:', auditError);
    }

    return res.json({ 
      ok: true,
      mustChangePassword: user.mustChangePassword || false 
    });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/logout: clear cookie and delete session */
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.token;
    
    // Delete session if token exists
    if (token && prisma) {
      await prisma.session.deleteMany({
        where: { refreshTokenHash: token }
      });
      console.log('[LOGOUT] Session deleted');
    }
    
    res.clearCookie('token', { path: '/' });
    res.json({ ok: true });
  } catch (error) {
    console.error('[LOGOUT] Error:', error);
    res.clearCookie('token', { path: '/' });
    res.json({ ok: true });
  }
});

/**
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword }
 * Changes the user's password and clears mustChangePassword flag
 */
router.post('/change-password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!prisma) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, passwordHash: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash || '');
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Check that new password is different
    const isSame = await bcrypt.compare(newPassword, user.passwordHash || '');
    if (isSame) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 12);

    // Update password and clear mustChangePassword flag
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    // Log the password change
    await logAudit({
      actorId: user.id,
      action: 'PASSWORD_CHANGED',
      entity: 'USER',
      entityId: user.id,
      meta: { reason: 'User changed password (force change cleared)' },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ ok: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Initiates password reset flow:
 * - If user has MFA enabled: Send reset token via email, requires MFA code to complete reset
 * - If user has no MFA: Admin must reset manually (security requirement)
 */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email = '' } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        isActive: true,
        mfaSecret: true,
        mfaEnforcedAt: true
      }
    });

    // Always return success to prevent email enumeration
    const successResponse = { 
      ok: true, 
      message: 'If an account exists with this email, you will receive password reset instructions.' 
    };

    if (!user || user.status !== 'ACTIVE' || !user.isActive) {
      // Don't reveal if user exists
      return res.json(successResponse);
    }

    // Check if user has MFA enabled
    const hasMFA = !!(user.mfaSecret && user.mfaEnforcedAt);

    if (!hasMFA) {
      // User doesn't have MFA - send email instructing to contact admin
      const { emailService } = require('../lib/emailService');
      const result = await emailService.sendTemplate({
        to: user.email,
        templateName: 'password-reset-no-mfa',
        data: {
          name: user.name || user.email,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@pramara.com'
        },
        userId: null // System email
      });
      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Email sending is currently disabled by admin.' });
      }
      // Log the attempt
      await logAudit({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED_NO_MFA',
        details: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        outcome: 'success'
      });
      return res.json(successResponse);
    }

    // User has MFA - generate reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setMinutes(resetExpires.getMinutes() + 15); // 15 minute expiry

    // Save reset token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        inviteToken: resetToken, // Reuse inviteToken field for password reset
        inviteExpires: resetExpires
      }
    });

    // Send reset email
    const { emailService } = require('../lib/emailService');
    const resetUrl = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    const result = await emailService.sendTemplate({
      to: user.email,
      templateName: 'password-reset-mfa',
      data: {
        name: user.name || user.email,
        resetUrl,
        expiryMinutes: 15
      },
      userId: null // System email
    });
    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Email sending is currently disabled by admin.' });
    }

    // Log the reset request
    await logAudit({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      details: { email: user.email },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      outcome: 'success'
    });

    res.json(successResponse);
  } catch (err) {
    console.error('[FORGOT_PASSWORD] Error:', err);
    next(err);
  }
});

/**
 * POST /api/auth/reset-password
 * Body: { token, password, mfaCode }
 * Resets password using token from email + MFA code
 */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password, mfaCode } = req.body || {};

    if (!token || !password || !mfaCode) {
      return res.status(400).json({ error: 'Token, password, and MFA code are required' });
    }

    if (!prisma) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return res.status(400).json({ 
        error: 'Password must contain uppercase, lowercase, number, and special character' 
      });
    }

    // Find user with this reset token
    const user = await prisma.user.findFirst({
      where: {
        inviteToken: token,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        email: true,
        name: true,
        mfaSecret: true,
        mfaEnforcedAt: true,
        inviteExpires: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Invalid or expired reset token' });
    }

    // Check if expired
    if (user.inviteExpires && new Date() > new Date(user.inviteExpires)) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }

    // Verify MFA is enabled
    if (!user.mfaSecret || !user.mfaEnforcedAt) {
      return res.status(400).json({ error: 'MFA is required for password reset' });
    }

    // Verify MFA code
    const speakeasy = require('speakeasy');
    const isValidMFA = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: mfaCode,
      window: 2
    });

    if (!isValidMFA) {
      // Log failed attempt
      await logAudit({
        userId: user.id,
        action: 'PASSWORD_RESET_FAILED',
        details: { email: user.email, reason: 'Invalid MFA code' },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        outcome: 'failure'
      });

      return res.status(401).json({ error: 'Invalid MFA code' });
    }

    // Hash new password
    const argon2 = require('argon2');
    const passwordHash = await argon2.hash(password);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        inviteToken: null,
        inviteExpires: null,
        mustChangePassword: false,
        passwordResetAt: new Date(),
        passwordResetMethod: 'self-service'
      }
    });

    // Invalidate all existing sessions for security
    await prisma.session.deleteMany({
      where: { userId: user.id }
    });

    // Log successful reset
    await logAudit({
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      details: { email: user.email, method: 'self-service' },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      outcome: 'success'
    });

    res.json({ 
      ok: true, 
      message: 'Password reset successfully. Please log in with your new password.' 
    });
  } catch (err) {
    console.error('[RESET_PASSWORD] Error:', err);
    next(err);
  }
});

module.exports = router;