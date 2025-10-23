const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await argon2.hash('ChangeMe@123');
  
  await prisma.user.update({
    where: { email: 'admin@pramara.local' },
    data: { passwordHash }
  });
  
  console.log('✅ Admin password reset with argon2 hash');
  await prisma.$disconnect();
}

main().catch(console.error);
