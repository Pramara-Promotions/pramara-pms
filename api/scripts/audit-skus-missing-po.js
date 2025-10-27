// api/scripts/audit-skus-missing-po.js
// Lists SKUs that are missing a PO or reference a non-existent PO
// Usage: node api/scripts/audit-skus-missing-po.js <projectId>

const { PrismaClient } = require('@prisma/client');

async function main() {
  const projectId = Number(process.argv[2]);
  if (!Number.isFinite(projectId)) {
    console.error('Usage: node api/scripts/audit-skus-missing-po.js <projectId>');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const skus = await prisma.projectSku.findMany({ where: { projectId } });
    const pos = await prisma.purchaseOrder.findMany({ where: { projectId } });
    const poSet = new Set(pos.map(p => p.poNumber));

    const missing = [];
    for (const s of skus) {
      const po = (s.poNumber || '').trim();
      if (!po || !poSet.has(po)) missing.push(s);
    }

    console.log(`Project ${projectId}: ${skus.length} SKUs, ${pos.length} POs`);
    if (missing.length === 0) {
      console.log('✅ All SKUs reference a valid PO.');
      return;
    }

    console.log(`⚠️  ${missing.length} SKU(s) missing or invalid PO:`);
    for (const s of missing) {
      console.log(` - id=${s.id} code=${s.code} poNumber=${s.poNumber ?? '(null)'}`);
    }

    console.log('\nNext steps:');
    console.log('  1) Upload the PO PDF in the UI, or create PurchaseOrder rows via API.');
    console.log('  2) Edit these SKUs to attach the correct PO number.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
