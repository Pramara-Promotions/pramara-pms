const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const productionEntries = await prisma.productionEntry.count();
  const documents = await prisma.projectDocument.count();
  const alerts = await prisma.alert.count();
  const dailyPlans = await prisma.dailyPlanGeneration.count();

  console.log('\n=== FUNCTIONAL DATA TOTALS ===');
  console.log(`Production Entries: ${productionEntries}`);
  console.log(`Documents: ${documents}`);
  console.log(`Alerts: ${alerts}`);
  console.log(`Daily Plans: ${dailyPlans}`);
  console.log('================================\n');

  await prisma.$disconnect();
}

check();
