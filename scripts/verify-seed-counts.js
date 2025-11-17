const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const [qcTemplates, qcSubs, flows, ops, costings, comps, docs] = await Promise.all([
      prisma.qCChecklistTemplate.count(),
      prisma.qCSubmission.count(),
      prisma.processFlow.count(),
      prisma.processOperation.count(),
      prisma.projectCosting.count(),
      prisma.costComponent.count(),
      prisma.projectDocument.count(),
    ]);
    console.log('QC Templates:', qcTemplates);
    console.log('QC Submissions:', qcSubs);
    console.log('Process Flows:', flows);
    console.log('Process Operations:', ops);
    console.log('Project Costings:', costings);
    console.log('Cost Components:', comps);
    console.log('Project Documents:', docs);
  } catch (e) {
    console.error('verify error', e);
  } finally {
    await prisma.$disconnect();
  }
})();
