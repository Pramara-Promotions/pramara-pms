const { PrismaClient } = require('@prisma/client');
const { subDays, subHours } = require('date-fns');

const prisma = new PrismaClient();

async function cleanAndReseed() {
  try {
    console.log('🧹 Cleaning old data...\n');
    
    // Delete old ProductionEntry records (before last 30 days)
    const deletedProduction = await prisma.productionEntry.deleteMany({
      where: {
        startTime: { lt: subDays(new Date(), 30) }
      }
    });
    console.log(`Deleted ${deletedProduction.count} old ProductionEntry records`);
    
    // Delete old ShiftEntry records (before last 30 days)
    const deletedShifts = await prisma.shiftEntry.deleteMany({
      where: {
        shiftDate: { lt: subDays(new Date(), 30) }
      }
    });
    console.log(`Deleted ${deletedShifts.count} old ShiftEntry records`);
    
    // Delete all QCSubmission records
    const deletedQC = await prisma.qCSubmission.deleteMany({});
    console.log(`Deleted ${deletedQC.count} QCSubmission records\n`);
    
    console.log('📊 Reseeding with current date data...\n');
    
    // Get projects and shifts
    const projects = await prisma.project.findMany({ select: { id: true } });
    if (projects.length === 0) {
      console.log('❌ No projects found');
      return;
    }
    
    // Get existing shifts
    let shiftId = 'shift-default';
    try {
      const shift = await prisma.shift.findFirst({ select: { id: true } });
      if (shift) shiftId = shift.id;
    } catch {
      console.log('⚠️  No shifts found, will skip ProductionEntry');
    }
    
    // Get or create a station
    let stationId = 1;
    try {
      const station = await prisma.station.findFirst({ select: { id: true } });
      if (station) stationId = station.id;
    } catch {}
    
    // Seed Production data
    console.log('📦 Creating ProductionEntry records...');
    if (shiftId && shiftId !== 'shift-default') {
      for (let i = 0; i < 50; i++) {
        const daysAgo = Math.floor(Math.random() * 7);
        const hoursAgo = Math.floor(Math.random() * 24);
        const startTime = subHours(subDays(new Date(), daysAgo), hoursAgo);
        
        await prisma.productionEntry.create({
          data: {
            id: `prod-${Date.now()}-${i}`,
            projectId: projects[Math.floor(Math.random() * projects.length)].id,
            stationId: stationId,
            shiftId: shiftId,
            startTime,
            endTime: new Date(startTime.getTime() + 1000 * 60 * 60),
            targetQty: Math.floor(Math.random() * 200) + 100,
            actualQty: Math.floor(Math.random() * 200) + 50,
            rejectedQty: Math.floor(Math.random() * 50),
            outputVariance: Math.random() * 20 - 10,
            operatorId: Math.floor(Math.random() * 1000).toString(),
            notes: `Production data`,
            materialUsed: {},
            createdAt: new Date()
          }
        });
      }
      console.log('✅ Created 50 ProductionEntry records');
    } else {
      console.log('⚠️  Skipping ProductionEntry (no shifts found)');
    }
    
    // Seed Shift data
    console.log('👥 Creating ShiftEntry records...');
    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 7);
      const shiftDate = subDays(new Date(), daysAgo);
      shiftDate.setHours(0, 0, 0, 0);
      
      const shiftType = ['morning', 'afternoon', 'night'][Math.floor(Math.random() * 3)];
      const shiftTimes = {
        morning: { start: 6, end: 14 },
        afternoon: { start: 14, end: 22 },
        night: { start: 22, end: 6 }
      };
      const times = shiftTimes[shiftType];
      
      const shiftStartTime = new Date(shiftDate);
      shiftStartTime.setHours(times.start, 0, 0, 0);
      
      const shiftEndTime = new Date(shiftDate);
      shiftEndTime.setHours(times.end, 0, 0, 0);
      if (shiftType === 'night') {
        shiftEndTime.setDate(shiftEndTime.getDate() + 1);
      }
      
      await prisma.shiftEntry.create({
        data: {
          id: `shift-entry-${Date.now()}-${i}`,
          projectId: projects[Math.floor(Math.random() * projects.length)].id,
          stationId: stationId,
          shiftDate,
          shiftType,
          shiftStartTime,
          shiftEndTime,
          supervisorId: `supervisor-${Math.floor(Math.random() * 5)}`,
          workersPresent: Math.floor(Math.random() * 20) + 5,
          workersAbsent: Math.floor(Math.random() * 3),
          totalProduced: Math.floor(Math.random() * 300) + 100,
          qualityPassed: Math.floor(Math.random() * 250) + 50,
          qualityRejected: Math.floor(Math.random() * 30),
          efficiency: Math.random() * 100,
          notes: `Shift data`,
          createdBy: `user-${Math.floor(Math.random() * 10)}`,
          createdAt: new Date()
        }
      });
    }
    console.log('✅ Created 50 ShiftEntry records');
    
    // Seed QC data
    console.log('✅ Creating QCSubmission records...');
    let templateId = null;
    try {
      const template = await prisma.qCChecklistTemplate.findFirst({ select: { id: true } });
      templateId = template?.id || 'tpl-default';
    } catch {
      templateId = 'tpl-default';
    }
    
    for (let i = 0; i < 40; i++) {
      const daysAgo = Math.floor(Math.random() * 7);
      const hoursAgo = Math.floor(Math.random() * 24);
      const submittedAt = subHours(subDays(new Date(), daysAgo), hoursAgo);
      
      await prisma.qCSubmission.create({
        data: {
          id: `qc-${Date.now()}-${i}`,
          templateId,
          projectId: projects[Math.floor(Math.random() * projects.length)].id,
          stationId: stationId,
          submittedAt,
          overallPass: Math.random() > 0.2,
          shift: ['morning', 'afternoon', 'night'][Math.floor(Math.random() * 3)],
          operatorId: Math.floor(Math.random() * 1000).toString(),
          notes: `QC data`,
          photos: [],
          submittedBy: `inspector-${Math.floor(Math.random() * 10)}`
        }
      });
    }
    console.log('✅ Created 40 QCSubmission records');
    
    console.log('\n✨ Clean and reseed complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanAndReseed();
