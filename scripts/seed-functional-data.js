// Complete Functional Data Seed
// Adds Tasks, ProductionEntries, Documents, Alerts, DailyPlans

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function main() {
  console.log('\n🔧 FUNCTIONAL DATA SEED');
  console.log('='.repeat(60));

  // Create/Get Shifts first
  let dayShift = await prisma.shift.findFirst({ where: { name: 'Day Shift' } });
  if (!dayShift) {
    dayShift = await prisma.shift.create({
      data: {
        id: 'SHIFT-DAY',
        name: 'Day Shift',
        startTime: '08:00',
        endTime: '20:00',
        breakDuration: 60,
        active: true,
        updatedAt: new Date()
      }
    });
  }

  let nightShift = await prisma.shift.findFirst({ where: { name: 'Night Shift' } });
  if (!nightShift) {
    nightShift = await prisma.shift.create({
      data: {
        id: 'SHIFT-NIGHT',
        name: 'Night Shift',
        startTime: '20:00',
        endTime: '08:00',
        breakDuration: 60,
        active: true,
        updatedAt: new Date()
      }
    });
  }
  console.log('✓ Shifts ready');

  // Get all production projects
  const projects = await prisma.project.findMany({
    where: { name: { contains: '[Production]' } },
    include: {
      skus: true,
      processFlows: {
        include: {
          operations: true
        }
      }
    }
  });

  console.log(`\n📦 Found ${projects.length} production projects`);

  // Get users
  const users = await prisma.user.findMany();
  const adminUser = users[0];
  
  const shifts = [dayShift, nightShift];

  for (const project of projects) {
    console.log(`\n--- Processing: ${project.name} ---`);

    // 1. CREATE TASKS FOR BOARD
    const boardColumns = await prisma.boardColumn.findMany({
      where: { projectId: project.id },
      orderBy: { position: 'asc' }
    });

    if (boardColumns.length > 0) {
      // Create 3-5 tasks per project
      const taskCount = randomInt(3, 5);
      for (let i = 0; i < taskCount; i++) {
        const column = boardColumns[randomInt(0, boardColumns.length - 1)];
        const taskTypes = ['Design Review', 'Mold Approval', 'Material Procurement', 'Quality Check', 'Production Setup'];
        const task = await prisma.task.create({
          data: {
            projectId: project.id,
            boardColumnId: column.id,
            title: `${taskTypes[i % taskTypes.length]} - ${project.code}`,
            description: `Task for ${project.name}`,
            priority: ['low', 'medium', 'high'][randomInt(0, 2)],
            assignedToId: users[randomInt(0, users.length - 1)].id,
            createdById: adminUser.id,
            position: i,
            dueDate: addDays(new Date(), randomInt(7, 30))
          }
        });
      }
      console.log(`  ✓ Created ${taskCount} tasks`);
    }

    // 2. CREATE PRODUCTION ENTRIES (ACTUAL WORK DONE)
    if (project.processFlows.length > 0 && project.skus.length > 0) {
      const processFlow = project.processFlows[0];
      if (!processFlow.operations || processFlow.operations.length === 0) {
        console.log(`  ⚠ Skipping production entries - no operations found`);
      } else {
        const sku = project.skus[0];
      let entryCount = 0;
      
      // Create production entries for last 7 days
      for (let dayOffset = -7; dayOffset < 0; dayOffset++) {
        const date = addDays(new Date(), dayOffset);
        
        // Create 2-3 entries per day (different shifts/operations)
        for (let i = 0; i < randomInt(2, 3); i++) {
          const operation = processFlow.operations[randomInt(0, processFlow.operations.length - 1)];
          if (!operation.stationId) continue;
          
          const shift = shifts[randomInt(0, 1)];
          const targetQty = randomInt(80, 150);
          const actualQty = randomInt(Math.floor(targetQty * 0.85), targetQty);
          const rejectedQty = randomInt(0, Math.floor(actualQty * 0.05));
          
          const startTime = new Date(date);
          startTime.setHours(shift.name === 'Day Shift' ? 8 : 20, 0, 0);
          const endTime = new Date(startTime);
          endTime.setHours(endTime.getHours() + 4); // 4 hour production run
          
          await prisma.productionEntry.create({
            data: {
              id: `PROD-${project.code}-${Date.now()}-${entryCount++}`,
              projectId: project.id,
              stationId: operation.stationId,
              shiftId: shift.id,
              startTime: startTime,
              endTime: endTime,
              targetQty: targetQty,
              actualQty: actualQty,
              rejectedQty: rejectedQty,
              materialUsed: { resin: actualQty * 0.1, paint: actualQty * 0.02 },
              outputVariance: ((actualQty - targetQty) / targetQty) * 100,
              operatorId: users[randomInt(0, users.length - 1)].id,
              notes: `${operation.operationName} - ${shift.name}`
            }
          });
        }
      }
      console.log(`  ✓ Created ${entryCount} production entries (last 7 days)`);
      }
    }

    // 3. CREATE DOCUMENTS
    const docTypes = [
      { kind: 'technical_drawing', title: 'Technical Specifications', ext: 'pdf' },
      { kind: 'bom', title: 'Bill of Materials', ext: 'xlsx' },
      { kind: 'quality_plan', title: 'Quality Control Plan', ext: 'pdf' },
      { kind: 'customer_po', title: 'Customer Purchase Order', ext: 'pdf' }
    ];

    for (const doc of docTypes) {
      await prisma.projectDocument.create({
        data: {
          projectId: project.id,
          kind: doc.kind,
          title: `${doc.title} - ${project.code}`,
          version: 1,
          active: true,
          uploadedBy: adminUser.id,
          key: `projects/${project.id}/${doc.kind}_${Date.now()}.${doc.ext}`,
          storageKey: `projects/${project.id}/${doc.kind}_${Date.now()}.${doc.ext}`,
          contentType: doc.ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          notes: `${doc.title} for ${project.name}`
        }
      });
    }
    console.log(`  ✓ Created ${docTypes.length} documents`);

    // 4. CREATE ALERTS
    const alertTypes = [
      { level: 'WARNING', message: 'Material stock running low for this project' },
      { level: 'INFO', message: 'Mold maintenance due next week for production equipment' },
      { level: 'CRITICAL', message: 'Quality rejection rate above threshold - immediate action required' }
    ];

    for (let i = 0; i < randomInt(1, 2); i++) {
      const alert = alertTypes[i];
      await prisma.alert.create({
        data: {
          projectId: project.id,
          level: alert.level,
          message: alert.message,
          status: 'OPEN',
          createdAt: addDays(new Date(), -randomInt(1, 5))
        }
      });
    }
    console.log(`  ✓ Created alerts`);

    //5. CREATE DAILY PLAN
    if (project.processFlows.length > 0) {
      const processFlow = project.processFlows[0];
      
      // Create a daily plan for today
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7); // 7-day plan
      
      const plan = await prisma.dailyPlanGeneration.create({
                  processFlowId: processFlow.id,
        data: {
          projectId: project.id,
          startDate: startDate,
          endDate: endDate,
          totalDays: 7,
          status: 'approved',
          generatedBy: adminUser.id,
          approvedBy: adminUser.id,
          approvedAt: new Date(),
          planningStrategy: 'bottleneck',
          effectiveCapacity: 100,
          notes: `Auto-generated 7-day plan for ${project.name} using process flow ${processFlow.name}`
        }
      });

      // Create station assignments for each operation
      for (const operation of processFlow.operations) {
        if (operation.stationId) {
          await prisma.dailyPlanStationAuto.create({
            data: {
              planId: plan.id,
              projectId: project.id,
              stationId: operation.stationId,
              processOperationId: operation.id,
              date: new Date(),
              shift: 'DAY',
              targetQty: randomInt(100, 200),
              status: 'active'
            }
          });
        }
      }
      console.log(`  ✓ Created daily plan with station assignments`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ FUNCTIONAL DATA SEED COMPLETE!');
  console.log('\nNow the UI should show:');
  console.log('- Board tab: Tasks in columns');
  console.log('- Files tab: Documents');
  console.log('- Alerts: Actual alerts listed');
  console.log('- Cards: Real production metrics (throughput, rejection %)');
  console.log('- Planning tab: Generated daily plans');
  console.log('='.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
