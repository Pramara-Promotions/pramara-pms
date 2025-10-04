// === FILE: api/routes/projectSkus.js ===
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { z } = require("zod");
const { authGuard } = require("../middleware/authGuard");
const { permissionGuard } = require("../middleware/permissionGuard");

const prisma = new PrismaClient();
const router = express.Router();

// zod schemas
const createSkuSchema = z.object({
  code: z.string().min(1),
  description: z.string().optional().nullable(),
  quantity: z.number().int().nonnegative().default(0),
});

router.get("/projects/:id/skus", authGuard, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const items = await prisma.projectSku.findMany({
      where: { projectId },
      orderBy: { id: "desc" },
    });
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load SKUs" });
  }
});

router.post(
  "/projects/:id/skus",
  authGuard,
  permissionGuard("PROJECT_EDIT"), // adjust if you want a different perm
  async (req, res) => {
    try {
      const projectId = Number(req.params.id);
      const parsed = createSkuSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
      }

      const { code, description, quantity } = parsed.data;

      // ensure project exists
      const projectExists = await prisma.project.findUnique({ where: { id: projectId } });
      if (!projectExists) return res.status(404).json({ error: "Project not found" });

      const created = await prisma.projectSku.create({
        data: { projectId, code, description: description || null, quantity },
      });

      res.status(201).json(created);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to create SKU" });
    }
  }
);

router.delete(
  "/projects/:id/skus/:skuId",
  authGuard,
  permissionGuard("PROJECT_EDIT"),
  async (req, res) => {
    try {
      const skuId = Number(req.params.skuId);
      await prisma.projectSku.delete({ where: { id: skuId } });
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to delete SKU" });
    }
  }
);

module.exports = { projectSkusRouter: router };
