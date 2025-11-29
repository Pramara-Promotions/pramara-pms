const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const counts = {
      projects: await prisma.project.count(),
      processFlows: await prisma.processFlow.count(),
      processOperations: await prisma.processOperation.count(),
      productComponents: await prisma.productComponent.count(),
      bomItems: await prisma.bOMItem.count(),
      projectCosting: await prisma.projectCosting.count(),
      purchaseOrders: await prisma.purchaseOrder.count(),
      molds: await prisma.mold.count(),
      shiftEntries: await prisma.shiftEntry.count(),
      stations: await prisma.station.count(),
      materials: await prisma.material.count()
    };
    
    console.log('\n=== DATABASE COUNTS ===');
    console.log(JSON.stringify(counts, null, 2));
    console.log('\n');
    
    // Check a production project
    const productionProjects = await prisma.project.findMany({
      where: { name: { contains: '[Production]' } },
      include: {
        processFlows: true,
        components: true,
        costings: true,
        purchaseOrders: true
      },
      take: 1
    });
    
    if (productionProjects.length > 0) {
      console.log('=== SAMPLE PRODUCTION PROJECT ===');
      const proj = productionProjects[0];
      console.log('Project:', proj.name);
      console.log('Process Flows:', proj.processFlows.length);
      console.log('Components:', proj.components.length);
      console.log('Costings:', proj.costings.length);
      console.log('Purchase Orders:', proj.purchaseOrders.length);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
