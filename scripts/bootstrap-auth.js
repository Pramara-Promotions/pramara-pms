// scripts/bootstrap-auth.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

const PERMS = [
  ['USER_MANAGE', 'Manage users'],
  ['PROJECT_VIEW', 'View projects'],
  ['PROJECT_EDIT', 'Edit projects'],
  ['DOC_UPLOAD', 'Upload documents'],
  ['RULE_EDIT', 'Edit alert rules'],
  ['COMPLIANCE_EDIT', 'Edit compliance items'],
];

async function main() {
  console.log('Bootstrapping auth…');

  // 1) Permissions (idempotent)
  for (const [code, label] of PERMS) {
    await prisma.permission.upsert({
      where: { code },
      update: { label },
      create: { code, label },
    });
  }

  // 2) Role: Super Admin (idempotent)
  const superAdmin = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: { name: 'Super Admin' },
  });

  // 3) Admin user (idempotent)
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@pramara.local';
  const pass  = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'ChangeMe@123';
  const hash  = await argon2.hash(pass);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: hash,
      isActive: true,
    },
  });

  // 4) Ensure user has Super Admin role (idempotent)
  const link = await prisma.userRole.findFirst({
    where: { userId: user.id, roleId: superAdmin.id },
  });
  if (!link) {
    await prisma.userRole.create({ data: { userId: user.id, roleId: superAdmin.id } });
  }

  console.log('✅ Admin ready:', email);
  console.log('   Password  :', pass, '(please change after login)');
}

main()
  .catch((e) => {
    console.error('❌ Bootstrap failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
