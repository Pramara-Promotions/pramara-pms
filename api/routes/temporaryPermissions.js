// api/routes/temporaryPermissions.js
const express = require('express');
const authGuard = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');
const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../middleware/auditLogger');
const { getClientIP } = require('../lib/deviceFingerprint');

const prisma = new PrismaClient();
const router = express.Router();

// List temporary permissions for a user
router.get('/users/:userId/temp-permissions', authGuard, permissionGuard('USER_VIEW'), async (req, res) => {
  try {
    const permissions = await prisma.temporaryPermission.findMany({
      where: {
        userId: req.params.userId,
        status: { in: ['ACTIVE', 'EXPIRED'] }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching temp permissions:', error);
    res.status(500).json({ error: 'Failed to fetch temporary permissions' });
  }
});

// Grant temporary permission
router.post('/users/:userId/temp-permissions', authGuard, permissionGuard('USER_EDIT'), async (req, res) => {
  try {
    const { permissionCode, startDate, endDate, reason } = req.body;
    
    if (!permissionCode || !endDate) {
      return res.status(400).json({ error: 'permissionCode and endDate are required' });
    }
    
    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(endDate);
    
    if (end <= start) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }
    
    // Check if permission exists
    const permission = await prisma.permission.findUnique({
      where: { code: permissionCode }
    });
    
    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const tempPerm = await prisma.temporaryPermission.create({
      data: {
        userId: req.params.userId,
        permissionCode,
        startDate: start,
        endDate: end,
        grantedBy: req.auth.user.id,
        reason: reason || null,
        status: 'ACTIVE'
      }
    });
    
    // Log the action
    await logAudit({
      actorId: req.auth.user.id,
      action: 'PERMISSION_GRANT_TEMPORARY',
      entity: 'TEMPORARY_PERMISSION',
      entityId: tempPerm.id,
      changes: { granted: tempPerm },
      meta: { userId: req.params.userId, permissionCode, endDate },
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      result: 'SUCCESS'
    });
    
    res.status(201).json(tempPerm);
  } catch (error) {
    console.error('Error granting temp permission:', error);
    res.status(500).json({ error: 'Failed to grant temporary permission' });
  }
});

// Revoke temporary permission
router.delete('/temp-permissions/:id', authGuard, permissionGuard('USER_EDIT'), async (req, res) => {
  try {
    const tempPerm = await prisma.temporaryPermission.findUnique({
      where: { id: req.params.id }
    });
    
    if (!tempPerm) {
      return res.status(404).json({ error: 'Temporary permission not found' });
    }
    
    await prisma.temporaryPermission.update({
      where: { id: req.params.id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date()
      }
    });
    
    // Log the action
    await logAudit({
      actorId: req.auth.user.id,
      action: 'PERMISSION_REVOKE_TEMPORARY',
      entity: 'TEMPORARY_PERMISSION',
      entityId: req.params.id,
      changes: { revoked: tempPerm },
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      result: 'SUCCESS'
    });
    
    res.json({ message: 'Temporary permission revoked' });
  } catch (error) {
    console.error('Error revoking temp permission:', error);
    res.status(500).json({ error: 'Failed to revoke temporary permission' });
  }
});

// Auto-expire job (to be called by a cron job or scheduled task)
router.post('/temp-permissions/expire-check', authGuard, permissionGuard.role('Super Admin'), async (req, res) => {
  try {
    const now = new Date();
    
    const result = await prisma.temporaryPermission.updateMany({
      where: {
        status: 'ACTIVE',
        endDate: { lte: now }
      },
      data: {
        status: 'EXPIRED'
      }
    });
    
    res.json({ message: `Expired ${result.count} temporary permissions` });
  } catch (error) {
    console.error('Error expiring temp permissions:', error);
    res.status(500).json({ error: 'Failed to expire temporary permissions' });
  }
});

// Get expiring soon permissions (for notifications)
router.get('/temp-permissions/expiring-soon', authGuard, permissionGuard('USER_VIEW'), async (req, res) => {
  try {
    const daysAhead = parseInt(req.query.days) || 2;
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    const permissions = await prisma.temporaryPermission.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: now,
          lte: futureDate
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: { endDate: 'asc' }
    });
    
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching expiring permissions:', error);
    res.status(500).json({ error: 'Failed to fetch expiring permissions' });
  }
});

module.exports = { temporaryPermissionsRouter: router };

