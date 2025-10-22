// api/routes/audit.js
const express = require('express');
const authGuard = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');
const { getAuditLogs } = require('../middleware/auditLogger');

const router = express.Router();

// Get audit logs (Super Admin only)
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
      offset: parseInt(offset)
    });
    
    res.json(result);
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
      offset: parseInt(offset)
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching flagged logs:', error);
    res.status(500).json({ error: 'Failed to fetch flagged logs' });
  }
});

// Get user's own audit trail
router.get('/audit-logs/me', authGuard, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await getAuditLogs({
      actorId: req.auth.user.id,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = { auditRouter: router };

