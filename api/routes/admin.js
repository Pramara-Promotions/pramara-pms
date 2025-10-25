// api/routes/admin.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const router = express.Router();

/* ────────────────────────────────────────────────────────────
   Auth guard: accept default or named export; safe fallback
   ──────────────────────────────────────────────────────────── */
let _auth = null;
try {
  _auth = require("../middleware/authGuard"); // could be a function OR { authGuard }
} catch (e) {
  console.warn("[admin] authGuard not found at ../middleware/authGuard:", e?.message);
}
let authGuard = _auth && typeof _auth === "function" ? _auth : (_auth && _auth.authGuard);
if (typeof authGuard !== "function") {
  console.warn("[admin] authGuard is not a function. Using NO-OP middleware so server can boot.");
  authGuard = (_req, _res, next) => next();
}

// Import permission guard for RBAC
const { permissionGuard } = require("../middleware/permissionGuard");

// Import audit logger
const { logAudit } = require("../middleware/auditLogger");
const { emailService } = require("../lib/emailService");
const { encrypt, decrypt } = require("../lib/secrets");
let emailInboundService = null;
try { emailInboundService = require("../lib/emailInboundService"); } catch {}

/* ────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */
function hasModel(name) {
  return prisma[name] && typeof prisma[name].findMany === "function";
}
const toInt = (v) => Number.parseInt(v, 10);

/* ────────────────────────────────────────────────────────────
   Health / Stats
   ──────────────────────────────────────────────────────────── */

