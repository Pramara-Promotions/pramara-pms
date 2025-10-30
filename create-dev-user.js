// Create a dev user for testing
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDevUser() {
  try {
    // Check if dev user already exists
    const existing = await prisma.user.findUnique({
      where: { id: 'dev-user' }
    });

    if (existing) {
      console.log('✅ Dev user already exists:', existing.email);
      return;
    }

    // Create dev user
    const user = await prisma.user.create({
      data: {
        id: 'dev-user',
        email: 'admin@pramara.local',
        name: 'Admin User',
        passwordHash: 'dev-hash-not-used',
        status: 'ACTIVE',
        isActive: true,
      }
    });

    console.log('✅ Dev user created successfully:', user.email);
  } catch (error) {
    console.error('Error creating dev user:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createDevUser();
