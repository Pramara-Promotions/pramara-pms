// Get first user for testing
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getFirstUser() {
  try {
    const user = await prisma.user.findFirst();
    
    if (user) {
      console.log('✅ Found user:', user.id, user.email);
      console.log('\nUpdate test-notification.js to use this cookie:');
      console.log(`'Cookie': 'token=dev-token-${user.id}'`);
    } else {
      console.log('❌ No users found in database');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getFirstUser();
