const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchema() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'DailyPlanGeneration'
      ORDER BY ordinal_position
    `;
    
    console.log('=== DailyPlanGeneration Table Structure ===');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();
