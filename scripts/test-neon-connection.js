#!/usr/bin/env node
// Quick Neon connectivity test using PrismaClient
// Usage:
//   set NEON_URL or DATABASE_URL env var, then run:
//     node scripts/test-neon-connection.js

// Load .env if NEON_URL not set
if (!process.env.NEON_URL && !process.env.DATABASE_URL) {
  const path = require('path');
  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
}

// Read URL and set env BEFORE importing PrismaClient
const url = process.env.NEON_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('ERROR: Please set NEON_URL or DATABASE_URL to your Neon connection string.');
  process.exit(1);
}
process.env.DATABASE_URL = url; // must be set before requiring @prisma/client

const { PrismaClient } = require('@prisma/client');

async function main() {
  // Minor sanity output
  try {
    const { hostname } = new URL(process.env.DATABASE_URL);
    console.log(`Target host: ${hostname}`);
  } catch {}

  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe(
      'select version() as version, current_database() as db, current_user as usr'
    );
    const r = Array.isArray(rows) ? rows[0] : rows;
    console.log('\n✅ Connected to Neon!');
    console.log(`   version: ${r.version}`);
    console.log(`   database: ${r.db}`);
    console.log(`   user: ${r.usr}`);
    console.log();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Connection failed:');
    console.error(err.message || err);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
}

main();
