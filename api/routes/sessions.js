// api/routes/sessions.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { z } = require("zod");
const { authGuard } = require("../middleware/authGuard");
const { permissionGuard } = require("../middleware/permissionGuard");

const prisma = new PrismaClient();
const router = express.Router();

function isSuperAdmin(me) {
  if (!me?.roles) return false;
  // authGuard attaches roles as array of RoleAssignment objects or strings (depending on your setup)
  return me.roles.some((r) => r?.role?.name === "Super Admin" || r === "Super Admin" || r?.name === "Super Admin");
}

// List sessions for current user (or any user if Super Admin + query userId=X)
router.get("/sessions/me", authGuard, async (req, res) => {
  try {
    const q = z
      .object({
        userId: z.string().optional(), // only honored for Super Admin
      })
      .parse(req.query);

    const targetUserId = isSuperAdmin(req.auth.user) && q.userId ? Number(q.userId) : req.auth.user.id;

    const sessions = await prisma.session.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        userAgent: true,
        ip: true,
        createdAt: true,
        expiresAt: true,
        refreshTokenHash: false,
      },
    });

    res.json(sessions);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

// Revoke ONE session by id
router.delete("/sessions/:id", authGuard, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const sess = await prisma.session.findUnique({ where: { id } });
    if (!sess) return res.status(404).json({ error: "Not found" });

    const me = req.auth.user;
    if (sess.userId !== me.id && !isSuperAdmin(me)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await prisma.session.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to revoke session" });
  }
});

// Revoke all OTHER sessions for current user (keep current)
router.delete("/sessions", authGuard, async (req, res) => {
  try {
    const me = req.auth.user;

    // Try to detect current session by refresh token hash if you attach it.
    // If not available, we’ll just nuke all; adjust if you store current session id in req.auth.
    await prisma.session.deleteMany({
      where: { userId: me.id },
    });

    // Optionally recreate a new session here; but since access token is in memory, user will re-login on next refresh.
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to revoke sessions" });
  }
});

module.exports = { sessionsRouter: router };
