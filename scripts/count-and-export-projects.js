const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

(async function(){
  const prisma = new PrismaClient();
  try {
    const count = await prisma.project.count();
    console.log('PROJECT_COUNT:' + count);

    if (count > 0) {
      // export basic project rows (id, code, name) to a JSON file as a lightweight backup
      const projects = await prisma.project.findMany({
        select: { id: true, code: true, name: true }
      });
      const outPath = 'project-backup.json';
      fs.writeFileSync(outPath, JSON.stringify({ exportedAt: new Date().toISOString(), count, projects }, null, 2));
      console.log('EXPORTED:' + outPath);
    }
  } catch (err) {
    console.error('ERROR', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
