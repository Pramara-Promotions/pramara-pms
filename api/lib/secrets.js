// api/lib/secrets.js
// Simple AES-256-GCM encrypt/decrypt utilities for storing secrets at rest.

const crypto = require('crypto');

const KEY = (process.env.ENCRYPTION_KEY || '').padEnd(32, '0').slice(0, 32); // 32 bytes

function requireKey() {
  if (!process.env.ENCRYPTION_KEY) {
    console.warn('[secrets] ENCRYPTION_KEY not set. Using weak default for DEV ONLY.');
  }
}

function encrypt(plain) {
  if (plain == null) return null;
  requireKey();
  const iv = crypto.randomBytes(12); // GCM nonce
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(KEY), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decrypt(b64) {
  if (!b64) return null;
  requireKey();
  try {
    const buf = Buffer.from(b64, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(KEY), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  } catch (e) {
    console.warn('[secrets] decrypt failed:', e?.message);
    return null;
  }
}

module.exports = { encrypt, decrypt };
