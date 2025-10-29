// api/middleware/auditLogger.js
const { PrismaClient } = require('@prisma/client');
const { getClientIP } = require('../lib/deviceFingerprint');

const prisma = new PrismaClient();

// ============================================================================
// AUDIT RETENTION POLICY (IMMUTABLE - Security Requirement)
// ============================================================================
const AUDIT_CONFIG = Object.freeze({
  MINIMUM_RETENTION_DAYS: 15,     // System-wide minimum (immutable)
  DEFAULT_USER_RETENTION_DAYS: 30, // Default per-user retention
  MAXIMUM_USER_RETENTION_DAYS: 365, // Maximum per-user retention
  SUPERADMIN_PERPETUAL: true,      // Super Admin sees all logs forever
  ALLOW_DELETE: false,             // NEVER allow log deletion
  ALLOW_UPDATE: false,             // Logs are immutable
});

// Redaction: scrub sensitive keys from objects before persisting
const DEFAULT_REDACT_KEYS = [
  'password', 'passwordHash', 'token', 'inviteToken', 'secret', 'apiKey',
  'accessKey', 'secretAccessKey', 'authorization', 'auth', 'jwt', 'mfaSecret'
];

function redact(value, keys = DEFAULT_REDACT_KEYS) {
  try {
    if (!value || typeof value !== 'object') return value;
    const seen = new WeakSet();
    const walk = (v) => {
      if (!v || typeof v !== 'object') return v;
      if (seen.has(v)) return v;
      seen.add(v);
      if (Array.isArray(v)) return v.map(walk);
      const out = {};
      for (const [k, val] of Object.entries(v)) {
        if (keys.includes(k)) {
          out[k] = '[REDACTED]';
        } else if (typeof val === 'object' && val !== null) {
          out[k] = walk(val);
        } else {
          out[k] = val;
        }
      }
      return out;
    };
    return walk(value);
  } catch {
    return value;
  }
}

// Actions that should be flagged for Super Admin review
const FLAGGED_ACTIONS = [
  'USER_CREATE_WITH_ADMIN_PERMS',
  'USER_DELETE',
  'ROLE_CREATE_CUSTOM',
  'BULK_OPERATION',
  'MFA_DISABLED',
  'PERMISSION_GRANT_OUT_OF_SCOPE',
  'DEVICE_FORCE_LOGOUT'
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
    // Debug trace: lightweight, avoid dumping large payloads
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('[audit] write', {
          action,
          entity,
          entityId,
          actorId: actorId ? String(actorId) : null,
          result
        });
      } catch {}
    }

    const safeChanges = redact(changes);
    const safeMeta = redact(meta);

    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entity,
        entityId,
        changes: safeChanges,
        meta: safeMeta,
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
 * Get audit logs with filtering and per-user retention enforcement
 * @param {Object} options - Query options
 * @param {string} options.viewerId - User requesting the logs (for retention check)
 * @param {boolean} options.isSuperAdmin - Whether viewer is Super Admin
 * @param {string} options.actorId - Filter by actor (null = viewer's own logs unless Super Admin)
 */
async function getAuditLogs({
  viewerId = null,
  isSuperAdmin = false,
  actorId = null,
  action = null,
  entity = null,
  flaggedOnly = false,
  startDate = null,
  endDate = null,
  limit = 100,
  offset = 0
}) {
  const where = {};
  
  // RETENTION ENFORCEMENT
  if (!isSuperAdmin) {
    // Non-Super Admin: only see their own logs
    const effectiveActorId = actorId || viewerId;
    where.actorId = effectiveActorId;
    
    // Get user's retention setting
    const user = await prisma.user.findUnique({
      where: { id: effectiveActorId },
      select: { auditRetentionDays: true }
    });
    
    const retentionDays = user?.auditRetentionDays || AUDIT_CONFIG.DEFAULT_USER_RETENTION_DAYS;
    
    // Apply retention window: only show logs within retention period
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - retentionDays);
    
    where.createdAt = {
      gte: retentionDate,
      ...(startDate ? { gte: new Date(Math.max(new Date(startDate), retentionDate)) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {})
    };
  } else {
    // Super Admin: see all logs perpetually
    if (actorId) where.actorId = actorId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
  }
  
  if (action) where.action = action;
  if (entity) where.entity = entity;
  if (flaggedOnly) where.flagged = true;
  
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
  
  return { logs, total, config: AUDIT_CONFIG };
}

module.exports = {
  logAudit,
  auditMiddleware,
  getAuditLogs,
  FLAGGED_ACTIONS,
  AUDIT_CONFIG
};
