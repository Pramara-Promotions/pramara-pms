#!/usr/bin/env node
/**
 * Migrate all objects from local MinIO bucket -> cloud S3/R2 bucket.
 * Requires both MinIO_* and S3_* env vars present in .env.
 *
 * Usage:
 *   node scripts/migrate-minio-to-s3.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

function bool(v, d=false) { return String(v ?? d).toLowerCase() === 'true'; }

// Source: MinIO
const minio = new S3Client({
  region: 'us-east-1',
  endpoint: `http${bool(process.env.MINIO_USE_SSL)?'s':''}://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.MINIO_ACCESS_KEY, secretAccessKey: process.env.MINIO_SECRET_KEY },
});
const SRC_BUCKET = process.env.MINIO_BUCKET;

// Destination: S3/R2
const dest = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: bool(process.env.S3_FORCE_PATH_STYLE, false),
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
});
const DST_BUCKET = process.env.S3_BUCKET;

function requireEnv(name) { if (!process.env[name]) throw new Error(`Missing env ${name}`); }

async function* listAllObjects(client, bucket) {
  let token = undefined;
  for (;;) {
    const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
    const items = res.Contents || [];
    for (const it of items) yield it;
    if (!res.IsTruncated) break;
    token = res.NextContinuationToken;
  }
}

async function main() {
  // Validate envs
  ['MINIO_ENDPOINT','MINIO_PORT','MINIO_ACCESS_KEY','MINIO_SECRET_KEY','MINIO_BUCKET','S3_BUCKET','S3_ACCESS_KEY_ID','S3_SECRET_ACCESS_KEY'].forEach(requireEnv);

  console.log('Starting migration:');
  console.log(`  from minio://${SRC_BUCKET} at ${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`);
  console.log(`  to   s3://${DST_BUCKET}${process.env.S3_ENDPOINT?(' endpoint='+process.env.S3_ENDPOINT):''}`);

  let count = 0, skipped = 0, failed = 0;
  for await (const obj of listAllObjects(minio, SRC_BUCKET)) {
    const key = obj.Key;
    if (!key) continue;
    try {
      // Stream from MinIO
      const get = await minio.send(new GetObjectCommand({ Bucket: SRC_BUCKET, Key: key }));
      const body = get.Body; // stream

      // Upload to S3
      await dest.send(new PutObjectCommand({ Bucket: DST_BUCKET, Key: key, Body: body, ContentType: get.ContentType }));
      count++;
      if (count % 50 === 0) console.log(`  ...migrated ${count} objects`);
    } catch (e) {
      failed++;
      console.error('Failed:', key, e.message);
    }
  }

  console.log(`\nDone. Migrated: ${count}, Failed: ${failed}, Skipped: ${skipped}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
