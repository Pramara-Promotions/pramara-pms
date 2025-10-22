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

// PUT /api/admin/users/:id  { name?, status?, isActive?, departmentId? }
router.put("/admin/users/:id", authGuard, permissionGuard('USER_EDIT'), async (req, res) => {
  if (!hasModel("user")) return res.status(503).json({ error: "User model not available" });
  try {
    const { id } = req.params;
    const { name, status, isActive, departmentId } = req.body || {};
    
    const updateData = {};
    if (name !== undefined) updateData.name = name || null;
    if (status !== undefined) updateData.status = status;
    if (isActive !== undefined) updateData.isActive = !!isActive;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;

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

// POST /api/admin/users/:id/reset-password  { password }
router.post("/admin/users/:id/reset-password", authGuard, permissionGuard('USER_EDIT'), async (req, res) => {
  if (!hasModel("user")) return res.status(503).json({ error: "User model not available" });
  try {
    const { id } = req.params;
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: "password required" });
    
    const argon2 = require('argon2');
    const passwordHash = await argon2.hash(String(password));
    await prisma.user.update({ where: { id }, data: { passwordHash } });
    res.json({ ok: true, message: 'Password reset successfully' });
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
    
    // Delete related records first (Prisma cascade doesn't work for all relations)
    await prisma.userRole.deleteMany({ where: { userId: id } });
    await prisma.session.deleteMany({ where: { userId: id } });
    
    // Now delete the user
    await prisma.user.delete({ where: { id } });
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

module.exports = { adminRouter: router };