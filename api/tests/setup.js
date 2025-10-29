// api/tests/setup.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
  
  // Ensure test database is accessible
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
});

// Global test teardown
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  await prisma.$disconnect();
  console.log('✅ Test environment cleaned up');
});

// Make prisma available globally in tests
global.prisma = prisma;
