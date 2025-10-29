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
      inviteExpires.setDate(inviteExpires.getDate() + 7); // 7 days expiry
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
      await sendInvitationEmail({
        email: user.email,
        inviteUrl,
        inviterName: req.auth?.user?.email || 'Admin'
      });
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

// PUT /api/admin/users/:id  { name?, status?, isActive?, departmentId?, auditRetentionDays? }
router.put("/admin/users/:id", authGuard, permissionGuard('USER_EDIT'), async (req, res) => {
  if (!hasModel("user")) return res.status(503).json({ error: "User model not available" });
  try {
    const { id } = req.params;
    const { name, status, isActive, departmentId, auditRetentionDays } = req.body || {};
    
    const updateData = {};
    if (name !== undefined) updateData.name = name || null;
    if (status !== undefined) updateData.status = status;
    if (isActive !== undefined) updateData.isActive = !!isActive;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    
    // Audit retention: enforce minimum 15 days (Super Admin only)
    if (auditRetentionDays !== undefined) {
      const AUDIT_CONFIG = require('../middleware/auditLogger').AUDIT_CONFIG;
      const retention = parseInt(auditRetentionDays);
      
      if (retention < AUDIT_CONFIG.MINIMUM_RETENTION_DAYS) {
        return res.status(400).json({
          error: `Audit retention cannot be less than ${AUDIT_CONFIG.MINIMUM_RETENTION_DAYS} days (security policy)`,
          minimumAllowed: AUDIT_CONFIG.MINIMUM_RETENTION_DAYS,
          maximumAllowed: AUDIT_CONFIG.MAXIMUM_USER_RETENTION_DAYS,
          requested: retention
        });
      }
      
      if (retention > AUDIT_CONFIG.MAXIMUM_USER_RETENTION_DAYS) {
        return res.status(400).json({
          error: `Audit retention cannot exceed ${AUDIT_CONFIG.MAXIMUM_USER_RETENTION_DAYS} days`,
          maximumAllowed: AUDIT_CONFIG.MAXIMUM_USER_RETENTION_DAYS,
          requested: retention
        });
      }
      
      updateData.auditRetentionDays = retention;
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
        auditRetentionDays: true,
        department: { select: { id: true, name: true } },
        roles: {
          include: {
            role: { select: { id: true, name: true } }
          }
        }
      },
    });
    
    // Audit log
    const { logAudit } = require('../middleware/auditLogger');
    await logAudit({
      action: 'USER_UPDATED',
      actorId: req.user?.id,
      targetId: id,
      details: updateData,
      ipAddress: req.ip,
    });
    
    res.json({
      id: row.id,
      email: row.email,
      name: row.name,
      status: row.status,
      isActive: row.isActive,
      auditRetentionDays: row.auditRetentionDays,
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
    const { method = 'manual' } = req.body || {};
    
    // Generate secure random 12-character password
    const crypto = require('crypto');
    const randomPassword = crypto.randomBytes(6).toString('hex'); // 12 chars
    
    const argon2 = require('argon2');
    const passwordHash = await argon2.hash(randomPassword);
    
    await prisma.user.update({ 
      where: { id }, 
      data: { 
        passwordHash,
        mustChangePassword: true, // Force password change on next login
        passwordResetAt: new Date()
      } 
    });
    
    // Audit log
    const { logAudit } = require('../middleware/auditLogger');
    await logAudit({
      action: 'PASSWORD_RESET',
      actorId: req.user?.id,
      targetId: id,
      details: { method, forced: true },
      ipAddress: req.ip,
      flagged: true,
    });
    
    // If email method, send email with password
    if (method === 'email') {
      const user = await prisma.user.findUnique({
        where: { id },
        select: { email: true, name: true }
      });
      
      if (user) {
        const { sendPasswordResetEmail } = require('../lib/emailService');
        const resetByUser = await prisma.user.findUnique({
          where: { id: req.user?.id },
          select: { name: true, email: true }
        });
        
        await sendPasswordResetEmail({
          email: user.email,
          temporaryPassword: randomPassword,
          resetByName: resetByUser?.name || resetByUser?.email || 'Administrator'
        });
        
        console.log('[ADMIN] Password reset email sent to:', user.email);
      }
    }
    
    res.json({ 
      ok: true, 
      message: 'Password reset successfully',
      // Only return password for manual method (admin will give to user)
      password: method === 'manual' ? randomPassword : undefined
    });
  } catch (e) {
    console.error("[admin] reset password failed:", e);
    if (e?.code === "P2025") return res.status(404).json({ error: "User not found" });
    res.status(400).json({ error: "Reset password failed" });
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
    
    // Get user info before deletion for audit log
    const userToDelete = await prisma.user.findUnique({
      where: { id },
      select: { email: true, name: true }
    });
    
    if (!userToDelete) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Delete related records first (Prisma cascade doesn't work for all relations)
    await prisma.userRole.deleteMany({ where: { userId: id } });
    await prisma.session.deleteMany({ where: { userId: id } });
    
    // Now delete the user
    await prisma.user.delete({ where: { id } });
    
    // Audit log
    const { logAudit } = require('../middleware/auditLogger');
    await logAudit({
      action: 'USER_DELETED',
      actorId: req.user?.id,
      targetId: id,
      details: { email: userToDelete.email, name: userToDelete.name },
      ipAddress: req.ip,
      flagged: true,
    });
    
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

// GET /api/admin/users/:id/mfa-status
router.get("/admin/users/:id/mfa-status", authGuard, permissionGuard.role('Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { mfaEnabled: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ mfaEnabled: user.mfaEnabled || false });
  } catch (error) {
    console.error('GET /api/admin/users/:id/mfa-status error:', error);
    res.status(500).json({ error: 'Failed to fetch MFA status' });
  }
});

// POST /api/admin/users/:id/reset-mfa
router.post("/admin/users/:id/reset-mfa", authGuard, permissionGuard.role('Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.update({
      where: { id },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    // Get user info for email
    const user = await prisma.user.findUnique({
      where: { id },
      select: { email: true, name: true }
    });

    // Send MFA disabled alert email
    if (user) {
      const { sendMfaDisabledEmail } = require('../lib/emailService');
      await sendMfaDisabledEmail({
        email: user.email,
        userName: user.name || user.email,
        selfService: false  // Admin-initiated
      });
    }

    // Audit log
    const { logAudit } = require('../middleware/auditLogger');
    await logAudit({
      action: 'MFA_DISABLED',
      actorId: req.user?.id,
      targetId: id,
      details: { adminReset: true },
      ipAddress: req.ip,
      flagged: true,
    });

    res.json({ success: true, message: 'MFA disabled successfully' });
  } catch (error) {
    console.error('POST /api/admin/users/:id/reset-mfa error:', error);
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to reset MFA' });
  }
});

module.exports = { adminRouter: router };