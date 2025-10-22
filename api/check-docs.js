const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.projectDocument.findMany({
    where: { projectId: 20 },
    orderBy: { id: 'asc' }
  });
  
  console.log(JSON.stringify(docs.map(d => ({
    id: d.id,
    title: d.title,
    version: d.version,
    parentId: d.parentId,
    key: d.key,
    storageKey: d.storageKey,
    url: d.url
  })), null, 2));
  
  await prisma.$disconnect();
}

main().catch(console.error);
