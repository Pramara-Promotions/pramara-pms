// api/routes/uploads.js
const express = require("express");
const { z } = require("zod");
const { PrismaClient } = require("@prisma/client");
const { authGuard } = require("../middleware/authGuard");
const { permissionGuard } = require("../middleware/permissionGuard");
const { getPresignedPutUrl, MAX_UPLOAD_BYTES, ALLOWED_CT } = require("../lib/storage");

const prisma = new PrismaClient();
const router = express.Router();

const initSchema = z.object({
  projectId: z.number().int().positive(),
  filename: z.string().min(1),
  contentType: z.string().optional().nullable(),
  sizeBytes: z.number().int().nonnegative().optional().nullable(),
});

router.post(
  "/uploads/init",
  authGuard,
  permissionGuard("DOC_UPLOAD"),
  async (req, res) => {
    try {
      const parsed = initSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
      }

      const { projectId, filename, contentType, sizeBytes } = parsed.data;

      // Confirm project exists
      const proj = await prisma.project.findUnique({ where: { id: projectId } });
      if (!proj) return res.status(404).json({ error: "Project not found" });

      // Check content type + size before generating upload URL
      if (contentType && !ALLOWED_CT.has(contentType)) {
        return res.status(415).json({ error: `Unsupported content-type: ${contentType}` });
      }
      if (sizeBytes != null && sizeBytes > MAX_UPLOAD_BYTES) {
        const maxMb = Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024));
        return res.status(413).json({ error: `File too large. Max ${maxMb}MB.` });
      }

      const { url, key } = await getPresignedPutUrl({
        projectId,
        filename,
        contentType,
        sizeBytes,
      });

      return res.json({ url, key });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Failed to initialize upload" });
    }
  }
);

module.exports = { uploadsRouter: router };
