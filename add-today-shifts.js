const { PrismaClient } = require('@prisma/client');
const { startOfDay, endOfDay } = require('date-fns');

const prisma = new PrismaClient();

async function addTodayShift() {
  try {
    console.log('Adding today\'s shift data...\n');
    
    const projects = await prisma.project.findMany({ select: { id: true }, take: 3 });
    if (projects.length === 0) {
      console.log('❌ No projects found');
      return;
    }
    
    // Get any existing user for supervisor
    const supervisors = await prisma.user.findMany({ select: { id: true }, take: 5 });
    if (supervisors.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    const today = startOfDay(new Date());
    
    // Check if today's shift already exists
    const existingToday = await prisma.shiftEntry.count({
      where: {
        shiftDate: {
          gte: today,
          lte: endOfDay(new Date())
        }
      }
    });
    
    if (existingToday > 0) {
      console.log(`✅ Found ${existingToday} shifts for today already`);
      process.exit(0);
      return;
    }
    
    // Get first station
    let stationId = 1;
    try {
      const station = await prisma.station.findFirst({ select: { id: true } });
      if (station) stationId = station.id;
    } catch {}
    
    // Create shifts for today
    const shiftStartTime = new Date(today);
    shiftStartTime.setHours(8, 0, 0, 0);
    
    const shiftEndTime = new Date(today);
    shiftEndTime.setHours(16, 0, 0, 0);
    
    for (let i = 0; i < 3; i++) {
      const supervisor = supervisors[i % supervisors.length];
      
      try {
        await prisma.shiftEntry.create({
          data: {
            id: `shift-today-${Date.now()}-${i}`,
            projectId: projects[i % projects.length].id,
            stationId: stationId,
            shiftDate: today,
            shiftType: 'morning',
            shiftStartTime,
            shiftEndTime,
            supervisorId: supervisor.id,
            createdBy: supervisor.id,
            workersPresent: 15 + Math.floor(Math.random() * 10),
            workersAbsent: Math.floor(Math.random() * 2),
            totalProduced: 200 + Math.floor(Math.random() * 150),
            qualityPassed: 180 + Math.floor(Math.random() * 50),
            qualityRejected: Math.floor(Math.random() * 10),
            efficiency: 85 + Math.random() * 15
          }
        });
        console.log(`✅ Created shift for today #${i+1}`);
      } catch (e) {
        console.log(`⚠️  Could not create shift: ${e.message}`);
      }
    }
    
    console.log('\n✨ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

addTodayShift();
