const { PrismaClient } = require('@prisma/client');
const { subDays, subHours } = require('date-fns');

const prisma = new PrismaClient();

async function seedDashboardData() {
  try {
    console.log('📊 Seeding dashboard data...\n');
    
    // Get projects
    const projects = await prisma.project.findMany({ select: { id: true }, take: 5 });
    if (projects.length === 0) {
      console.log('❌ No projects found');
      return;
    }
    
    console.log(`Using ${projects.length} projects\n`);
    
    // Get or create Station (use first one or default ID 1)
    let stationId = 1;
    try {
      const station = await prisma.station.findFirst({ select: { id: true } });
      if (station) stationId = station.id;
    } catch {}
    
    // Get or create Shift
    let shiftId = null;
    try {
      const shift = await prisma.shift.findFirst({ select: { id: true } });
      if (shift) {
        shiftId = shift.id;
      }
    } catch {}
    
    // Seed Production Data (with current dates)
    if (shiftId) {
      console.log('📦 Creating 50 ProductionEntry records...');
      for (let i = 0; i < 50; i++) {
        const daysAgo = Math.floor(Math.random() * 7);
        const startTime = subDays(new Date(), daysAgo);
        
        try {
          await prisma.productionEntry.create({
            data: {
              id: `prod-${Date.now()}-${i}`,
              projectId: projects[Math.floor(Math.random() * projects.length)].id,
              stationId: stationId,
              shiftId: shiftId,
              startTime,
              endTime: new Date(startTime.getTime() + 3600000),
              targetQty: Math.floor(Math.random() * 200) + 100,
              actualQty: Math.floor(Math.random() * 200) + 50,
              rejectedQty: Math.floor(Math.random() * 50),
              outputVariance: Math.random() * 20 - 10,
              operatorId: `operator-${i}`,
              notes: `Production data ${i}`,
              materialUsed: {}
            }
          });
        } catch (e) {
          if (!e.message.includes('Unique constraint failed')) {
            console.log(`  Warning on ${i}: ${e.message}`);
          }
        }
      }
      console.log('✅ Production data seeded');
    } else {
      console.log('⚠️  No shifts found, skipping ProductionEntry');
    }
    
    // Seed Shift Data
    console.log('👥 Creating 50 ShiftEntry records...');
    const supervisorId = `supervisor-1`;
    const userId = `user-1`;
    
    for (let i = 0; i < 50; i++) {
      const daysAgo = Math.floor(Math.random() * 7);
      const shiftDate = subDays(new Date(), daysAgo);
      shiftDate.setHours(0, 0, 0, 0);
      
      const shiftStartTime = new Date(shiftDate);
      shiftStartTime.setHours(8, 0, 0, 0);
      
      const shiftEndTime = new Date(shiftDate);
      shiftEndTime.setHours(16, 0, 0, 0);
      
      try {
        await prisma.shiftEntry.create({
          data: {
            id: `shift-entry-${Date.now()}-${i}`,
            projectId: projects[Math.floor(Math.random() * projects.length)].id,
            stationId: stationId,
            shiftDate,
            shiftType: 'morning',
            shiftStartTime,
            shiftEndTime,
            supervisorId: supervisorId,
            createdBy: userId,
            workersPresent: Math.floor(Math.random() * 20) + 5,
            workersAbsent: Math.floor(Math.random() * 3),
            totalProduced: Math.floor(Math.random() * 300) + 100,
            qualityPassed: Math.floor(Math.random() * 250) + 50,
            qualityRejected: Math.floor(Math.random() * 30),
            efficiency: Math.random() * 100
          }
        });
      } catch (e) {
        if (!e.message.includes('Unique constraint failed')) {
          console.log(`  Warning on ${i}: ${e.message}`);
        }
      }
    }
    console.log('✅ Shift data seeded');
    
    // Seed QC Data
    console.log('✅ Creating 40 QCSubmission records...');
    let templateId = null;
    try {
      const template = await prisma.qCChecklistTemplate.findFirst({ select: { id: true } });
      templateId = template?.id || 'tpl-default';
    } catch {
      templateId = 'tpl-default';
    }
    
    for (let i = 0; i < 40; i++) {
      const daysAgo = Math.floor(Math.random() * 7);
      const submittedAt = subDays(new Date(), daysAgo);
      
      try {
        await prisma.qCSubmission.create({
          data: {
            id: `qc-${Date.now()}-${i}`,
            templateId: templateId,
            projectId: projects[Math.floor(Math.random() * projects.length)].id,
            stationId: stationId,
            submittedAt: submittedAt,
            overallPass: Math.random() > 0.2,
            shift: 'morning',
            operatorId: `operator-${i}`,
            photos: [],
            submittedBy: `inspector-${i % 5}`
          }
        });
      } catch (e) {
        if (!e.message.includes('Unique constraint failed')) {
          console.log(`  Warning on ${i}: ${e.message}`);
        }
      }
    }
    console.log('✅ QC data seeded');
    
    console.log('\n✨ Dashboard data seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedDashboardData();
