const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testLogin() {
  try {
    console.log('Testing login functionality...\n');
    
    // Find a user
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isActive: true,
        mustChangePassword: true
      }
    });
    
    if (!user) {
      console.log('No users found in database');
      await prisma.$disconnect();
      return;
    }
    
    console.log('Found user:', user.email);
    console.log('User ID:', user.id);
    console.log('Active:', user.isActive);
    console.log('Must change password:', user.mustChangePassword);
    
    // Test password
    console.log('\nTesting password hash...');
    const testPasswords = ['ChangeMe@123', 'admin123', 'password'];
    for (const pwd of testPasswords) {
      const ok = await bcrypt.compare(pwd, user.passwordHash || '');
      if (ok) {
        console.log(`✓ Password "${pwd}" matches!`);
      }
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

testLogin();
