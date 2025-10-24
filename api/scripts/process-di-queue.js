#!/usr/bin/env node
// api/scripts/process-di-queue.js
const { PrismaClient } = require('@prisma/client');
const { getPresignedGetUrl } = require('../lib/storage');
const { documentIntelligence } = require('../lib/documentIntelligence');

const prisma = new PrismaClient();

async function processOnce(limit = 5) {
  const jobs = await prisma.documentExtractionJob.findMany({
    where: { status: { in: ['queued', 'processing'] } },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
  for (const job of jobs) {
    try {
      console.log('Processing job', job.id, job.filename);
      await prisma.documentExtractionJob.update({ where: { id: job.id }, data: { status: 'processing', startedAt: new Date() } });
      if (!job.fileKey) {
        throw new Error('No fileKey to fetch');
      }
      const { url } = await getPresignedGetUrl({ key: job.fileKey });
      const resp = await fetch(url);
      const buffer = Buffer.from(await resp.arrayBuffer());
      await documentIntelligence.processJob(job.id, buffer);
    } catch (e) {
      console.error('Job failed', job.id, e.message);
      await prisma.documentExtractionJob.update({ where: { id: job.id }, data: { status: 'failed', error: e.message } });
    }
  }
}

async function main() {
  const once = process.argv.includes('--once');
  if (once) {
    await processOnce();
    process.exit(0);
  }
  // Simple poller
  while (true) {
    await processOnce();
    await new Promise(r => setTimeout(r, 5000));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
