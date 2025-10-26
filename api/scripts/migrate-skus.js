// api/scripts/migrate-skus.js
// Copy ProjectSku rows from a SOURCE database into current TARGET database
// Usage:
//   NODE_OPTIONS=--no-warnings node api/scripts/migrate-skus.js <projectId>
// Env:
//   SOURCE_DATABASE_URL=postgresql://...

const { PrismaClient } = require('@prisma/client');

async function main() {
  const projectId = Number(process.argv[2]);
  if (!Number.isFinite(projectId)) {
    console.error('Usage: node api/scripts/migrate-skus.js <projectId>');
    process.exit(1);
  }
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  if (!sourceUrl) {
    console.error('Missing SOURCE_DATABASE_URL env');
    process.exit(1);
  }

  // Two clients: source (override URL) and target (current env .env)
  const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
  const target = new PrismaClient();

  try {
    const rows = await source.projectSku.findMany({ where: { projectId } });
    console.log(`Found ${rows.length} SKUs in SOURCE for project ${projectId}`);
    if (rows.length === 0) return;

    // Upsert into target, keyed by (projectId, code)
    for (const r of rows) {
      await target.projectSku.upsert({
        where: { projectId_code: { projectId: r.projectId, code: r.code } },
        create: {
          projectId: r.projectId,
          poNumber: r.poNumber,
          code: r.code,
          name: r.name,
          color: r.color,
          type: r.type,
          orderQty: r.orderQty,
          attributes: r.attributes,
        },
        update: {
          poNumber: r.poNumber,
          name: r.name,
          color: r.color,
          type: r.type,
          orderQty: r.orderQty,
          attributes: r.attributes,
        },
      });
    }

    console.log('Migration complete.');
  } finally {
    await Promise.allSettled([source.$disconnect(), target.$disconnect()]);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
