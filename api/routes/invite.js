// api/routes/invite.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { logAudit } = require('../middleware/auditLogger');
const { getClientIP } = require('../lib/deviceFingerprint');

const prisma = new PrismaClient();

/**
 * GET /api/invite/:token - Get invitation details
 */
router.get('/invite/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        inviteToken: token,
        status: 'PENDING'
      },
      select: {
        id: true,
        email: true,
        name: true,
        inviteExpires: true,
        createdBy: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    // Check if expired
    const isExpired = user.inviteExpires && new Date() > new Date(user.inviteExpires);

    res.json({
      email: user.email,
      name: user.name,
      inviterName: user.createdBy?.name || user.createdBy?.email || 'Admin',
      expiresAt: user.inviteExpires,
      isExpired
    });
  } catch (error) {
    console.error('[INVITE_INFO] Error:', error);
    res.status(500).json({ error: 'Failed to load invitation' });
  }
});

/**
 * POST /api/invite/:token/accept - Accept invitation and set password
 * Body: { password }
 */
router.post('/invite/:token/accept', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Validate password strength
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      return res.status(400).json({ 
        error: 'Password must contain uppercase, lowercase, number, and special character' 
      });
    }

    // Find user with this invite token
    const user = await prisma.user.findFirst({
      where: {
        inviteToken: token,
        status: 'PENDING'
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    // Check if expired
    if (user.inviteExpires && new Date() > new Date(user.inviteExpires)) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Hash password
    const passwordHash = await argon2.hash(password);

    // Update user: activate, clear invite token, set password
    console.log('[INVITE_ACCEPT] Updating user:', user.id, 'from status:', user.status);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status: 'ACTIVE',
        isActive: true,
        inviteToken: null,
        inviteExpires: null
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Create session
    console.log('[INVITE_ACCEPT] User updated successfully. New status:', updatedUser.status);
    console.log('[INVITE_ACCEPT] Creating session for user:', updatedUser.id);
    
    const sessionToken = jwt.sign(
      { userId: updatedUser.id },
      process.env.JWT_SECRET || 'dev-secret-key',
      { expiresIn: '7d' }
    );

    const session = await prisma.session.create({
      data: {
        userId: updatedUser.id,
        token: sessionToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    // Set cookie
    res.cookie('pramara_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Log audit
    await logAudit({
      userId: updatedUser.id,
      action: 'INVITE_ACCEPTED',
      details: { email: updatedUser.email },
      ipAddress: getClientIP(req),
      userAgent: req.get('user-agent'),
      outcome: 'success'
    });

    // Return user data
    res.json({
      ok: true,
      message: 'Account created successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        status: updatedUser.status,
        permissions: updatedUser.roles
          .flatMap(ur => ur.role.permissions.map(rp => rp.permission.code))
          .filter((v, i, a) => a.indexOf(v) === i) // unique
      }
    });

  } catch (error) {
    console.error('[INVITE_ACCEPT] Error:', error);
    
    // Log failed attempt
    await logAudit({
      action: 'INVITE_ACCEPTED',
      details: { token: req.params.token, error: error.message },
      ipAddress: getClientIP(req),
      userAgent: req.get('user-agent'),
      outcome: 'failure'
    });

    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

module.exports = router;
