const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@pramara.local' },
    select: {
      email: true,
      status: true,
      isActive: true,
      mfaSecret: true,
      mfaEnforcedAt: true,
      passwordHash: true
    }
  });
  
  console.log('Admin user:', {
    ...admin,
    passwordHash: admin?.passwordHash ? `${admin.passwordHash.substring(0, 20)}...` : null,
    hasMFA: !!admin?.mfaSecret,
    mfaEnforced: !!admin?.mfaEnforcedAt
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
