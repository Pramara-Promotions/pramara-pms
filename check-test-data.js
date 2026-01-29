const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('=== Checking Test Data Details ===\n');
    
    // Check Shift entries for dates
    const shifts = await prisma.shiftEntry.findMany({
      select: { id: true, shiftDate: true, shiftType: true, workersPresent: true },
      orderBy: { shiftDate: 'desc' },
      take: 5
    });
    console.log('Latest ShiftEntry records:');
    shifts.forEach(s => {
      console.log(`  - ${s.shiftDate.toLocaleDateString()} (${s.shiftType}): ${s.workersPresent} workers`);
    });
    
    // Check if today's shifts exist
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(today);
    tomorrowStart.setDate(today.getDate() + 1);
    
    const todayShifts = await prisma.shiftEntry.count({
      where: {
        shiftDate: { gte: today, lt: tomorrowStart }
      }
    });
    console.log(`\nShifts for today: ${todayShifts}`);
    
    // Check ProductionEntry dates
    const prodEntries = await prisma.productionEntry.findMany({
      select: { id: true, startTime: true, actualQty: true },
      orderBy: { startTime: 'desc' },
      take: 3
    });
    console.log('\nLatest ProductionEntry records:');
    prodEntries.forEach(p => {
      console.log(`  - ${p.startTime.toLocaleDateString()}: ${p.actualQty} units`);
    });
    
    // Check Projects
    const projects = await prisma.project.findMany({
      select: { id: true, name: true, code: true },
      take: 5
    });
    console.log(`\nProjects: ${projects.length} found`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
