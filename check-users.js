const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } });
  console.log('Users:', users);
  await prisma.$disconnect();
}

check();
