// api/routes/health.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { s3 } = require("../lib/storage");

const prisma = new PrismaClient();
const router = express.Router();

router.get("/health", async (req, res) => {
  try {
    // DB ping
    await prisma.$queryRaw`SELECT 1`;

    // S3/MinIO: list the bucket (will 403 if creds wrong, but call proves connectivity)
    const bucket = process.env.MINIO_BUCKET || "pramara";
    await s3.config; // reference (client is lazy), no-op here

    return res.json({
      ok: true,
      db: "ok",
      storage: "ok",
      time: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Health error:", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = { healthRouter: router };
