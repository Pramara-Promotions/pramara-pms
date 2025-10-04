// prisma/seed_projects.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.create({
    data: {
      code: "PRJ-001",
      name: "Sample Toy Production",
      sku: "TOY-STD-001",
      quantity: 5000,
      pantoneCode: "PMS 186 C",
      cutoffDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // +10 days
    }
  });

  await prisma.complianceItem.create({
    data: {
      projectId: project.id,
      type: "Fabric Test",
      status: "PLANNED",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      remarks: "Initial lab test",
    }
  });

  await prisma.qCRecord.create({
    data: {
      projectId: project.id,
      type: "Inline Inspection",
      status: "SCHEDULED",
      remarks: "30% inline QC planned"
    }
  });

  await prisma.alert.create({
    data: {
      projectId: project.id,
      type: "DELAY",
      message: "Cutoff approaching, compliance pending"
    }
  });

  console.log("✅ Sample project seeded:", project.name);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => prisma.$disconnect());
