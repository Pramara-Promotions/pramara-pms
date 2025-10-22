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

/* ────────────────────────────────────────────────────────────
   Optional role check (no-op if role/claims unavailable)
   ──────────────────────────────────────────────────────────── */
function adminOnly(req, res, next) {
  // If your authGuard sets req.user / req.auth.user with role, enforce it here.
  // Otherwise, allow through to keep dev moving.
  const role = req?.user?.role || req?.auth?.user?.role || null;
  if (role && role.toLowerCase() !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }
  return next();
}

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
router.get("/admin/health", authGuard, adminOnly, async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`; // ping db
    res.json({ ok: true, db: "up", time: new Date().toISOString() });
  } catch (e) {
    console.error("[admin] health failed:", e);
    res.status(500).json({ ok: false, db: "down" });
  }
});

// GET /api/admin/stats
router.get("/admin/stats", authGuard, adminOnly, async (_req, res) => {
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

// GET /api/admin/users
router.get("/admin/users", authGuard, adminOnly, async (_req, res) => {
  if (!hasModel("user")) return res.json([]);
  try {
    const rows = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(rows);
  } catch (e) {
    console.error("[admin] list users failed:", e);
    res.json([]);
  }
});

// POST /api/admin/users  { email, name?, role?, password? }
router.post("/admin/users", authGuard, adminOnly, async (req, res) => {
  if (!hasModel("user")) return res.status(503).json({ error: "User model not available" });
  try {
    const { email, name, role = "user", password = "ChangeMe@123" } = req.body || {};
    if (!email) return res.status(400).json({ error: "email is required" });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const row = await prisma.user.create({
      data: { email: String(email).toLowerCase().trim(), name: name || null, role, isActive: true, passwordHash },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    res.status(201).json(row);
  } catch (e) {
    console.error("[admin] create user failed:", e);
    res.status(400).json({ error: "Create user failed" });
  }
});

// PUT /api/admin/users/:id  { name?, role?, isActive? }
router.put("/admin/users/:id", authGuard, adminOnly, async (req, res) => {
  if (!hasModel("user")) return res.status(503).json({ error: "User model not available" });
  try {
    const id = toInt(req.params.id);
    const { name, role, isActive } = req.body || {};
    const row = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(isActive !== undefined ? { isActive: !!isActive } : {}),
      },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    res.json(row);
  } catch (e) {
    console.error("[admin] update user failed:", e);
    if (e?.code === "P2025") return res.status(404).json({ error: "User not found" });
    res.status(400).json({ error: "Update user failed" });
  }
});

// POST /api/admin/users/:id/reset-password  { password }
router.post("/admin/users/:id/reset-password", authGuard, adminOnly, async (req, res) => {
  if (!hasModel("user")) return res.status(503).json({ error: "User model not available" });
  try {
    const id = toInt(req.params.id);
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: "password required" });
    const passwordHash = await bcrypt.hash(String(password), 10);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
    res.json({ ok: true });
  } catch (e) {
    console.error("[admin] reset password failed:", e);
    if (e?.code === "P2025") return res.status(404).json({ error: "User not found" });
    res.status(400).json({ error: "Reset password failed" });
  }
});

// DELETE /api/admin/users/:id
router.delete("/admin/users/:id", authGuard, adminOnly, async (req, res) => {
  if (!hasModel("user")) return res.status(503).json({ error: "User model not available" });
  try {
    const id = toInt(req.params.id);
    await prisma.user.delete({ where: { id } });
    res.json({ ok: true });
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
router.get("/admin/sessions", authGuard, adminOnly, async (_req, res) => {
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
router.delete("/admin/sessions/:id", authGuard, adminOnly, async (req, res) => {
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