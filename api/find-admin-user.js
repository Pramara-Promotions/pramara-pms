// Find user with admin email
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@pramara.local' }
    });

    if (user) {
      console.log('✅ Found user with admin email:', JSON.stringify(user, null, 2));
    } else {
      console.log('⚠️ No user found with email admin@pramara.local');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
