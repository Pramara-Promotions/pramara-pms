// prisma/seed.js  (CommonJS, idempotent, aligned to your schema)
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

// ---- App permissions ----
const PERMS = [
  ['USER_MANAGE', 'Manage users'],
  ['PROJECT_VIEW', 'View projects'],
  ['PROJECT_EDIT', 'Edit projects'],
  ['DOC_UPLOAD', 'Upload documents'],
  ['RULE_EDIT', 'Edit alert rules'],
  ['COMPLIANCE_EDIT', 'Edit compliance items'],
];

/* ---------- helpers ---------- */
async function ensurePermission(code, label) {
  const existing = await prisma.permission.findUnique({ where: { code } });
  if (existing) {
    if (existing.label !== label) {
      await prisma.permission.update({ where: { code }, data: { label } });
    }
    return existing;
  }
  return prisma.permission.create({ data: { code, label } });
}

async function ensureRole(name) {
  const existing = await prisma.role.findUnique({ where: { name } });
  return existing || prisma.role.create({ data: { name } });
}

async function ensureUserWithRole(email, rawPassword, roleId) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const link = await prisma.userRole.findFirst({
      where: { userId: existing.id, roleId },
    });
    if (!link) {
      await prisma.userRole.create({ data: { userId: existing.id, roleId } });
    }
    return existing;
  }
  const passwordHash = await argon2.hash(rawPassword);
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      isActive: true,
      roles: { create: { roleId } },
    },
  });
}

/** Ensure a project exists.
 * Your schema requires: code, name, quantity (Int).
 * sku is nullable; cutoffDate & pantoneCode are nullable; createdAt likely has a default.
 */
async function ensureProject({ code, name, sku, quantity }) {
  // Try to find by code OR by (name, sku) as a natural key
  const existing = await prisma.project.findFirst({
    where: {
      OR: [
        { code },
        { AND: [{ name }, { sku }] },
      ],
    },
  });
  if (existing) return existing;

  return prisma.project.create({
    data: {
      code,
      name,
      sku,                 // can be null/undefined
      quantity,            // ✅ required
      // cutoffDate: null,  // uncomment if your schema disallows omitting
      // pantoneCode: null, // uncomment if your schema disallows omitting
    },
  });
}

async function seedProjectData(projectId) {
  // InventoryNeed
  if (!await prisma.inventoryNeed.findFirst({ where: { projectId } })) {
    await prisma.inventoryNeed.create({
      data: { projectId, text: 'Add steel sheets (Grade 304) to inventory' },
    });
  }

  // AlertRule
  if (!await prisma.alertRule.findFirst({ where: { projectId } })) {
    await prisma.alertRule.create({
      data: { projectId, name: 'Low stock: fasteners', threshold: 50 },
    });
  }

  // PreProdStep
  if (!await prisma.preProdStep.findFirst({ where: { projectId } })) {
    await prisma.preProdStep.create({
      data: { projectId, title: 'Finalize bill of materials (Rev A)' },
    });
  }

  // ComplianceItem
  if (!await prisma.complianceItem.findFirst({ where: { projectId } })) {
    await prisma.complianceItem.create({
      data: { projectId, title: 'ISO 9001 – Doc control updated' },
    });
  }

  // ChangeLog
  if (!await prisma.changeLog.findFirst({ where: { projectId } })) {
    await prisma.changeLog.create({
      data: { projectId, description: 'Updated welding spec WPS-12 to Rev C' },
    });
  }

  // ProjectDocument
  if (!await prisma.projectDocument.findFirst({ where: { projectId } })) {
    await prisma.projectDocument.create({
      data: {
        projectId,
        name: 'Drawing Set – Rev A',
        url: 'https://example.com/drawings/rev-a.pdf',
        version: 1,
      },
    });
  }
}

/* ---------- main ---------- */
async function main() {
  console.log('Seeding…');

  // 1) Permissions
  for (const [code, label] of PERMS) {
    await ensurePermission(code, label);
  }

  // 2) Role
  const superAdmin = await ensureRole('Super Admin');

  // 3) Super Admin user
  const adminEmail = 'admin@pramara.local';
  const adminPassword = 'ChangeMe@123';
  await ensureUserWithRole(adminEmail, adminPassword, superAdmin.id);

  // 4) Demo Project — only the fields your schema requires / supports
  const project = await ensureProject({
    code: 'PMS-DEMO',
    name: 'Pramara PMS Demo',
    sku: 'PMS-DEMO',
    quantity: 0, // ✅ REQUIRED by your schema
  });

  // 5) Demo related data
  await seedProjectData(project.id);

  console.log('✅ Seed complete.');
  console.log('   Admin:', adminEmail, '/ password:', adminPassword, '(please change)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
