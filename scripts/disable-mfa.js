// Quick script to disable MFA for admin account
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: {
      OR: [
        { email: 'admin@pramara.local' },
        { email: 'shubham.mishra@pramara.com' }
      ]
    },
    data: {
      mfaSecret: null,
      mfaEnforcedAt: null
    }
  });

  console.log(`✅ Disabled MFA for ${result.count} user(s)`);
  console.log('You can now login without 2FA!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
