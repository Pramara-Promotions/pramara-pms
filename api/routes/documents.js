// === FILE: api/routes/documents.js ===
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { z } = require("zod");
const { authGuard } = require("../middleware/authGuard");
const { permissionGuard } = require("../middleware/permissionGuard");
const { presignGet, s3, bucket } = require("../lib/storage");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { audit } = require("../lib/audit");

const prisma = new PrismaClient();
const router = express.Router();

// ---------- Helpers ----------
const fileCreateSchema = z.object({
  name: z.string().min(1),
  storageKey: z.string().min(1),
  contentType: z.string().optional().nullable(),
});

// ---------- Routes ----------

/**
 * POST /api/projects/:id/documents/file
 * Body: { name, storageKey, contentType }
 * Creates a new document record and auto-increments version for same name.
 */
router.post(
  "/projects/:id/documents/file",
  authGuard,
  permissionGuard("DOC_UPLOAD"),
  async (req, res) => {
    try {
      const projectId = Number(req.params.id);
      const parsed = fileCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }
      const { name, storageKey, contentType } = parsed.data;

      // find current max version for this (projectId, name)
      const max = await prisma.projectDocument.aggregate({
        _max: { version: true },
        where: { projectId, name },
      });
      const nextVersion = (max._max.version || 0) + 1;

      const doc = await prisma.projectDocument.create({
        data: {
          projectId,
          name,
          storageKey,
          contentType: contentType || null,
          version: nextVersion,
        },
      });

      // audit
      await audit(req.auth.user.id, "DOC_UPLOAD", "PROJECT_DOCUMENT", doc.id, { projectId, name }, req);

      res.status(201).json(doc);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to save document" });
    }
  }
);

/**
 * GET /api/projects/:id/documents/:docId/download
 * -> { url } signed GET URL to download from storage
 */
router.get(
  "/projects/:id/documents/:docId/download",
  authGuard,
  permissionGuard("DOC_DOWNLOAD"),
  async (req, res) => {
    try {
      const docId = Number(req.params.docId);
      const doc = await prisma.projectDocument.findUnique({ where: { id: docId } });
      if (!doc || !doc.storageKey) return res.status(404).json({ error: "Not found" });

      const signed = await presignGet({ key: doc.storageKey, expiresSec: 300 });

      // audit
      await audit(req.auth.user.id, "DOC_DOWNLOAD", "PROJECT_DOCUMENT", doc.id, null, req);

      res.json({ url: signed.url });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Download failed" });
    }
  }
);

/**
 * DELETE /api/projects/:id/documents/:docId
 * Deletes DB record and (if present) the object from MinIO.
 */
router.delete(
  "/projects/:id/documents/:docId",
  authGuard,
  permissionGuard("DOC_DELETE"),
  async (req, res) => {
    try {
      const docId = Number(req.params.docId);
      const doc = await prisma.projectDocument.findUnique({ where: { id: docId } });
      if (!doc) return res.status(404).json({ error: "Not found" });

      // best-effort delete from storage
      if (doc.storageKey) {
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: doc.storageKey }));
        } catch (err) {
          console.warn("S3 delete failed (continuing):", err?.message || err);
        }
      }

      await prisma.projectDocument.delete({ where: { id: docId } });

      // audit
      await audit(req.auth.user.id, "DOC_DELETE", "PROJECT_DOCUMENT", docId, null, req);

      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Delete failed" });
    }
  }
);

module.exports = { documentsRouter: router };
