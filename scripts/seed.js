const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@pramara.local';
  const password = 'ChangeMe@123';
  const hash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash: hash,      // adjust if your field is different (e.g., `password`)
      name: 'Admin',
      role: 'ADMIN',           // adjust if enum/values differ
      enabled: true,
    },
    update: {
      passwordHash: hash,
      enabled: true,
    },
  });

  console.log('Seeded admin:', email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
