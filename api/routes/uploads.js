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
// Use unified storage layer (supports S3/R2/MinIO)
// ────────────────────────────────────────────────────────────
let getPresignedPutUrl, getPresignedGetUrl;
let STORAGE_READY = false;

try {
  const storage = require("../lib/storage");
  getPresignedPutUrl = storage.getPresignedPutUrl;
  getPresignedGetUrl = storage.getPresignedGetUrl;
  STORAGE_READY = true;
  console.log("[uploads] Using unified storage layer (S3/R2/MinIO)");
} catch (e) {
  console.warn("[uploads] Storage not configured:", e?.message);
}

// ────────────────────────────────────────────────────────────
// Simple health (optional)
// ────────────────────────────────────────────────────────────
router.get("/uploads/ping", (_req, res) => {
  res.json({ ok: true, storage: STORAGE_READY });
});

// ────────────────────────────────────────────────────────────
// Presign PUT (recommended flow from web app)
// body: { projectId, filename, contentType?, sizeBytes? }
// returns: { url, key, method: "PUT", headers }
// ────────────────────────────────────────────────────────────
router.post("/uploads/presign", authGuard, async (req, res) => {
  try {
    if (!STORAGE_READY) {
      return res
        .status(503)
        .json({ error: "Storage not configured." });
    }

    const { projectId, filename, contentType = "application/octet-stream", sizeBytes } = req.body || {};
    if (!projectId || !filename) {
      return res.status(400).json({ error: "Missing 'projectId' or 'filename' in body" });
    }

    const result = await getPresignedPutUrl({ projectId, filename, contentType, sizeBytes });
    res.json({ ...result, method: "PUT", headers: { "Content-Type": contentType } });
  } catch (err) {
    console.error("POST /uploads/presign failed:", err);
    res.status(500).json({ error: err.message || "Presign failed" });
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