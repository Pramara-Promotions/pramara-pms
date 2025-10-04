// api/lib/audit.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit(actorId, action, entity, entityId, meta, req) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entity,
        entityId,
        meta,
        ip: req?.ip || null,
        userAgent: req?.headers['user-agent'] || null,
      },
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { audit };
