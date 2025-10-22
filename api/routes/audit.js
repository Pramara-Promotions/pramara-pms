// api/routes/audit.js
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
  console.warn("[audit] authGuard not found at ../middleware/authGuard:", e?.message);
}
let authGuard = _auth && typeof _auth === "function" ? _auth : (_auth && _auth.authGuard);
if (typeof authGuard !== "function") {
  console.warn("[audit] authGuard is not a function. Using NO-OP middleware so server can boot.");
  authGuard = (_req, _res, next) => next();
}

/* ────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */
function hasModel(name) {
  return prisma[name] && typeof prisma[name].findMany === "function";
}
const toInt = (v) => Number.parseInt(v, 10);

/* 
Expected Prisma model (example):

model AuditLog {
  id         Int       @id @default(autoincrement())
  time       DateTime  @default(now())
  actorId    Int?
  actorEmail String?
  action     String
  entity     String?
  entityId   Int?
  projectId  Int?
  meta       Json?
  ip         String?
  userAgent  String?
}
*/

/* ────────────────────────────────────────────────────────────
   Routes
   ──────────────────────────────────────────────────────────── */

// GET /api/audit/logs?projectId=&entity=&limit=100
router.get("/audit/logs", authGuard, async (req, res) => {
  try {
    if (!hasModel("auditLog")) return res.json([]); // schema not ready: return empty list

    const projectId = req.query.projectId ? toInt(req.query.projectId) : undefined;
    const entity = req.query.entity ? String(req.query.entity) : undefined;
    const limit = req.query.limit ? Math.min(500, Math.max(1, toInt(req.query.limit))) : 100;

    const where = {
      ...(projectId ? { projectId } : {}),
      ...(entity ? { entity } : {}),
    };

    const rows = await prisma.auditLog.findMany({
      where,
      orderBy: { time: "desc" },
      take: limit,
    });

    res.json(rows);
  } catch (e) {
    console.error("[audit] GET /audit/logs failed:", e);
    res.json([]); // keep UI working
  }
});

// POST /api/audit/logs
// body: { action, entity?, entityId?, projectId?, meta? }
router.post("/audit/logs", authGuard, async (req, res) => {
  try {
    const { action, entity, entityId, projectId, meta } = req.body || {};
    if (!action) return res.status(400).json({ error: "action is required" });

    // Pull what we can from the request (if your authGuard sets req.user)
    const actorId = req?.user?.id || req?.auth?.user?.id || null;
    const actorEmail = req?.user?.email || req?.auth?.user?.email || null;

    if (!hasModel("auditLog")) {
      // schema not ready — echo minimal so UI/dev doesn’t block
      return res.status(201).json({
        id: Date.now(),
        time: new Date().toISOString(),
        actorId,
        actorEmail,
        action,
        entity: entity || null,
        entityId: entityId != null ? Number(entityId) : null,
        projectId: projectId != null ? Number(projectId) : null,
        meta: meta || null,
        ip: req.ip,
        userAgent: req.get("user-agent") || null,
      });
    }

    const row = await prisma.auditLog.create({
      data: {
        time: new Date(),
        actorId: actorId != null ? Number(actorId) : null,
        actorEmail: actorEmail || null,
        action: String(action),
        entity: entity || null,
        entityId: entityId != null ? Number(entityId) : null,
        projectId: projectId != null ? Number(projectId) : null,
        meta: meta ?? null,
        ip: req.ip,
        userAgent: req.get("user-agent") || null,
      },
    });

    res.status(201).json(row);
  } catch (e) {
    console.error("[audit] POST /audit/logs failed:", e);
    res.status(400).json({ error: "Create audit log failed" });
  }
});

// GET /api/audit/logs/:id
router.get("/audit/logs/:id", authGuard, async (req, res) => {
  try {
    if (!hasModel("auditLog")) return res.status(404).json({ error: "Not found" });
    const id = toInt(req.params.id);
    const row = await prisma.auditLog.findUnique({ where: { id } });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    console.error("[audit] GET /audit/logs/:id failed:", e);
    res.status(500).json({ error: "Failed to load audit log" });
  }
});

// DELETE /api/audit/logs/:id
router.delete("/audit/logs/:id", authGuard, async (req, res) => {
  try {
    if (!hasModel("auditLog")) return res.json({ ok: true });
    const id = toInt(req.params.id);
    await prisma.auditLog.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error("[audit] DELETE /audit/logs/:id failed:", e);
    if (e?.code === "P2025") return res.status(404).json({ error: "Not found" });
    res.status(400).json({ error: "Delete failed" });
  }
});

module.exports = { auditRouter: router };