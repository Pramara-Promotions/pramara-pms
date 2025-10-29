const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAuditCount() {
  try {
    const count = await prisma.auditLog.count();
    console.log('Audit log count:', count);
    
    // Get latest 5 audit logs
    const latest = await prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        entity: true,
        createdAt: true,
        actorId: true
      }
    });
    
    console.log('\nLatest 5 audit logs:');
    latest.forEach(log => {
      console.log(`  ${log.createdAt.toISOString()} - ${log.action} ${log.entity} (actor: ${log.actorId || 'system'})`);
    });
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAuditCount();
