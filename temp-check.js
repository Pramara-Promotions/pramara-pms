const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  try {
    const projects = await prisma.project.findMany({ take: 5 });
    console.log('projects sample', projects);
    const skus = await prisma.projectSku.findMany({ where: { projectId: 23 } });
    console.log('skus for 23', skus);
    const pos = await prisma.purchaseOrder.findMany({ where: { projectId: 23 } });
    console.log('pos for 23', pos);
  } catch (err) {
    console.error('script error', err);
  } finally {
    await prisma.$disconnect();
  }
})();
