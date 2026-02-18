const { PrismaClient } = require('@prisma/client');

(async function(){
  const prisma = new PrismaClient();
  try {
    console.log('About to TRUNCATE "Project" with CASCADE. This will remove related rows.');
    const res = await prisma.$executeRawUnsafe('TRUNCATE TABLE "Project" RESTART IDENTITY CASCADE;');
    console.log('TRUNCATE_EXECUTED', res);
  } catch (err) {
    console.error('ERROR', err && err.message ? err.message : err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
