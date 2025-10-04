// api/lib/storage.js
const crypto = require("crypto");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const REQUIRED = [
  "MINIO_ENDPOINT",
  "MINIO_PORT",
  "MINIO_ACCESS_KEY",
  "MINIO_SECRET_KEY",
  "MINIO_BUCKET",
];
for (const k of REQUIRED) {
  if (!process.env[k]) {
    throw new Error(`[storage] Missing required env ${k}. Check your .env / docker-compose.`);
  }
}

const USE_SSL = String(process.env.MINIO_USE_SSL || "false").toLowerCase() === "true";
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

const s3 = new S3Client({
  forcePathStyle: true,
  region: "us-east-1",
  endpoint: `http${USE_SSL ? "s" : ""}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
  },
});

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
    Bucket: process.env.MINIO_BUCKET,
    Key,
    ContentType: contentType || "application/octet-stream",
  });

  const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 }); // 5 min
  return { url, key: Key };
}

async function getPresignedGetUrl({ key }) {
  const cmd = new GetObjectCommand({
    Bucket: process.env.MINIO_BUCKET,
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
