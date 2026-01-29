const { PrismaClient } = require('@prisma/client');
const { subDays, startOfDay, endOfDay } = require('date-fns');
const prisma = new PrismaClient();

(async () => {
  try {
    const days = 30;
    const startDate = subDays(new Date(), days);
    
    console.log('=== Dashboard Data Check (Last 30 days) ===\n');
    console.log(`Start Date: ${startDate.toLocaleDateString()}`);
    console.log(`End Date: ${new Date().toLocaleDateString()}\n`);
    
    // Production
    const prodStats = await prisma.productionEntry.aggregate({
      where: { startTime: { gte: startDate } },
      _sum: { actualQty: true, rejectedQty: true },
      _count: true
    });
    console.log(`Production (last ${days} days):`);
    console.log(`  Total Qty: ${prodStats._sum.actualQty || 0}`);
    console.log(`  Rejected: ${prodStats._sum.rejectedQty || 0}`);
    console.log(`  Entries: ${prodStats._count}`);
    
    // Quality
    const qcStats = await prisma.qCSubmission.groupBy({
      by: ['overallPass'],
      where: { submittedAt: { gte: startDate } },
      _count: true
    });
    console.log(`\nQC (last ${days} days):`);
    console.log(`  Total Submissions: ${qcStats.reduce((sum, g) => sum + g._count, 0)}`);
    qcStats.forEach(g => {
      console.log(`    ${g.overallPass ? 'Passed' : 'Failed'}: ${g._count}`);
    });
    
    // Workforce
    const workforceStats = await prisma.shiftEntry.aggregate({
      where: { shiftDate: { gte: startDate } },
      _sum: { workersPresent: true }
    });
    console.log(`\nWorkforce (last ${days} days):`);
    console.log(`  Total Workers: ${workforceStats._sum.workersPresent || 0}`);
    
    // Active today
    const today = startOfDay(new Date());
    const activeToday = await prisma.shiftEntry.aggregate({
      where: {
        shiftDate: { gte: today, lte: endOfDay(new Date()) }
      },
      _sum: { workersPresent: true }
    });
    console.log(`  Active Today: ${activeToday._sum.workersPresent || 0}`);
    
    // Projects
    const projectCount = await prisma.project.count();
    console.log(`\nProjects:`);
    console.log(`  Total: ${projectCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
