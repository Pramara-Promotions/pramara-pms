// api/lib/storage.js
const crypto = require("crypto");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Support both MinIO (self-hosted S3) and AWS/R2 S3
// Mode selection priority:
// - If S3_ACCESS_KEY_ID is present OR STORAGE_DRIVER === 's3', use S3_* vars
// - Otherwise, fallback to MINIO_* vars

const USE_S3 = !!process.env.S3_ACCESS_KEY_ID || String(process.env.STORAGE_DRIVER || '').toLowerCase() === 's3';

function requireEnv(keys, label) {
  for (const k of keys) {
    if (!process.env[k]) throw new Error(`[storage] Missing required env ${k} for ${label}`);
  }
}

let BUCKET;
let s3;

if (USE_S3) {
  // AWS S3 / Cloudflare R2 (S3-compatible)
  requireEnv(["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"], "S3");
  BUCKET = process.env.S3_BUCKET;
  const region = process.env.S3_REGION || "us-east-1";
  const endpoint = process.env.S3_ENDPOINT; // optional for AWS; required for R2
  const forcePathStyle = String(process.env.S3_FORCE_PATH_STYLE || "false").toLowerCase() === "true";

  s3 = new S3Client({
    region,
    ...(endpoint ? { endpoint } : {}),
    forcePathStyle,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
} else {
  // MinIO (local dev)
  requireEnv(["MINIO_ENDPOINT", "MINIO_PORT", "MINIO_ACCESS_KEY", "MINIO_SECRET_KEY", "MINIO_BUCKET"], "MinIO");
  const USE_SSL = String(process.env.MINIO_USE_SSL || "false").toLowerCase() === "true";
  BUCKET = process.env.MINIO_BUCKET;
  s3 = new S3Client({
    forcePathStyle: true,
    region: "us-east-1",
    endpoint: `http${USE_SSL ? "s" : ""}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY,
      secretAccessKey: process.env.MINIO_SECRET_KEY,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 20 * 1024 * 1024); // 20MB

// keep it tight, extend later if needed
const ALLOWED_CT = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",       // xlsx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"// pptx
]);

// s3 client is configured above depending on mode

function sanitizeName(name) {
  return name.replace(/[^\w.\- ]+/g, "_").slice(0, 160);
}

function buildKey(projectId, original) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safe = sanitizeName(original || "file");
  const rand = crypto.randomUUID();
  return `projects/${projectId}/${yyyy}/${mm}/${rand}-${safe}`;
}

function ensureAllowed(contentType, sizeBytes) {
  if (sizeBytes != null && sizeBytes > MAX_UPLOAD_BYTES) {
    const maxMb = Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024));
    const curMb = Math.ceil(sizeBytes / (1024 * 1024));
    const msg = `File too large (${curMb}MB). Max allowed is ${maxMb}MB.`;
    const err = new Error(msg);
    err.code = "FILE_TOO_LARGE";
    throw err;
  }
  if (contentType && !ALLOWED_CT.has(contentType)) {
    const err = new Error(`Disallowed content-type: ${contentType}`);
    err.code = "BAD_CONTENT_TYPE";
    throw err;
  }
}

async function getPresignedPutUrl({ projectId, filename, contentType, sizeBytes }) {
  ensureAllowed(contentType, sizeBytes);
  const Key = buildKey(projectId, filename);

  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key,
    ContentType: contentType || "application/octet-stream",
  });

  const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 }); // 5 min
  return { url, key: Key };
}

async function getPresignedGetUrl({ key }) {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 });
  return { url };
}

module.exports = {
  s3,
  getPresignedPutUrl,
  getPresignedGetUrl,
  MAX_UPLOAD_BYTES,
  ALLOWED_CT,
};
