// Check if dev-user exists and create if needed
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    let user = await prisma.user.findUnique({
      where: { id: 'dev-user' }
    });

    if (user) {
      console.log('✅ dev-user exists:', JSON.stringify(user, null, 2));
    } else {
      console.log('⚠️ dev-user does not exist. Creating...');
      
      user = await prisma.user.create({
        data: {
          id: 'dev-user',
          email: 'admin@pramara.local',
          passwordHash: 'dev-no-password-needed',
          isActive: true,
          status: 'ACTIVE',
          emailVerified: true,
        }
      });
      
      console.log('✅ Created dev-user:', JSON.stringify(user, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
