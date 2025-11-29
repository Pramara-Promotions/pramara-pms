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
  console.log('============================================================\n');

  // Get admin user
  const adminUser = await prisma.user.findFirst();

  if (!adminUser) {
    console.error('❌ Admin user not found');
    return;
  }

  // Get all users for assignment
  const users = await prisma.user.findMany();

  // Get existing shifts
  const shifts = await prisma.shift.findMany({ where: { active: true } });
  console.log('✓ Shifts ready\n');

  // Get production projects
  const projects = await prisma.project.findMany({
    where: {
      name: { contains: '[Production]' },
      skus: { some: {} }
    },
    include: {
      skus: true,
      processFlows: {
        include: {
          operations: true
        }
      }
    }
  });

  console.log(`📦 Found ${projects.length} production projects\n`);

  for (const project of projects) {
    console.log(`--- Processing: ${project.name} ---`);

    // 2. CREATE PRODUCTION ENTRIES
    if (project.processFlows.length > 0 && project.skus.length > 0) {
      const processFlow = project.processFlows[0];
      if (!processFlow.operations || processFlow.operations.length === 0) {
        console.log(`  ⚠ Skipping production entries - no operations found`);
      } else {
        const sku = project.skus[0];
        let entryCount = 0;

        for (let dayOffset = -7; dayOffset < 0; dayOffset++) {
          const date = addDays(new Date(), dayOffset);

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
            endTime.setHours(endTime.getHours() + 4);

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
        console.log(`  ✓ Created ${entryCount} production entries`);
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

    // 5. CREATE DAILY PLAN
    if (project.processFlows.length > 0) {
      const processFlow = project.processFlows[0];

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      const plan = await prisma.dailyPlanGeneration.create({
        data: {
          projectId: project.id,
          processFlowId: processFlow.id,
          startDate: startDate,
          endDate: endDate,
          totalDays: 7,
          status: 'approved',
          generatedBy: adminUser.id,
          approvedBy: adminUser.id,
          approvedAt: new Date(),
          planningStrategy: 'bottleneck',
          effectiveCapacity: 100,
          notes: `Auto-generated 7-day plan for ${project.name}`
        }
      });

      // Create station assignments
        const sku = project.skus[0];
      for (const operation of processFlow.operations) {
        if (operation.stationId) {
          await prisma.dailyPlanStationAuto.create({
            data: {
              planGenerationId: plan.id,
                                          skuId: sku.id,
                            date: startDate,
              projectId: project.id,
              stationId: operation.stationId,
              targetQty: randomInt(100, 200),
              theoreticalCapacity: randomInt(150, 250),
              effectiveCapacity: randomInt(100, 150)
            }
          });
        }
      }
      console.log(`  ✓ Created daily plan with ${processFlow.operations.length} station assignments`);
    }

    console.log('');
  }

  console.log('✅ Functional data seed complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
