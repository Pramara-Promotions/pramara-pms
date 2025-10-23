const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  console.log('\n=== Checking Database ===\n');
  
  // Check devices
  const devices = await prisma.device.findMany({
    take: 10,
    orderBy: { lastUsedAt: 'desc' }
  });
  console.log(`Devices: ${devices.length}`);
  devices.forEach(d => {
    console.log(`  - ${d.name} (User: ${d.userId.substring(0,8)}...) Last: ${d.lastUsedAt}`);
  });
  
  // Check audit logs
  console.log('\n');
  const logs = await prisma.auditLog.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Audit Logs: ${logs.length}`);
  logs.forEach(l => {
    console.log(`  - ${l.action} by ${l.actorId ? l.actorId.substring(0,8) + '...' : 'unknown'} at ${l.createdAt}`);
  });
  
  await prisma.$disconnect();
}

checkData().catch(console.error);
