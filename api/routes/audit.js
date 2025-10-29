// api/routes/audit.js
const express = require('express');
const authGuard = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');
const { getAuditLogs, AUDIT_CONFIG } = require('../middleware/auditLogger');

const router = express.Router();

// Get audit logs (Super Admin only - perpetual access)
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
      viewerId: req.auth.user.id,
      isSuperAdmin: true, // Super Admin sees all logs forever
      actorId,
      action,
      entity,
      flaggedOnly: flagged === 'true',
      startDate,
      endDate,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    console.log('[audit-logs] Super Admin viewing', result.logs?.length || 0, 'logs, total:', result.total);
    
    // Prevent caching - audit logs should always be fresh
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
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
      viewerId: req.auth.user.id,
      isSuperAdmin: true,
      flaggedOnly: true,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    console.log('[audit-logs/flagged] Returning', result.logs?.length || 0, 'logs, total:', result.total);
    
    // Prevent caching - audit logs should always be fresh
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json(result);
  } catch (error) {
    console.error('Error fetching flagged logs:', error);
    res.status(500).json({ error: 'Failed to fetch flagged logs' });
  }
});

// Get user's own audit trail (retention-limited)
router.get('/audit-logs/me', authGuard, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await getAuditLogs({
      viewerId: req.auth.user.id,
      isSuperAdmin: false, // User sees own logs within retention window
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Prevent caching - audit logs should always be fresh
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.json(result);
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get audit retention config (public endpoint for UI)
router.get('/audit-config', authGuard, (req, res) => {
  res.json(AUDIT_CONFIG);
});

module.exports = { auditRouter: router };

