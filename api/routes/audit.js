// api/routes/audit.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authGuard = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');
const { getAuditLogs, AUDIT_CONFIG } = require('../middleware/auditLogger');

const prisma = new PrismaClient();
const router = express.Router();

// Get audit logs (Super Admin only - can see all logs)
router.get('/audit-logs', authGuard, permissionGuard.role('Super Admin'), async (req, res) => {
  try {
    const {
      actorId,
      action,
      entity,
      flagged,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = req.query;
    
    const result = await getAuditLogs({
      actorId,
      action,
      entity,
      flaggedOnly: flagged === 'true',
      startDate,
      endDate,
      limit: parseInt(limit),
      offset: parseInt(offset),
      userRetentionDays: null, // Super Admin has no retention limit
      isSuperAdmin: true
    });
    
    // Add security info to response
    res.json({
      ...result,
      securityNotice: {
        minimumRetentionDays: AUDIT_CONFIG.MINIMUM_RETENTION_DAYS,
        message: `Audit logs are retained indefinitely for Super Admins. Minimum retention is ${AUDIT_CONFIG.MINIMUM_RETENTION_DAYS} days (system-enforced). Logs cannot be deleted via API.`,
        canDelete: false
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get flagged actions (Super Admin only)
router.get('/audit-logs/flagged', authGuard, permissionGuard.role('Super Admin'), async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await getAuditLogs({
      flaggedOnly: true,
      limit: parseInt(limit),
      offset: parseInt(offset),
      isSuperAdmin: true
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching flagged logs:', error);
    res.status(500).json({ error: 'Failed to fetch flagged logs' });
  }
});

// Get user's own audit trail (respects user retention period)
router.get('/audit-logs/me', authGuard, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    // Get user's retention period from database
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { auditRetentionDays: true }
    });
    
    const result = await getAuditLogs({
      actorId: req.user?.id,
      limit: parseInt(limit),
      offset: parseInt(offset),
      userRetentionDays: user?.auditRetentionDays || AUDIT_CONFIG.DEFAULT_RETENTION_DAYS,
      isSuperAdmin: false
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = { auditRouter: router };