// GET /api/admin/health
router.get("/admin/health", authGuard, permissionGuard.role('Super Admin'), async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`; // ping db
    res.json({ ok: true, db: "up", time: new Date().toISOString() });
  } catch (e) {
    console.error("[admin] health failed:", e);
    res.status(500).json({ ok: false, db: "down" });
  }
});

// GET /api/admin/stats
router.get("/admin/stats", authGuard, permissionGuard('AUDIT_VIEW', 'SYSTEM_SETTINGS'), async (_req, res) => {
  try {
    const out = {};
    if (hasModel("user")) out.users = await prisma.user.count();
    if (hasModel("project")) out.projects = await prisma.project.count();
    if (hasModel("qcRecord")) out.qcRecords = await prisma.qcRecord.count();
    if (hasModel("alert")) out.alerts = await prisma.alert.count();
    if (hasModel("session")) out.sessions = await prisma.session.count();
    res.json(out);
  } catch (e) {
    console.error("[admin] stats failed:", e);
    res.status(500).json({ error: "Failed to load stats" });
  }
});

/* ────────────────────────────────────────────────────────────
   System Settings — Email (Outbound/Training/Inbound)
   ──────────────────────────────────────────────────────────── */

// GET /api/admin/email-settings
router.get("/admin/email-settings", authGuard, permissionGuard.role('Super Admin'), async (_req, res) => {
  try {
    const [emailOutboundEnabled, emailTrainingMode, emailInboundEnabled] = await Promise.all([
      emailService.getSystemSetting('emailOutboundEnabled', false),
      emailService.getSystemSetting('emailTrainingMode', true),
      emailService.getSystemSetting('emailInboundEnabled', false),
    ]);
    res.json({ emailOutboundEnabled: !!emailOutboundEnabled, emailTrainingMode: !!emailTrainingMode, emailInboundEnabled: !!emailInboundEnabled });
  } catch (e) {
    console.error('[admin] get email-settings failed:', e);
    res.status(500).json({ error: 'Failed to load email settings' });
  }
});

// PUT /api/admin/email-settings
router.put("/admin/email-settings", authGuard, permissionGuard.role('Super Admin'), async (req, res) => {
  try {
    const { emailOutboundEnabled, emailTrainingMode, emailInboundEnabled } = req.body || {};
    const actorId = req.auth?.user?.id || null;

    const writes = [];
    if (typeof emailOutboundEnabled === 'boolean') {
      writes.push(emailService.setSystemSetting('emailOutboundEnabled', emailOutboundEnabled, actorId));
    }
    if (typeof emailTrainingMode === 'boolean') {
      writes.push(emailService.setSystemSetting('emailTrainingMode', emailTrainingMode, actorId));
    }
    let inboundChangedTo = null;
    if (typeof emailInboundEnabled === 'boolean') {
      writes.push(emailService.setSystemSetting('emailInboundEnabled', emailInboundEnabled, actorId));
      inboundChangedTo = emailInboundEnabled;
    }
    await Promise.all(writes);

    // Start/stop inbound polling immediately if toggled
    try {
      if (inboundChangedTo != null && emailInboundService) {
        if (inboundChangedTo) {
          // Start polling (5 minute interval)
          if (typeof emailInboundService.startPolling === 'function') {
            emailInboundService.startPolling(5);
          }
        } else {
          if (typeof emailInboundService.stopPolling === 'function') {
            emailInboundService.stopPolling();
          }
        }
      }
    } catch (e) {
      console.warn('[admin] toggling inbound service failed:', e?.message);
    }

    res.json({ ok: true, message: 'Email settings updated' });
  } catch (e) {
    console.error('[admin] update email-settings failed:', e);
    res.status(500).json({ error: 'Failed to update email settings' });
  }
});

// GET /api/admin/email-inbound/status
router.get('/admin/email-inbound/status', authGuard, permissionGuard.role('Super Admin'), async (_req, res) => {
  try {
    const enabled = !!(await emailService.getSystemSetting('emailInboundEnabled', false));
    // Check if a UI-configured EmailAccount exists or env credentials exist
    let imapConfigured = !!(process.env.IMAP_USER && process.env.IMAP_PASSWORD);
    try {
      const acct = await prisma.emailAccount.findFirst({ where: { enabled: true, protocol: 'imap' } });
      if (acct) imapConfigured = true;
    } catch {}
    const status = {
      enabled,
      imapConfigured,
      connected: !!(emailInboundService && emailInboundService.isConnected),
      polling: !!(emailInboundService && emailInboundService.isPolling),
    };
    res.json(status);
  } catch (e) {
    res.status(200).json({ enabled: false, imapConfigured: false, connected: false, polling: false });
  }
});

/* ────────────────────────────────────────────────────────────
   Email Accounts (Inbound) — UI-based configuration
   ──────────────────────────────────────────────────────────── */

// GET /api/admin/email-accounts
router.get('/admin/email-accounts', authGuard, permissionGuard.role('Super Admin'), async (_req, res) => {
  try {
    const rows = await prisma.emailAccount.findMany({ orderBy: { createdAt: 'desc' } });
    // Do not leak secrets; mask
    const sanitized = rows.map(r => ({
      id: r.id,
      label: r.label,
      provider: r.provider,
      protocol: r.protocol,
      authMethod: r.authMethod,
      username: r.username,
      host: r.host,
      port: r.port,
      tls: r.tls,
      tenantId: r.tenantId,
      clientId: r.clientId,
      mailbox: r.mailbox,
      enabled: r.enabled,
      status: r.status,
      lastSyncAt: r.lastSyncAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      hasPassword: !!r.passwordEnc,
      hasClientSecret: !!r.clientSecretEnc,
      hasRefreshToken: !!r.refreshTokenEnc,
    }));
    res.json(sanitized);
  } catch (e) {
    console.error('[admin] list email-accounts failed:', e);
    res.status(500).json({ error: 'Failed to list email accounts' });
  }
});

// POST /api/admin/email-accounts
router.post('/admin/email-accounts', authGuard, permissionGuard.role('Super Admin'), async (req, res) => {
  try {
    const { label, provider = 'exchange', protocol = 'imap', authMethod = 'basic', username, password, host, port = 993, tls = true, tenantId, clientId, clientSecret, mailbox, enabled = true } = req.body || {};
    if (!label) return res.status(400).json({ error: 'label is required' });
    if (protocol === 'imap' && (!username)) return res.status(400).json({ error: 'username is required for IMAP' });

    const row = await prisma.emailAccount.create({
      data: {
        label,
        provider,
        protocol,
        authMethod,
        username: username || mailbox || '',
        passwordEnc: password ? encrypt(password) : null,
        host: host || (provider === 'exchange' ? 'outlook.office365.com' : host),
        port: Number(port) || 993,
        tls: !!tls,
        tenantId: tenantId || null,
        clientId: clientId || null,
        clientSecretEnc: clientSecret ? encrypt(clientSecret) : null,
        mailbox: mailbox || username || null,
        enabled: !!enabled,
        status: 'created'
      }
    });
    res.json({ ok: true, id: row.id });
  } catch (e) {
    console.error('[admin] create email-account failed:', e);
    res.status(500).json({ error: 'Failed to create email account' });
  }
});

// PUT /api/admin/email-accounts/:id
router.put('/admin/email-accounts/:id', authGuard, permissionGuard.role('Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { label, provider, protocol, authMethod, username, password, host, port, tls, tenantId, clientId, clientSecret, mailbox, enabled, status } = req.body || {};
    const data = {};
    if (label !== undefined) data.label = label;
    if (provider !== undefined) data.provider = provider;
    if (protocol !== undefined) data.protocol = protocol;
    if (authMethod !== undefined) data.authMethod = authMethod;
    if (username !== undefined) data.username = username;
    if (password !== undefined) data.passwordEnc = password ? encrypt(password) : null;
    if (host !== undefined) data.host = host;
    if (port !== undefined) data.port = Number(port);
    if (tls !== undefined) data.tls = !!tls;
    if (tenantId !== undefined) data.tenantId = tenantId;
    if (clientId !== undefined) data.clientId = clientId;
    if (clientSecret !== undefined) data.clientSecretEnc = clientSecret ? encrypt(clientSecret) : null;
    if (mailbox !== undefined) data.mailbox = mailbox;
    if (enabled !== undefined) data.enabled = !!enabled;
    if (status !== undefined) data.status = status;

    await prisma.emailAccount.update({ where: { id }, data });
    res.json({ ok: true });
  } catch (e) {
    console.error('[admin] update email-account failed:', e);
    res.status(500).json({ error: 'Failed to update email account' });
  }
});

// DELETE /api/admin/email-accounts/:id
router.delete('/admin/email-accounts/:id', authGuard, permissionGuard.role('Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.emailAccount.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('[admin] delete email-account failed:', e);
    res.status(500).json({ error: 'Failed to delete email account' });
  }
});

/* ────────────────────────────────────────────────────────────
   Users admin
   ──────────────────────────────────────────────────────────── */

// GET /api/admin/roles — minimal list for assignment UIs
router.get("/admin/roles", authGuard, permissionGuard('ROLE_VIEW'), async (_req, res) => {
  if (!hasModel("role")) return res.json([]);
  try {
    const roles = await prisma.role.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.json(roles);
  } catch (e) {
    console.error('[admin] list roles failed:', e);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// GET /api/admin/users
router.get("/admin/users", authGuard, permissionGuard('USER_VIEW'), async (_req, res) => {
  if (!hasModel("user")) return res.json([]);
  try {
    const rows = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        isActive: true,
        createdAt: true,
        mfaSecret: true,
        mfaEnforcedAt: true,
        trustDeviceDuration: true,
        auditRetentionDays: true,
        department: { select: { id: true, name: true } },
        roles: {
          include: {
            role: {
              select: { id: true, name: true, description: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    });
    
    // Format response with compact role objects
    const formatted = rows.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name || null,
      status: user.status || (user.isActive ? 'ACTIVE' : 'INACTIVE'),
      isActive: user.isActive,
      createdAt: user.createdAt,
      mfaSecret: user.mfaSecret,
      mfaEnforcedAt: user.mfaEnforcedAt,
      trustDeviceDuration: user.trustDeviceDuration,
      auditRetentionDays: user.auditRetentionDays,
      department: user.department,
      roles: user.roles.map(ur => ({ id: ur.role.id, name: ur.role.name })),
    }));
    
    res.json(formatted);
  } catch (e) {
    console.error("[admin] list users failed:", e);
    res.json([]);
  }
});

// POST /api/admin/users  { email, name?, departmentId?, roleIds?: ['roleId1', ...], sendInvite?: boolean }
router.post("/admin/users", authGuard, permissionGuard('USER_CREATE'), async (req, res) => {
  if (!hasModel("user")) return res.status(503).json({ error: "User model not available" });
  try {
    const { email, name, departmentId, roleIds = [], sendInvite = true } = req.body || {};
    if (!email) return res.status(400).json({ error: "email is required" });

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
    if (existing) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    const argon2 = require('argon2');
    const { generateInviteToken, sendInvitationEmail } = require('../lib/emailService');
    const { logAudit } = require('../middleware/auditLogger');
    const { getClientIP } = require('../lib/deviceFingerprint');
    
    // Generate temporary password and invite token
    const tempPassword = "ChangeMe@123";
    const passwordHash = await argon2.hash(tempPassword);
    
    let inviteToken = null;
    let inviteExpires = null;
    
    if (sendInvite) {
      inviteToken = generateInviteToken();
      inviteExpires = new Date();
      inviteExpires.setMinutes(inviteExpires.getMinutes() + 30); // 30 minutes expiry
    }
    
    // Create user with roles
    const user = await prisma.user.create({
      data: { 
        email: String(email).toLowerCase().trim(),
        name: name || null,
        passwordHash,
        isActive: true,
        status: sendInvite ? 'PENDING' : 'ACTIVE',
        departmentId: departmentId || null,
        trustDeviceDuration: 30,
        inviteToken,
        inviteExpires,
        createdById: req.user.userId, // Track who created this user
        ...(roleIds.length > 0 ? {
          roles: {
            create: roleIds.map(roleId => ({ roleId }))
          }
        } : {})
      },
      select: { 
        id: true, 
        email: true,
        name: true,
        status: true,
        isActive: true, 
        createdAt: true,
        department: {
          select: { id: true, name: true }
        },
        roles: {
          include: {
            role: { select: { name: true } }
          }
        }
      },
    });
    
    // Send invitation email if requested
    if (sendInvite && inviteToken) {
      const inviteUrl = `${process.env.APP_URL || 'http://localhost:5173'}/invite/${inviteToken}`;
      const { emailService } = require('../lib/emailService');
      
      try {
        await emailService.sendTemplate({
          to: user.email,
          templateName: 'user-invitation',
          data: {
            userName: user.name || user.email,
            inviterName: req.auth?.user?.name || req.auth?.user?.email || 'Admin',
            inviteUrl,
            expiresAt: new Date(inviteExpires).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          },
          userId: null  // System email - bypass user permission check
        });
        console.log(`[USER_CREATE] Invitation email sent to ${user.email}`);
      } catch (emailError) {
        console.error(`[USER_CREATE] Failed to send invitation email:`, emailError);
        // Don't fail user creation if email fails
      }
    }
    
    // Log the action
    await logAudit({
      actorId: req.auth?.user?.id || null,
      action: 'USER_CREATE',
      entity: 'USER',
      entityId: user.id,
      changes: { created: { email: user.email, roles: user.roles.map(ur => ur.role.name) } },
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      result: 'SUCCESS'
    });
    
    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      isActive: user.isActive,
      createdAt: user.createdAt,
      department: user.department,
      roles: user.roles.map(ur => ur.role.name),
      inviteSent: sendInvite
    });
  } catch (e) {
    console.error("[admin] create user failed:", e);
    res.status(400).json({ error: e.message || "Create user failed" });
  }
});

// POST /api/admin/users/:id/resend-invitation - Resend invitation email
router.post("/admin/users/:id/resend-invitation", authGuard, permissionGuard('USER_CREATE'), async (req, res) => {
  if (!hasModel("user")) return res.status(503).json({ error: "User model not available" });
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        inviteToken: true,
        inviteExpires: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.status !== 'PENDING') {
      return res.status(400).json({ error: 'User has already accepted invitation' });
    }
    
    // Generate new invite token and expiry
    const { generateInviteToken } = require('../lib/emailService');
    const inviteToken = generateInviteToken();
    const inviteExpires = new Date();
    inviteExpires.setMinutes(inviteExpires.getMinutes() + 30); // 30 minutes expiry
    
    // Update user with new token
    await prisma.user.update({
      where: { id },
      data: {
        inviteToken,
        inviteExpires
      }
    });
    
    // Send invitation email
    const inviteUrl = `${process.env.APP_URL || 'http://localhost:5173'}/invite/${inviteToken}`;
    const { emailService } = require('../lib/emailService');
    
    try {
      await emailService.sendTemplate({
        to: user.email,
        templateName: 'user-invitation',
        data: {
          userName: user.name || user.email,
          inviterName: req.auth?.user?.name || req.auth?.user?.email || 'Admin',
          inviteUrl,
          expiresAt: inviteExpires.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        },
        userId: null  // System email - bypass user permission check
      });
      console.log(`[RESEND_INVITE] Invitation email sent to ${user.email}`);
    } catch (emailError) {
      console.error(`[RESEND_INVITE] Failed to send invitation email:`, emailError);
      return res.status(500).json({ error: 'Failed to send invitation email: ' + emailError.message });
    }
    
    // Log the action
    const { logAudit } = require('../middleware/auditLogger');
    await logAudit({
      actorId: req.auth?.user?.id || null,
      action: 'USER_INVITE_RESENT',
      targetType: 'USER',
      targetId: user.id,
      details: { email: user.email },
      outcome: 'success'
    });
    
    res.json({ 
      success: true, 
      message: 'Invitation email resent successfully',
      expiresAt: inviteExpires
    });
  } catch (e) {
    console.error("[admin] resend invitation failed:", e);
    res.status(400).json({ error: e.message || "Resend invitation failed" });
  }
});

// POST /api/admin/users/:id/disable-mfa - Disable MFA for a user (Superadmin only)
router.post("/admin/users/:id/disable-mfa", authGuard, permissionGuard('USER_EDIT'), async (req, res) => {
  if (!hasModel("user")) return res.status(503).json({ error: "User model not available" });
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        mfaSecret: true,
        mfaEnforcedAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.mfaSecret || !user.mfaEnforcedAt) {
      return res.status(400).json({ error: 'MFA is not enabled for this user' });
    }
    
    // Disable MFA by clearing secret and enforced date
    await prisma.user.update({
      where: { id },
      data: {
        mfaSecret: null,
        mfaEnforcedAt: null
      }
    });
    
    // Revoke all trusted devices for security
    await prisma.device.updateMany({
      where: { userId: id, trusted: true },
      data: { trusted: false }
    });
    
    // Invalidate all sessions - force re-login
    await prisma.session.deleteMany({
      where: { userId: id }
    });
    
    // Send notification email to user
    const { sendEmail } = require('../lib/emailService');
    try {
      await sendEmail({
        to: user.email,
        template: 'mfa-disabled',
        data: {
          name: user.name || user.email,
          disabledBy: req.auth?.user?.name || req.auth?.user?.email || 'Administrator',
          disabledAt: new Date().toLocaleString()
        },
        userId: null // System email
      });
    } catch (emailError) {
      console.error('[DISABLE_MFA] Failed to send notification email:', emailError);
      // Don't fail the request if email fails
    }
    
    // Log the action
    const { logAudit } = require('../middleware/auditLogger');
    await logAudit({
      actorId: req.auth?.user?.id || null,
      action: 'MFA_DISABLED_BY_ADMIN',
      targetType: 'USER',
      targetId: user.id,
      details: { 
        email: user.email,
        disabledBy: req.auth?.user?.email || 'system',
        reason: 'Admin action'
      },
      outcome: 'success'
    });
    
    console.log(`[DISABLE_MFA] MFA disabled for user ${user.email} by ${req.auth?.user?.email || 'admin'}`);
    
    res.json({ 
      success: true, 
      message: 'MFA disabled successfully. User has been logged out from all devices and will need to set up MFA again.'
    });
  } catch (e) {
    console.error("[admin] disable MFA failed:", e);
    res.status(400).json({ error: e.message || "Disable MFA failed" });
  }
});

// PUT /api/admin/users/:id  { name?, status?, isActive?, departmentId?, trustDeviceDuration?, auditRetentionDays?, emailOutboundEnabled?, emailTrainingMode? }
router.put("/admin/users/:id", authGuard, permissionGuard('USER_EDIT'), async (req, res) => {
  if (!hasModel("user")) return res.status(503).json({ error: "User model not available" });
  try {
    const { id } = req.params;
    const { 
      name, 
      status, 
      isActive, 
      departmentId, 
      trustDeviceDuration, 
      auditRetentionDays,
      emailOutboundEnabled,
      emailTrainingMode
    } = req.body || {};
    
    const updateData = {};
    if (name !== undefined) updateData.name = name || null;
    if (status !== undefined) updateData.status = status;
    if (isActive !== undefined) updateData.isActive = !!isActive;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (trustDeviceDuration !== undefined) {
      updateData.trustDeviceDuration = Math.max(1, Math.min(365, parseInt(trustDeviceDuration) || 30));
    }
    if (auditRetentionDays !== undefined) {
      // Enforce minimum 15 days (AUDIT_CONFIG.MINIMUM_RETENTION_DAYS)
      updateData.auditRetentionDays = Math.max(15, Math.min(365, parseInt(auditRetentionDays) || 90));
    }
    if (emailOutboundEnabled !== undefined) {
      updateData.emailOutboundEnabled = !!emailOutboundEnabled;
    }
    if (emailTrainingMode !== undefined) {
      updateData.emailTrainingMode = !!emailTrainingMode;
    }

    const row = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { 
        id: true, 
        email: true,
        name: true,
        status: true,
        isActive: true,
        department: { select: { id: true, name: true } },
        roles: {
          include: {
            role: { select: { id: true, name: true } }
          }
        }
      },
    });
    
    // Log the update
    if (req.user?.id) {
      const { logAudit } = require('../middleware/auditLogger');
      const { getClientIP } = require('../lib/deviceFingerprint');
      await logAudit({
        actorId: req.user.id,
        action: 'USER_UPDATE',
        entity: 'USER',
        entityId: id,
        changes: updateData,
        meta: { userEmail: row.email },
        ip: getClientIP(req),
        userAgent: req.headers['user-agent'],
        result: 'SUCCESS'
      });
    }
    
    res.json({
      id: row.id,
      email: row.email,
      name: row.name,
      status: row.status,
      isActive: row.isActive,
      department: row.department,
      roles: row.roles.map(ur => ({ id: ur.role.id, name: ur.role.name })),
    });
  } catch (e) {
    console.error("[admin] update user failed:", e);
    if (e?.code === "P2025") return res.status(404).json({ error: "User not found" });
    res.status(400).json({ error: "Update user failed" });
  }
});

// POST /api/admin/users/:id/reset-password  { method: 'email' | 'manual' }
router.post("/admin/users/:id/reset-password", authGuard, permissionGuard('USER_EDIT'), async (req, res) => {
  if (!hasModel("user")) return res.status(503).json({ error: "User model not available" });
  try {
    const { id } = req.params;
    const { method } = req.body || {};
    
    if (!method || !['email', 'manual'].includes(method)) {
      return res.status(400).json({ error: "method required: 'email' or 'manual'" });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true }
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate a secure random password (12 characters, alphanumeric + symbols)
    const crypto = require('crypto');
    const generatePassword = () => {
      const length = 12;
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
      let password = '';
      const randomBytes = crypto.randomBytes(length);
      for (let i = 0; i < length; i++) {
        password += charset[randomBytes[i] % charset.length];
      }
      return password;
    };

    const temporaryPassword = generatePassword();
    const argon2 = require('argon2');
    const passwordHash = await argon2.hash(temporaryPassword);

    // Update user with new password and set flags
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true, // Force password change on first login
        passwordResetAt: new Date(),
        passwordResetMethod: method, // 'email' or 'manual'
      }
    });

    // Create security alert record (for 7-day banner)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    await prisma.notification.create({
      data: {
        userId: id,
        type: 'SECURITY_ALERT',
        title: 'Password Reset Without MFA',
        message: `Your password was reset by an administrator without MFA verification on ${new Date().toLocaleString()}. If you did not request this, please contact your administrator immediately. This alert expires on ${expiresAt.toLocaleDateString()}.`,
      }
    });

    // Notify admin (Super Admin or user's department admin)
    const adminUsers = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: { name: 'Super Admin' }
          }
        }
      },
      select: { id: true }
    });

    for (const admin of adminUsers) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'ADMIN_ALERT',
          title: 'Non-MFA Password Reset Performed',
          message: `Password reset without MFA for user ${user.email} (${user.name || 'No name'}) via ${method} method by ${req.user?.email || 'Unknown admin'}`,
        }
      });
    }

    // Log audit trail
    if (hasModel("auditLog") && req.user?.id) {
      const { logAudit } = require('../middleware/auditLogger');
      const { getClientIP } = require('../lib/deviceFingerprint');
      await logAudit({
        actorId: req.user.id,
        action: 'PASSWORD_RESET_ADMIN',
        entity: 'USER',
        entityId: id,
        changes: { method, timestamp: new Date() },
        meta: { userEmail: user.email, resetMethod: method },
        ip: getClientIP(req),
        userAgent: req.headers['user-agent'],
        result: 'SUCCESS'
      });
    }

    // Send response based on method
    if (method === 'email') {
      // Send email with temporary password
      const { sendPasswordResetEmail } = require('../lib/emailService');
      await sendPasswordResetEmail(user.email, user.name || user.email, temporaryPassword);
      
      res.json({
        ok: true,
        message: 'Password reset email sent successfully',
        method: 'email'
      });
    } else if (method === 'manual') {
      // Return password for manual sharing
      res.json({
        ok: true,
        temporaryPassword,
        message: 'Temporary password generated. Share securely with user.',
        method: 'manual',
        warning: 'User must change password on first login. This password will not be shown again.'
      });
    }

  } catch (e) {
    console.error("[admin] reset password failed:", e);
    if (e?.code === "P2025") return res.status(404).json({ error: "User not found" });
    res.status(500).json({ error: "Reset password failed" });
  }
});

// PUT /api/admin/users/:id/mfa - Enable/Disable MFA for a user
router.put("/admin/users/:id/mfa", authGuard, permissionGuard('USER_EDIT'), async (req, res) => {
  if (!hasModel("user")) return res.status(503).json({ error: "User model not available" });
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update MFA status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        mfaSecret: enabled ? 'PENDING_SETUP' : null, // Set to PENDING_SETUP when enabling, null when disabling
        mfaEnforcedAt: enabled ? new Date() : null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        mfaSecret: true,
        mfaEnforcedAt: true,
      }
    });

    // Audit log
    await logAudit({
      actorId: req.user?.id || 'unknown',
      action: enabled ? 'MFA_ENABLED' : 'MFA_RESET',
      entity: 'USER',
      entityId: id,
      changes: {
        before: { mfaEnabled: !!user.mfaSecret },
        after: { mfaEnabled: enabled },
      },
      meta: { 
        targetUser: user.email,
        adminAction: true,
        requiresReview: !enabled // Flag MFA resets for review
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ 
      success: true, 
      message: enabled ? 'MFA enabled. User will be prompted to set it up on next login.' : 'MFA reset successfully.',
      user: updatedUser 
    });
  } catch (e) {
    console.error("[admin] MFA update failed:", e);
    res.status(500).json({ error: "Failed to update MFA settings" });
  }
});

// POST /api/admin/users/:id/force-logout - Force logout user from all devices
router.post("/admin/users/:id/force-logout", authGuard, permissionGuard('USER_EDIT'), async (req, res) => {
  if (!hasModel("user") || !hasModel("device")) return res.status(503).json({ error: "Models not available" });
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({ 
      where: { id },
      select: { id: true, email: true, name: true }
    });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Revoke all trusted devices
    const revokedDevices = await prisma.device.updateMany({
      where: { userId: id, trusted: true },
      data: { 
        trusted: false,
        lastUsedAt: new Date() // Update timestamp
      }
    });

    // TODO: If you have a Session model, also delete all active sessions here
    // await prisma.session.deleteMany({ where: { userId: id } });

    // Audit log - this is a security-critical action
    await logAudit({
      actorId: req.user?.id || 'unknown',
      action: 'FORCE_LOGOUT',
      entity: 'USER',
      entityId: id,
      changes: {
        devicesRevoked: revokedDevices.count,
      },
      meta: { 
        targetUser: user.email,
        reason: 'Admin forced logout',
        adminAction: true,
        securityAction: true,
      },
      ip: req.ip,
      userAgent: req.get('user-agent'),
      result: 'SUCCESS'
    });

    res.json({ 
      success: true, 
      message: `User ${user.email} has been logged out from all devices.`,
      devicesRevoked: revokedDevices.count
    });
  } catch (e) {
    console.error("[admin] Force logout failed:", e);
    res.status(500).json({ error: "Failed to force logout" });
  }
});

// GET /api/admin/users/:id - Get single user with full details
router.get("/admin/users/:id", authGuard, permissionGuard('USER_VIEW'), async (req, res) => {
  if (!hasModel("user")) return res.status(503).json({ error: "User model not available" });
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
                permissions: {
                  include: {
                    permission: { select: { code: true, label: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Format response
    const formatted = {
      id: user.id,
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
      })),
      permissions: [...new Set(
        user.roles.flatMap(ur =>
          ur.role.permissions.map(rp => rp.permission.code)
        )
      )],
    };

    res.json(formatted);
  } catch (e) {
    console.error("[admin] get user failed:", e);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// DELETE /api/admin/users/:id
router.delete("/admin/users/:id", authGuard, permissionGuard('USER_DELETE'), async (req, res) => {
  if (!hasModel("user")) return res.status(503).json({ error: "User model not available" });
  try {
    const { id } = req.params;
    
    // Prevent deleting yourself
    if (req.auth?.user?.id === id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }
    
    // Get user info before deletion
    const userToDelete = await prisma.user.findUnique({
      where: { id },
      select: { email: true, name: true }
    });
    
    // Delete related records first (Prisma cascade doesn't work for all relations)
    await prisma.userRole.deleteMany({ where: { userId: id } });
    await prisma.session.deleteMany({ where: { userId: id } });
    
    // Now delete the user
    await prisma.user.delete({ where: { id } });
    
    // Log the deletion (FLAGGED action)
    if (req.user?.id && userToDelete) {
      const { logAudit } = require('../middleware/auditLogger');
      const { getClientIP } = require('../lib/deviceFingerprint');
      await logAudit({
        actorId: req.user.id,
        action: 'USER_DELETE',
        entity: 'USER',
        entityId: id,
        changes: { deleted: { email: userToDelete.email, name: userToDelete.name } },
        meta: { userEmail: userToDelete.email },
        ip: getClientIP(req),
        userAgent: req.headers['user-agent'],
        result: 'SUCCESS'
      });
    }
    
    res.json({ ok: true, message: 'User deleted successfully' });
  } catch (e) {
    console.error("[admin] delete user failed:", e);
    if (e?.code === "P2025") return res.status(404).json({ error: "User not found" });
    res.status(400).json({ error: "Delete user failed" });
  }
});

/* ────────────────────────────────────────────────────────────
   Sessions admin
   ──────────────────────────────────────────────────────────── */

// GET /api/admin/sessions
router.get("/admin/sessions", authGuard, permissionGuard.role('Super Admin'), async (_req, res) => {
  if (!hasModel("session")) return res.json([]);
  try {
    const rows = await prisma.session.findMany({
      select: { id: true, userId: true, userAgent: true, ip: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(rows);
  } catch (e) {
    console.error("[admin] list sessions failed:", e);
    res.json([]);
  }
});

// DELETE /api/admin/sessions/:id
router.delete("/admin/sessions/:id", authGuard, permissionGuard.role('Super Admin'), async (req, res) => {
  if (!hasModel("session")) return res.status(503).json({ error: "Session model not available" });
  try {
    const id = toInt(req.params.id);
    await prisma.session.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error("[admin] delete session failed:", e);
    if (e?.code === "P2025") return res.status(404).json({ error: "Session not found" });
    res.status(400).json({ error: "Delete session failed" });
  }
});

/* ────────────────────────────────────────────────────────────
   EMAIL SYSTEM SETTINGS (Super Admin Only)
   ──────────────────────────────────────────────────────────── */

// GET /api/admin/email-settings
router.get("/admin/email-settings", authGuard, permissionGuard.role('Super Admin'), async (req, res) => {
  if (!hasModel("systemSetting")) return res.status(503).json({ error: "SystemSetting model not available" });
  
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['emailOutboundEnabled', 'emailTrainingMode', 'emailInboundEnabled']
        }
      }
    });

    const result = {
      emailOutboundEnabled: false,
      emailTrainingMode: true,
      emailInboundEnabled: false
    };

    settings.forEach(setting => {
      result[setting.key] = setting.value;
    });

    res.json(result);
  } catch (e) {
    console.error("[admin] get email settings failed:", e);
    res.status(500).json({ error: "Failed to fetch email settings" });
  }
});

// PUT /api/admin/email-settings
router.put("/admin/email-settings", authGuard, permissionGuard.role('Super Admin'), async (req, res) => {
  if (!hasModel("systemSetting")) return res.status(503).json({ error: "SystemSetting model not available" });
  
  try {
    const { emailOutboundEnabled, emailTrainingMode, emailInboundEnabled } = req.body;
    const updates = [];

    if (typeof emailOutboundEnabled === 'boolean') {
      updates.push(
        prisma.systemSetting.upsert({
          where: { key: 'emailOutboundEnabled' },
          create: { key: 'emailOutboundEnabled', value: emailOutboundEnabled, updatedBy: req.user.email },
          update: { value: emailOutboundEnabled, updatedBy: req.user.email }
        })
      );
    }

    if (typeof emailTrainingMode === 'boolean') {
      updates.push(
        prisma.systemSetting.upsert({
          where: { key: 'emailTrainingMode' },
          create: { key: 'emailTrainingMode', value: emailTrainingMode, updatedBy: req.user.email },
          update: { value: emailTrainingMode, updatedBy: req.user.email }
        })
      );
    }

    if (typeof emailInboundEnabled === 'boolean') {
      updates.push(
        prisma.systemSetting.upsert({
          where: { key: 'emailInboundEnabled' },
          create: { key: 'emailInboundEnabled', value: emailInboundEnabled, updatedBy: req.user.email },
          update: { value: emailInboundEnabled, updatedBy: req.user.email }
        })
      );
    }

    await Promise.all(updates);

    // Log audit
    await logAudit({
      action: 'EMAIL_SETTINGS_UPDATED',
      entity: 'SystemSetting',
      entityId: 'email',
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || 'Unknown',
      details: { emailOutboundEnabled, emailTrainingMode, emailInboundEnabled },
      flagged: true
    });

    res.json({ ok: true, message: 'Email settings updated successfully' });
  } catch (e) {
    console.error("[admin] update email settings failed:", e);
    res.status(500).json({ error: "Failed to update email settings" });
  }
});

// PUT /api/admin/users/:id/email-permissions
router.put("/admin/users/:id/email-permissions", authGuard, permissionGuard.role('Super Admin'), async (req, res) => {
  if (!hasModel("user")) return res.status(503).json({ error: "User model not available" });
  
  try {
    const id = toInt(req.params.id);
    const { emailOutboundEnabled, emailInboundEnabled, emailOverrideSystem } = req.body;
    
    const updates = {};
    if (typeof emailOutboundEnabled === 'boolean') updates.emailOutboundEnabled = emailOutboundEnabled;
    if (typeof emailInboundEnabled === 'boolean') updates.emailInboundEnabled = emailInboundEnabled;
    if (typeof emailOverrideSystem === 'boolean') updates.emailOverrideSystem = emailOverrideSystem;

    const user = await prisma.user.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        email: true,
          name: true,
        emailOutboundEnabled: true,
        emailInboundEnabled: true,
        emailOverrideSystem: true
      }
    });

    // Log audit
    await logAudit({
      action: 'USER_EMAIL_PERMISSIONS_UPDATED',
      entity: 'User',
      entityId: id,
      userId: req.user.id,
      userEmail: req.user.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || 'Unknown',
      details: { targetUser: user.email, updates },
      flagged: true
    });

    res.json(user);
  } catch (e) {
    console.error("[admin] update user email permissions failed:", e);
    if (e?.code === "P2025") return res.status(404).json({ error: "User not found" });
    res.status(500).json({ error: "Failed to update email permissions" });
  }
});

module.exports = { adminRouter: router };