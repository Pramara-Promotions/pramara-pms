const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Check USB4-001 project
    const proj = await prisma.project.findFirst({
      where: { code: 'USB4-001' },
      include: {
        processFlows: {
          include: {
            operations: true
          }
        },
        components: true,
        costings: true,
        purchaseOrders: true,
        skus: {
          include: {
            bomItems: {
              include: {
                Material: true
              }
            }
          }
        },
        Task: true,
        documents: true,
        alerts: true,
        shiftEntries: true,
        ProductionEntry: true,
        _count: {
          select: {
            Task: true,
            documents: true,
            alerts: true,
            shiftEntries: true,
            ProductionEntry: true
          }
        }
      }
    });

    if (!proj) {
      console.log('Project USB4-001 not found!');
      return;
    }

    console.log('\n=== PROJECT DATA AUDIT ===');
    console.log('Project:', proj.name, `(ID: ${proj.id})`);
    console.log('\nWhat EXISTS:');
    console.log('- Process Flows:', proj.processFlows.length, proj.processFlows.length > 0 ? '✓' : '✗');
    console.log('- Process Operations:', proj.processFlows[0]?.operations?.length || 0, proj.processFlows[0]?.operations?.length > 0 ? '✓' : '✗');
    console.log('- Product Components:', proj.components.length, proj.components.length > 0 ? '✓' : '✗');
    console.log('- Project Costings:', proj.costings.length, proj.costings.length > 0 ? '✓' : '✗');
    console.log('- Purchase Orders:', proj.purchaseOrders.length, proj.purchaseOrders.length > 0 ? '✓' : '✗');
    console.log('- SKUs:', proj.skus.length, proj.skus.length > 0 ? '✓' : '✗');
    console.log('- BOM Items:', proj.skus[0]?.bomItems?.length || 0, proj.skus[0]?.bomItems?.length > 0 ? '✓' : '✗');
    
    console.log('\nWhat DOES NOT EXIST (causing empty screens):');
    console.log('- Tasks:', proj._count.Task, proj._count.Task === 0 ? '✗ EMPTY' : '✓');
    console.log('- Documents:', proj._count.documents, proj._count.documents === 0 ? '✗ EMPTY' : '✓');
    console.log('- Alerts:', proj._count.alerts, proj._count.alerts === 0 ? '✗ EMPTY' : '✓');
    console.log('- Shift Entries (for this project):', proj._count.shiftEntries, proj._count.shiftEntries === 0 ? '✗ EMPTY' : '✓');
    console.log('- Production Entries:', proj._count.ProductionEntry, proj._count.ProductionEntry === 0 ? '✗ EMPTY' : '✓');

    // Check daily plans
    const dailyPlans = await prisma.dailyPlanGeneration.count({ where: { projectId: proj.id } });
    console.log('- Daily Plans:', dailyPlans, dailyPlans === 0 ? '✗ EMPTY' : '✓');

    // Check board config
    const boardColumns = await prisma.boardColumn.count({ where: { projectId: proj.id } });
    console.log('- Board Columns:', boardColumns, boardColumns === 0 ? '✗ EMPTY (using defaults)' : '✓');

    console.log('\n=== ISSUES IDENTIFIED ===');
    console.log('1. No Tasks → Board tab shows "No tasks"');
    console.log('2. No Documents → Files tab empty');
    console.log('3. No Alerts → Health shows "At-Risk" but no alerts listed');
    console.log('4. No Production Entries → Cards show 0% production, 0 units throughput');
    console.log('5. No Daily Plans → Planning tab shows "No plans generated yet"');
    console.log('6. Shift Entries exist globally but not linked to projects → Not showing in metrics');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
