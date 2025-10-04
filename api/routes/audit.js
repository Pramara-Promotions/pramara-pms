// api/routes/audit.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { z } = require("zod");
const { authGuard } = require("../middleware/authGuard");
const { permissionGuard } = require("../middleware/permissionGuard");

const prisma = new PrismaClient();
const router = express.Router();

const querySchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  limit: z.string().optional(),   // parse to number
  cursor: z.string().optional(),  // last seen id for pagination
});

router.get(
  "/audit",
  authGuard,
  permissionGuard("AUDIT_READ"),
  async (req, res) => {
    try {
      const q = querySchema.parse(req.query);
      const limit = Math.min(Math.max(parseInt(q.limit || "20", 10), 1), 100);
      const cursorId = q.cursor ? Number(q.cursor) : null;

      const where = {};
      if (q.userId) where.userId = Number(q.userId);
      if (q.action) where.action = q.action;

      const items = await prisma.auditLog.findMany({
        where,
        orderBy: { id: "desc" },
        take: limit,
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
        select: {
          id: true,
          userId: true,
          action: true,
          entity: true,
          entityId: true,
          meta: true,
          ip: true,
          userAgent: true,
          createdAt: true,
        },
      });

      const nextCursor = items.length ? items[items.length - 1].id : null;
      res.json({ items, nextCursor });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch audit" });
    }
  }
);

module.exports = { auditRouter: router };
