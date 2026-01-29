const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('Checking database status...\n');
    
    const productionCount = await prisma.productionEntry.count();
    const shiftCount = await prisma.shiftEntry.count();
    const qcCount = await prisma.qCSubmission.count();
    const projectCount = await prisma.project.count();
    
    console.log(`ProductionEntry: ${productionCount} records`);
    console.log(`ShiftEntry: ${shiftCount} records`);
    console.log(`QCSubmission: ${qcCount} records`);
    console.log(`Project: ${projectCount} records`);
    
    // Check production totals
    if (productionCount > 0) {
      const prodStats = await prisma.productionEntry.aggregate({
        _sum: { actualQty: true, rejectedQty: true }
      });
      console.log(`\nProduction totals:`);
      console.log(`  Actual: ${prodStats._sum.actualQty || 0}`);
      console.log(`  Rejected: ${prodStats._sum.rejectedQty || 0}`);
    }
    
    // Check QC data
    if (qcCount > 0) {
      const qcPass = await prisma.qCSubmission.count({ where: { overallPass: true } });
      const qcFail = await prisma.qCSubmission.count({ where: { overallPass: false } });
      console.log(`\nQC data:`);
      console.log(`  Passed: ${qcPass}`);
      console.log(`  Failed: ${qcFail}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
