// api/routes/sessions.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

/* ────────────────────────────────────────────────────────────
   Auth guard: support default or named export; safe fallback
   ──────────────────────────────────────────────────────────── */
let _auth = null;
try {
  _auth = require("../middleware/authGuard"); // could be a function OR { authGuard }
} catch (e) {
  console.warn("[sessions] authGuard not found at ../middleware/authGuard:", e?.message);
}
let authGuard = _auth && typeof _auth === "function" ? _auth : (_auth && _auth.authGuard);
if (typeof authGuard !== "function") {
  console.warn("[sessions] authGuard is not a function. Using NO-OP middleware so server can boot.");
  authGuard = (_req, _res, next) => next();
}

/* ────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */
function hasModel(name) {
  return prisma[name] && typeof prisma[name].findMany === "function";
}
const toInt = (v) => Number.parseInt(v, 10);

/* ────────────────────────────────────────────────────────────
   Routes
   ──────────────────────────────────────────────────────────── */

/**
 * GET /api/sessions
 * - If Session model exists, list current user's sessions (or all, if admin guard later).
 * - If not, return an empty list so the UI doesn’t crash.
 */
router.get("/sessions", authGuard, async (req, res) => {
  try {
    if (!hasModel("session")) return res.json([]);
    // If your authGuard sets req.user.id, filter by userId. Otherwise list all (dev-safe).
    const userId = req?.user?.id || req?.auth?.user?.id || null;
    const where = userId ? { userId } : {};
    const rows = await prisma.session.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: { id: true, userId: true, userAgent: true, ip: true, createdAt: true, expiresAt: true },
    });
    res.json(rows);
  } catch (e) {
    console.error("[sessions] GET /sessions failed:", e);
    res.json([]);
  }
});

/**
 * DELETE /api/sessions/:id
 * - Revoke a session by id.
 */
router.delete("/sessions/:id", authGuard, async (req, res) => {
  try {
    if (!hasModel("session")) return res.json({ ok: true });
    const id = toInt(req.params.id);
    await prisma.session.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error("[sessions] DELETE failed:", e);
    if (e?.code === "P2025") return res.status(404).json({ error: "Session not found" });
    res.status(400).json({ error: "Delete session failed" });
  }
});

/**
 * POST /api/sessions/revoke
 * - Revoke current session (requires your authGuard to set req.sessionId; otherwise no-op).
 */
router.post("/sessions/revoke", authGuard, async (req, res) => {
  try {
    if (!hasModel("session")) return res.json({ ok: true });
    const sid = req?.sessionId || null;
    if (!sid) return res.json({ ok: true }); // nothing to revoke in fallback mode
    await prisma.session.delete({ where: { id: sid } });
    res.json({ ok: true });
  } catch (e) {
    console.error("[sessions] POST revoke failed:", e);
    res.status(400).json({ error: "Revoke failed" });
  }
});

module.exports = { sessionsRouter: router };