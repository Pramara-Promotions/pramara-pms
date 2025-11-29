const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const shifts = await prisma.shift.findMany();
  console.log('Shifts:', shifts);
  await prisma.$disconnect();
}

check();
