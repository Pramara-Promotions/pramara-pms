// api/routes/invitations.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const { logAudit } = require('../middleware/auditLogger');
const { getClientIP } = require('../lib/deviceFingerprint');

const prisma = new PrismaClient();
const router = express.Router();

// Validate invitation token
router.get('/invite/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const user = await prisma.user.findFirst({
      where: {
        inviteToken: token,
        inviteExpires: {
          gte: new Date()
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        createdById: true,
        User: {
          select: {
            name: true,
            email: true
          }
        },
        roles: {
          select: {
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }
    
    res.json({ 
      valid: true,
      email: user.email,
      name: user.name,
      inviterName: user.User?.name || user.User?.email || 'Admin',
      roles: user.roles.map(ur => ur.role.name)
    });
  } catch (error) {
    console.error('Error validating invite:', error);
    res.status(500).json({ error: 'Failed to validate invitation' });
  }
});

// Accept invitation and set password
router.post('/invite/:token/accept', async (req, res) => {
  try {
    const { token } = req.params;
    const { password, name } = req.body;
    
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    const user = await prisma.user.findFirst({
      where: {
        inviteToken: token,
        inviteExpires: {
          gte: new Date()
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }
    
    // Update user: set password, clear invite token, activate account
    const passwordHash = await argon2.hash(password);
    
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        name: name || user.name,
        inviteToken: null,
        inviteExpires: null,
        status: 'ACTIVE',
        isActive: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true
      }
    });
    
    // Log the action
    await logAudit({
      actorId: user.id,
      action: 'USER_INVITE_ACCEPTED',
      entity: 'USER',
      entityId: user.id,
      changes: { activated: true },
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      result: 'SUCCESS'
    });
    
    res.json({ 
      success: true,
      message: 'Account activated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// Resend invitation (admin only)
router.post('/invite/:userId/resend', async (req, res) => {
  try {
    // TODO: Add auth guard and permission check
    const { userId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.status === 'ACTIVE') {
      return res.status(400).json({ error: 'User is already active' });
    }
    
    const { generateInviteToken, sendInvitationEmail } = require('../lib/emailService');
    
    // Generate new token
    const inviteToken = generateInviteToken();
    const inviteExpires = new Date();
    inviteExpires.setDate(inviteExpires.getDate() + 7);
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        inviteToken,
        inviteExpires
      }
    });
    
    // Send email
    const inviteUrl = `${process.env.APP_URL || 'http://localhost:5173'}/invite/${inviteToken}`;
    await sendInvitationEmail({
      email: user.email,
      inviteUrl,
      inviterName: 'Admin'
    });
    
    res.json({ success: true, message: 'Invitation resent' });
  } catch (error) {
    console.error('Error resending invite:', error);
    res.status(500).json({ error: 'Failed to resend invitation' });
  }
});

module.exports = { invitationsRouter: router };
