// api/routes/uploads.js
const express = require("express");

const router = express.Router();

// ────────────────────────────────────────────────────────────
// Auth guard: support both default and named exports gracefully
// ────────────────────────────────────────────────────────────
let _auth = null;
try {
  _auth = require("../middleware/authGuard"); // could be a function OR { authGuard }
} catch (e) {
  console.warn("[uploads] authGuard not found at ../middleware/authGuard:", e?.message);
}
let authGuard = _auth && typeof _auth === "function" ? _auth : (_auth && _auth.authGuard);
if (typeof authGuard !== "function") {
  console.warn("[uploads] authGuard is not a function. Using NO-OP middleware so server can boot.");
  authGuard = (_req, _res, next) => next();
}

// ────────────────────────────────────────────────────────────
// Optional S3/MinIO client (gracefully handle missing deps/env)
// ────────────────────────────────────────────────────────────
let S3Client, PutObjectCommand, getSignedUrl;
let STORAGE_READY = false;
let s3 = null;

// Read env (works for MinIO or AWS S3)
const {
  MINIO_ENDPOINT,
  MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY,
  MINIO_BUCKET,
  MINIO_REGION = "us-east-1",
  MINIO_USE_SSL = "false",
} = process.env;

try {
  // Try to import AWS SDK v3
  ({ S3Client, PutObjectCommand } = require("@aws-sdk/client-s3"));
  ({ getSignedUrl } = require("@aws-sdk/s3-request-presigner"));

  if (MINIO_ENDPOINT && MINIO_ACCESS_KEY && MINIO_SECRET_KEY && MINIO_BUCKET) {
    // Build endpoint (supports http(s)://host:port or just host:port)
    const endpoint =
      MINIO_ENDPOINT.startsWith("http://") || MINIO_ENDPOINT.startsWith("https://")
        ? MINIO_ENDPOINT
        : `${MINIO_USE_SSL === "true" ? "https://" : "http://"}${MINIO_ENDPOINT}`;

    s3 = new S3Client({
      region: MINIO_REGION,
      endpoint,
      forcePathStyle: true, // important for MinIO
      credentials: {
        accessKeyId: MINIO_ACCESS_KEY,
        secretAccessKey: MINIO_SECRET_KEY,
      },
    });

    STORAGE_READY = true;
    console.log(`[uploads] Storage ready. Bucket=${MINIO_BUCKET} Endpoint=${endpoint}`);
  } else {
    console.warn(
      "[uploads] Storage env incomplete. Set MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET"
    );
  }
} catch (e) {
  console.warn(
    "[uploads] @aws-sdk/client-s3 or @aws-sdk/s3-request-presigner not installed. Presign disabled."
  );
}

// ────────────────────────────────────────────────────────────
// Simple health (optional)
// ────────────────────────────────────────────────────────────
router.get("/uploads/ping", (_req, res) => {
  res.json({ ok: true, storage: STORAGE_READY });
});

// ────────────────────────────────────────────────────────────
// Presign PUT (recommended flow from web app)
// body: { key, contentType? }
// returns: { url, fields? } (PUT URL here; for POST policy you'd return fields)
// ────────────────────────────────────────────────────────────
router.post("/uploads/presign", authGuard, async (req, res) => {
  try {
    if (!STORAGE_READY || !s3) {
      return res
        .status(503)
        .json({ error: "Storage not configured. Install AWS SDK and set MINIO_* env." });
    }

    const { key, contentType = "application/octet-stream" } = req.body || {};
    if (!key || typeof key !== "string") {
      return res.status(400).json({ error: "Missing 'key' in body" });
    }

    const putCmd = new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: key,
      ContentType: contentType,
      // You can set ACL/Metadata here if needed
    });

    // 10 minutes expiry
    const url = await getSignedUrl(s3, putCmd, { expiresIn: 600 });

    res.json({ url, method: "PUT", headers: { "Content-Type": contentType } });
  } catch (err) {
    console.error("POST /uploads/presign failed:", err);
    res.status(500).json({ error: "Presign failed" });
  }
});

// ────────────────────────────────────────────────────────────
// (Optional) Direct multipart upload endpoint (local dev only)
// Keeping a stub so router.post exists and never crashes.
// If you want to actually accept multipart files here, wire multer.
// ────────────────────────────────────────────────────────────
router.post("/uploads", authGuard, async (_req, res) => {
  if (!STORAGE_READY) {
    return res
      .status(503)
      .json({ error: "Direct upload not enabled. Use /uploads/presign + PUT from client." });
  }
  // If you implement multer later, handle _req.file(s) here and put to S3.
  return res.status(400).json({ error: "Use presigned PUT flow" });
});

module.exports = { uploadsRouter: router };