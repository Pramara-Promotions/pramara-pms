const { PrismaClient } = require('@prisma/client');
const { subDays, subHours } = require('date-fns');

const prisma = new PrismaClient();

async function seedRecentData() {
  try {
    console.log('📊 Seeding recent data for dashboard...\n');

    // Get all projects for reference
    const projects = await prisma.project.findMany({ select: { id: true } });
    if (projects.length === 0) {
      console.log('❌ No projects found. Please seed projects first.');
      return;
    }

    // Seed recent Production data (last 7 days)
    console.log('📦 Creating recent ProductionEntry records...');
    const productionCount = await prisma.productionEntry.count();
    // Always create new ones to ensure they're in the current date range
    if (productionCount < 50) {
      const toAdd = 50 - productionCount;
      console.log(`   Creating ${toAdd} new ProductionEntry records...`);
      
      for (let i = 0; i < toAdd; i++) {
        const daysAgo = Math.floor(Math.random() * 7);
        const hoursAgo = Math.floor(Math.random() * 24);
        const minutesAgo = Math.floor(Math.random() * 60);
        const startTime = subHours(subDays(new Date(), daysAgo), hoursAgo);
        startTime.setMinutes(startTime.getMinutes() - minutesAgo);
        
        await prisma.productionEntry.create({
          data: {
            projectId: projects[Math.floor(Math.random() * projects.length)].id,
            stationId: Math.floor(Math.random() * 10) + 1,
            shiftId: `shift-${Math.floor(Math.random() * 10)}`,
            startTime,
            endTime: new Date(startTime.getTime() + 1000 * 60 * 60),
            targetQty: Math.floor(Math.random() * 200) + 100,
            actualQty: Math.floor(Math.random() * 200) + 50,
            rejectedQty: Math.floor(Math.random() * 50),
            outputVariance: Math.random() * 20 - 10,
            operatorId: Math.floor(Math.random() * 1000).toString(),
            notes: `Recent production data`,
            materialUsed: {},
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
      console.log(`   ✅ Created ${toAdd} ProductionEntry records`);
    } else {
      console.log(`   ℹ️  ${productionCount} ProductionEntry records exist`);
    }

    // Seed recent ShiftEntry data (last 7 days)
    console.log('👥 Creating recent ShiftEntry records...');
    const shiftCount = await prisma.shiftEntry.count();
    // Always create new ones to ensure current dates
    if (shiftCount < 50) {
      const toAdd = 50 - shiftCount;
      console.log(`   Creating ${toAdd} new ShiftEntry records...`);
      
      for (let i = 0; i < toAdd; i++) {
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
            stationId: Math.floor(Math.random() * 10) + 1,
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
            notes: `Recent shift data`,
            createdBy: `user-${Math.floor(Math.random() * 10)}`,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
      console.log(`   ✅ Created ${toAdd} ShiftEntry records`);
    } else {
      console.log(`   ℹ️  ${shiftCount} ShiftEntry records exist`);
    }

    // Seed recent QC data
    console.log('✅ Creating recent QCSubmission records...');
    const qcCount = await prisma.qCSubmission.count();
    if (qcCount === 0) {
      console.log('   Creating QCSubmission records...');
      
      // Get a template if available
      let templateId = null;
      try {
        const template = await prisma.qCChecklistTemplate.findFirst({ select: { id: true } });
        templateId = template?.id || 'tpl-default';
      } catch {
        templateId = 'tpl-default';
      }
      
      // Get a station if available
      let stationId = 1;
      try {
        const station = await prisma.station.findFirst({ select: { id: true } });
        if (station) stationId = station.id;
      } catch {}
      
      for (let i = 0; i < 25; i++) {
        const daysAgo = Math.floor(Math.random() * 7);
        const hoursAgo = Math.floor(Math.random() * 24);
        const submittedAt = subHours(subDays(new Date(), daysAgo), hoursAgo);
        
        await prisma.qCSubmission.create({
          data: {
            id: `qc-${Date.now()}-${i}`,
            templateId,
            projectId: projects[Math.floor(Math.random() * projects.length)].id,
            stationId,
            submittedAt,
            overallPass: Math.random() > 0.2, // 80% pass rate
            batchCode: null, // Don't set a batch code
            shift: ['morning', 'afternoon', 'night'][Math.floor(Math.random() * 3)],
            operatorId: Math.floor(Math.random() * 1000).toString(),
            notes: `Recent QC data`,
            photos: [],
            submittedBy: `inspector-${Math.floor(Math.random() * 10)}`
          }
        });
      }
      console.log('   ✅ Created 25 QCSubmission records');
    } else {
      console.log(`   ℹ️  ${qcCount} QCSubmission records already exist`);
    }

    console.log('\n✨ Recent data seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedRecentData();
