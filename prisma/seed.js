// prisma/seed.js  (CommonJS, idempotent, aligned to your schema)
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const { PERMISSIONS_ARRAY, DEFAULT_ROLES } = require('../api/config/permissions');

const prisma = new PrismaClient();

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

async function ensureRole(name, description) {
  const existing = await prisma.role.findUnique({ where: { name } });
  if (existing) {
    // Update description if changed
    if (description && existing.description !== description) {
      return prisma.role.update({ where: { name }, data: { description } });
    }
    return existing;
  }
  return prisma.role.create({ data: { name, description } });
}

async function assignPermissionsToRole(roleId, permissionCodes) {
  for (const code of permissionCodes) {
    const permission = await prisma.permission.findUnique({ where: { code } });
    if (!permission) {
      console.warn(`⚠️  Permission ${code} not found, skipping...`);
      continue;
    }

    const existing = await prisma.rolePermission.findFirst({
      where: { roleId, permissionId: permission.id },
    });

    if (!existing) {
      await prisma.rolePermission.create({
        data: { roleId, permissionId: permission.id },
      });
    }
  }
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
      data: {
        projectId,
        material: 'Steel Sheet 304',
        requiredQty: 100,
        availableQty: 0,
      },
    });
  }

  // AlertRule
  if (!await prisma.alertRule.findFirst({ where: { projectId } })) {
    await prisma.alertRule.create({
      data: {
        projectId,
  key: 'low_stock_fasteners',
  level: 'warning',
  threshold: 50,
      },
    });
  }

  // PreProdStep
  if (!await prisma.preProdStep.findFirst({ where: { projectId } })) {
    await prisma.preProdStep.create({
      data: {
        projectId,
        step: 'Finalize bill of materials (Rev A)',
        status: 'pending',
      },
    });
  }

  // ComplianceItem
  if (!await prisma.complianceItem.findFirst({ where: { projectId } })) {
    await prisma.complianceItem.create({
      data: {
        projectId,
        type: 'ISO 9001',
        status: 'PLANNED',
        remarks: 'Doc control updated',
      },
    });
  }

  // ChangeLog
  if (!await prisma.changeLog.findFirst({ where: { projectId } })) {
    await prisma.changeLog.create({
      data: {
        projectId,
        type: 'Welding Spec',
        description: 'Updated welding spec WPS-12 to Rev C',
        requestedBy: 'admin@pramara.local',
      },
    });
  }

  // ProjectDocument
  if (!await prisma.projectDocument.findFirst({ where: { projectId } })) {
      await prisma.projectDocument.create({
        data: {
          projectId,
          kind: 'drawing',
          title: 'Drawing Set – Rev A',
          url: 'https://example.com/drawings/rev-a.pdf',
          version: 1,
        },
      });
  }
}

async function seedStationsAndSkus(projectId) {
  // Ensure a few stations
  const stationNames = ['Molding Line 1', 'Spray Booth A', 'Assembly Table 1'];
  for (let i = 0; i < stationNames.length; i++) {
    const code = `ST-${String(i + 1).padStart(3, '0')}`;
    const name = stationNames[i];
    const found = await prisma.station.findFirst({ where: { code } });
    if (!found) {
      await prisma.station.create({
        data: {
          code,
          name,
          projectId,
          capacity: i === 0 ? 2 : 1,
          status: 'operational',
          updatedAt: new Date(),
        },
      });
    }
  }

  // Ensure a couple of SKUs
  const skus = [
    { code: 'RED-TOY', name: 'Toy Red', color: 'Red' },
    { code: 'BLUE-TOY', name: 'Toy Blue', color: 'Blue' },
  ];
  for (const s of skus) {
    const exist = await prisma.projectSku.findFirst({ where: { projectId, code: s.code } });
    if (!exist) {
      await prisma.projectSku.create({ data: { projectId, code: s.code, name: s.name, color: s.color, orderQty: 1000 } });
    }
  }

  // Seed a couple of assets
  const assets = [
    { assetName: 'Injection Molder X1', assetType: 'machine', mobility: 'fixed' },
    { assetName: 'Spray Gun SG-100', assetType: 'tool', mobility: 'movable' },
  ];
  for (const a of assets) {
    const exists = await prisma.asset.findFirst({ where: { assetName: a.assetName } });
    if (!exists) {
      await prisma.asset.create({
        data: {
          assetCode: `AST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          assetName: a.assetName,
          assetType: a.assetType,
          mobility: a.mobility,
          status: 'available',
          condition: 'good',
        }
      });
    }
  }
}

/* ---------- main ---------- */
async function main() {
  console.log('Seeding…');

  // 1) Permissions - seed all from config
  console.log('📋 Seeding permissions...');
  for (const { code, label } of PERMISSIONS_ARRAY) {
    await ensurePermission(code, label);
  }
  console.log(`✅ ${PERMISSIONS_ARRAY.length} permissions seeded`);

  // 2) Roles - create default roles
  console.log('👥 Seeding roles...');
  const roles = {};
  for (const [key, config] of Object.entries(DEFAULT_ROLES)) {
    roles[key] = await ensureRole(config.name, config.description);
    await assignPermissionsToRole(roles[key].id, config.permissions);
  }
  console.log(`✅ ${Object.keys(DEFAULT_ROLES).length} roles seeded`);

  // 3) Default Department
  console.log('🏢 Creating default department...');
  let defaultDept = await prisma.department.findUnique({ where: { name: 'General' } });
  if (!defaultDept) {
    defaultDept = await prisma.department.create({
      data: {
        name: 'General',
        description: 'Default department for all users'
      }
    });
  }
  console.log('✅ Default department created');

  // 4) Super Admin user
  const adminEmail = 'admin@pramara.local';
  const adminPassword = 'ChangeMe@123';
  console.log('👤 Creating Super Admin user...');
  let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!adminUser) {
    const passwordHash = await argon2.hash(adminPassword);
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Super Admin',
        passwordHash,
        isActive: true,
        status: 'ACTIVE',
        departmentId: defaultDept.id,
        trustDeviceDuration: 30,
        roles: { create: { roleId: roles.SUPER_ADMIN.id } },
      },
    });
  } else {
    // Update existing user to have proper status and department
    await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        status: 'ACTIVE',
        departmentId: defaultDept.id,
        name: adminUser.name || 'Super Admin',
      }
    });
    // Ensure role link exists
    const roleLink = await prisma.userRole.findFirst({
      where: { userId: adminUser.id, roleId: roles.SUPER_ADMIN.id }
    });
    if (!roleLink) {
      await prisma.userRole.create({
        data: { userId: adminUser.id, roleId: roles.SUPER_ADMIN.id }
      });
    }
  }

  // 5) Demo Project — only the fields your schema requires / supports
  console.log('📦 Creating demo project...');
  const project = await ensureProject({
    code: 'PMS-DEMO',
    name: 'Pramara PMS Demo',
    sku: 'PMS-DEMO',
    quantity: 0, // ✅ REQUIRED by your schema
  });

  // 6) Demo related data
  console.log('📊 Seeding project data...');
  await seedProjectData(project.id);

  console.log('🏭 Seeding stations, SKUs and assets...');
  await seedStationsAndSkus(project.id);

  console.log('✅ Seed complete.');
  console.log('   Admin:', adminEmail, '/ password:', adminPassword, '(please change)');
  console.log('   Default Department: General');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
