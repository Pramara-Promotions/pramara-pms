// api/middleware/auditLogger.js
const { PrismaClient } = require('@prisma/client');
const { getClientIP } = require('../lib/deviceFingerprint');

const prisma = new PrismaClient();

// CRITICAL SECURITY POLICY: Audit log configuration
// These settings are IMMUTABLE and cannot be changed via API
const AUDIT_CONFIG = Object.freeze({
  MINIMUM_RETENTION_DAYS: 15,    // Hardcoded minimum - cannot be less (enforced system-wide)
  ALLOW_DELETE: false,            // NEVER allow deletion (only manual server cleanup allowed)
  ALLOW_UPDATE: false,            // Logs are immutable
  DEFAULT_RETENTION_DAYS: 90,     // Default retention for new users
  MAX_RETENTION_DAYS: 365,        // Maximum allowed retention
});

// Actions that should be flagged for Super Admin review
const FLAGGED_ACTIONS = [
  'USER_CREATE_WITH_ADMIN_PERMS',
  'USER_DELETE',
  'ROLE_CREATE_CUSTOM',
  'BULK_OPERATION',
  'MFA_DISABLED',
  'MFA_RESET',
  'PERMISSION_GRANT_OUT_OF_SCOPE',
  'DEVICE_FORCE_LOGOUT',
  'AUDIT_RETENTION_CHANGED',      // Always flag audit setting changes
  'SECURITY_POLICY_CHANGED'
];

/**
 * Log an audit event
 * @param {Object} params - Audit log parameters
 * @param {string} params.actorId - User ID performing the action
 * @param {string} params.action - Action being performed
 * @param {string} params.entity - Entity type (USER, ROLE, PERMISSION, etc.)
 * @param {string} params.entityId - ID of the entity being acted upon
 * @param {Object} params.changes - Before/after state
 * @param {Object} params.meta - Additional metadata
 * @param {string} params.ip - IP address
 * @param {string} params.userAgent - User agent string
 * @param {string} params.deviceId - Device ID
 * @param {string} params.result - SUCCESS or FAILURE
 */
async function logAudit({
  actorId,
  action,
  entity,
  entityId = null,
  changes = null,
  meta = null,
  ip = null,
  userAgent = null,
  deviceId = null,
  result = 'SUCCESS'
}) {
  try {
    const flagged = FLAGGED_ACTIONS.includes(action);
    
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entity,
        entityId,
        changes,
        meta,
        ip,
        userAgent,
        deviceId,
        result,
        flagged
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging failure shouldn't break the app
  }
}

/**
 * Express middleware to automatically log certain routes
 * Usage: router.post('/users', auditMiddleware('USER_CREATE', 'USER'), handler)
 */
function auditMiddleware(action, entity) {
  return async (req, res, next) => {
    // Store original methods
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);
    
    let statusCode = 200;
    let responseData = null;
    
    // Override res.status to capture status code
    res.status = function(code) {
      statusCode = code;
      return originalStatus(code);
    };
    
    // Override res.json to capture response and log
    res.json = async function(data) {
      responseData = data;
      
      // Only log if authenticated
      if (req.auth?.user) {
        const result = statusCode >= 200 && statusCode < 300 ? 'SUCCESS' : 'FAILURE';
        
        await logAudit({
          actorId: req.auth.user.id,
          action,
          entity,
          entityId: data?.id || req.params?.id || null,
          changes: result === 'SUCCESS' ? { created: data } : null,
          meta: { 
            method: req.method, 
            path: req.path,
            body: req.body,
            statusCode
          },
          ip: getClientIP(req),
          userAgent: req.headers['user-agent'],
          deviceId: req.deviceId || null,
          result
        });
      }
      
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * Get audit logs with filtering
 * SECURITY: Respects user retention periods
 * - Regular users: See logs within their retention period
 * - Super Admin: See all logs (no retention limit)
 * - Nobody can delete logs (enforced by AUDIT_CONFIG)
 */
async function getAuditLogs({
  actorId = null,
  action = null,
  entity = null,
  flaggedOnly = false,
  startDate = null,
  endDate = null,
  limit = 100,
  offset = 0,
  userRetentionDays = null, // User's retention period (null for Super Admin = unlimited)
  isSuperAdmin = false
}) {
  const where = {};
  
  if (actorId) where.actorId = actorId;
  if (action) where.action = action;
  if (entity) where.entity = entity;
  if (flaggedOnly) where.flagged = true;
  
  // Apply user retention period (if not Super Admin)
  if (!isSuperAdmin && userRetentionDays) {
    const retentionCutoff = new Date();
    retentionCutoff.setDate(retentionCutoff.getDate() - userRetentionDays);
    
    where.createdAt = where.createdAt || {};
    where.createdAt.gte = retentionCutoff;
  }
  
  // Apply date filters if specified
  if (startDate || endDate) {
    where.createdAt = where.createdAt || {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }
  
  const logs = await prisma.auditLog.findMany({
    where,
    take: limit,
    skip: offset,
    orderBy: { createdAt: 'desc' },
    include: {
      actor: {
        select: {
          id: true,
          email: true,
          name: true
        }
      },
      device: {
        select: {
          id: true,
          name: true,
          fingerprint: true
        }
      }
    }
  });
  
  const total = await prisma.auditLog.count({ where });
  
  return { 
    logs, 
    total,
    retentionInfo: {
      minimumRetentionDays: AUDIT_CONFIG.MINIMUM_RETENTION_DAYS,
      userRetentionDays: userRetentionDays,
      isSuperAdmin: isSuperAdmin,
      canDelete: AUDIT_CONFIG.ALLOW_DELETE, // Always false
    }
  };
}

module.exports = {
  logAudit,
  auditMiddleware,
  getAuditLogs,
  FLAGGED_ACTIONS,
  AUDIT_CONFIG
};
