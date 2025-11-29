const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// =================================================================
// COMPREHENSIVE SEED SCRIPT - FULL PRODUCTION SYSTEM
// =================================================================
// Features:
// - 10 molding machines, 60 spray booths, 10 pad printing, 5 auto screwing
// - 3 riveting, 1 auto spray, 200 assembly stations, 15 ultrasonic, 25 packing
// - 12 projects in planning stages (various stages)
// - 8 projects in production (with complete process flows)
// - 2 shifts (12 hours each: Day 08:00-20:00, Night 20:00-08:00)
// - Complete cycle times, process dependencies, QC checkpoints
// - Material movement planning, shift transfers, work orders
// =================================================================

// Helper functions
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function main() {
  console.log('🏭 COMPREHENSIVE PRODUCTION SYSTEM SEED\n');
  console.log('=' .repeat(60) + '\n');

  // STEP 1: PURGE OLD DATA
  console.log('🧹 Step 1: Purging old data...');
  await purgeData();
  
  // STEP 2: CREATE FACTORY INFRASTRUCTURE
  console.log('\n🏗️  Step 2: Creating factory infrastructure...');
  const infrastructure = await createInfrastructure();
  
  // STEP 3: CREATE USERS & WORKFORCE
  console.log('\n👥 Step 3: Creating workforce...');
  const users = await createWorkforce();
  
  // STEP 4: CREATE MATERIALS
  console.log('\n📦 Step 4: Creating materials...');
  const materials = await createMaterials();
  
  // STEP 5: CREATE 12 PLANNING PROJECTS
  console.log('\n📋 Step 5: Creating 12 planning stage projects...');
  const planningProjects = await createPlanningProjects(users.admin);
  
  // STEP 6: CREATE 8 PRODUCTION PROJECTS  
  console.log('\n🏃 Step 6: Creating 8 production projects with complete flows...');
  const productionProjects = await createProductionProjects(
    infrastructure.stations,
    materials,
    users
  );
  
  // STEP 7: CREATE SHIFT SCHEDULES
  console.log('\n⏰ Step 7: Creating shift schedules (41 days of data)...');
  await createShiftSchedules(users, productionProjects);
  
  // STEP 8: Skipped - Work orders require migration
  console.log('\n📝 Step 8: Skipping work orders (models not yet migrated)...');
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ SEED COMPLETE!\n');
  console.log('Summary:');
  console.log(`  - Stations: ${infrastructure.stations.length}`);
  console.log(`  - Users: ${Object.keys(users).length}`);
  console.log(`  - Materials: ${materials.length}`);
  console.log(`  - Planning Projects: ${planningProjects.length}`);
  console.log(`  - Production Projects: ${productionProjects.length}`);
  console.log(`  - Total Projects: ${planningProjects.length + productionProjects.length}`);
  console.log('='.repeat(60) + '\n');
}

// =================================================================
// STEP 1: PURGE DATA
// =================================================================
async function purgeData() {
  console.log('  - Deleting daily plan station auto...');
  await prisma.dailyPlanStationAuto.deleteMany({});
  console.log('  - Deleting daily plan generation...');
  await prisma.dailyPlanGeneration.deleteMany({});
  console.log('  - Deleting shift entries...');
  await prisma.shiftEntry.deleteMany({});
  console.log('  - Deleting QC submissions...');
  await prisma.qCSubmission.deleteMany({});
  console.log('  - Deleting product components...');
  await prisma.productComponent.deleteMany({});
  console.log('  - Deleting BOM items...');
  await prisma.bOMItem.deleteMany({});
  console.log('  - Deleting project costing...');
  await prisma.projectCosting.deleteMany({});
  console.log('  - Deleting process operations...');
  await prisma.processOperation.deleteMany({});
  console.log('  - Deleting process flows...');
  await prisma.processFlow.deleteMany({});
  console.log('  - Deleting molds...');
  await prisma.mold.deleteMany({});
  console.log('  - Deleting project SKUs...');
  await prisma.projectSku.deleteMany({});
  console.log('  - Deleting stations...');
  await prisma.station.deleteMany({});
  console.log('  - Deleting projects...');
  await prisma.project.deleteMany({});
  console.log('  - Deleting materials...');
  await prisma.material.deleteMany({});
  console.log('  ✓ All old production data purged');
}

// =================================================================
// STEP 2: CREATE INFRASTRUCTURE
// =================================================================
async function createInfrastructure() {
  const stations = [];
  const now = new Date();

  // 10 Molding Machines
  for (let i = 1; i <= 10; i++) {
    stations.push(await prisma.station.create({
      data: {
        name: `Molding Machine ${i}`,
        code: `MOLD-${String(i).padStart(2, '0')}`,
        description: `Injection molding machine ${i} - ${[80, 120, 160, 200, 250][i % 5]}T`,
        workstationType: 'machine',
        capacity: 100,
        status: 'operational',
        active: true,
        updatedAt: now
      }
    }));
  }

  // 60 Spray Booths
  for (let i = 1; i <= 60; i++) {
    stations.push(await prisma.station.create({
      data: {
        name: `Spray Booth ${i}`,
        code: `SPRAY-${String(i).padStart(2, '0')}`,
        description: 'Manual spray painting booth',
        workstationType: 'hybrid',
        capacity: 50,
        status: 'operational',
        active: true,
        updatedAt: now
      }
    }));
  }

  // 1 Automatic Spray Booth
  stations.push(await prisma.station.create({
    data: {
      name: 'Automatic Spray Booth',
      code: 'AUTO-SPRAY-01',
      description: 'Automatic spray painting system',
      workstationType: 'machine',
      capacity: 200,
      status: 'operational',
      active: true,
      updatedAt: now
    }
  }));

  // 10 Pad Printing Machines
  for (let i = 1; i <= 10; i++) {
    stations.push(await prisma.station.create({
      data: {
        name: `Pad Printing Machine ${i}`,
        code: `PAD-${String(i).padStart(2, '0')}`,
        description: 'Pad printing workstation',
        workstationType: 'machine',
        capacity: 80,
        status: 'operational',
        active: true,
        updatedAt: now
      }
    }));
  }

  // 15 Ultrasonic Welding Machines
  for (let i = 1; i <= 15; i++) {
    stations.push(await prisma.station.create({
      data: {
        name: `Ultrasonic Welding Machine ${i}`,
        code: `ULTRA-${String(i).padStart(2, '0')}`,
        description: 'Ultrasonic welding station',
        workstationType: 'machine',
        capacity: 60,
        status: 'operational',
        active: true,
        updatedAt: now
      }
    }));
  }

  // 5 Automatic Screwing Machines
  for (let i = 1; i <= 5; i++) {
    stations.push(await prisma.station.create({
      data: {
        name: `Auto Screwing Machine ${i}`,
        code: `SCREW-${String(i).padStart(2, '0')}`,
        description: 'Automatic screwing station',
        workstationType: 'machine',
        capacity: 120,
        status: 'operational',
        active: true,
        updatedAt: now
      }
    }));
  }

  // 3 Riveting Machines
  for (let i = 1; i <= 3; i++) {
    stations.push(await prisma.station.create({
      data: {
        name: `Riveting Machine ${i}`,
        code: `RIVET-${String(i).padStart(2, '0')}`,
        description: 'Riveting workstation',
        workstationType: 'machine',
        capacity: 100,
        status: 'operational',
        active: true,
        updatedAt: now
      }
    }));
  }

  // 200 Assembly Workstations
  for (let i = 1; i <= 200; i++) {
    stations.push(await prisma.station.create({
      data: {
        name: `Assembly Workstation ${i}`,
        code: `ASSY-${String(i).padStart(3, '0')}`,
        description: 'Manual assembly workstation',
        workstationType: 'manual',
        capacity: 30,
        status: 'operational',
        active: true,
        updatedAt: now
      }
    }));
  }

  // 25 Packing Stations
  for (let i = 1; i <= 25; i++) {
    stations.push(await prisma.station.create({
      data: {
        name: `Packing Station ${i}`,
        code: `PACK-${String(i).padStart(2, '0')}`,
        description: 'Packing workstation',
        workstationType: 'hybrid',
        capacity: 40,
        status: 'operational',
        active: true,
        updatedAt: now
      }
    }));
  }

  console.log(`  ✓ Created ${stations.length} stations`);
  return { stations };
}

// =================================================================
// STEP 3: CREATE WORKFORCE
// =================================================================
async function createWorkforce() {
  const bcrypt = require('bcryptjs');
  const users = {};

  // Check if users exist
  const existingUsers = await prisma.user.findMany();
  if (existingUsers.length > 0) {
    console.log(`  ✓ Using existing ${existingUsers.length} users`);
    return {
      admin: existingUsers[0],
      all: existingUsers,
      supervisors: existingUsers.slice(0, Math.min(4, existingUsers.length)),
      operators: existingUsers
    };
  }

  // Create admin
  users.admin = await prisma.user.create({
    data: {
      email: 'admin@pramara.com',
      name: 'Admin User',
      passwordHash: await bcrypt.hash('admin123', 10)
    }
  });

  // Create supervisors
  users.supervisors = [];
  for (let i = 1; i <= 4; i++) {
    users.supervisors.push(await prisma.user.create({
      data: {
        email: `supervisor${i}@pramara.com`,
        name: `Supervisor ${i}`,
        passwordHash: await bcrypt.hash('supervisor123', 10)
      }
    }));
  }

  // Create 20 operators
  users.operators = [];
  for (let i = 1; i <= 20; i++) {
    users.operators.push(await prisma.user.create({
      data: {
        email: `operator${i}@pramara.com`,
        name: `Operator ${i}`,
        passwordHash: await bcrypt.hash('operator123', 10)
      }
    }));
  }

  users.all = [users.admin, ...users.supervisors, ...users.operators];
  console.log(`  ✓ Created ${users.all.length} users`);
  return users;
}

// =================================================================
// STEP 4: CREATE MATERIALS
// =================================================================
async function createMaterials() {
  const materials = [];

  // Plastic Resins
  const resins = [
    { id: 'ABS-BLACK', name: 'ABS Black Resin', type: 'resin', unit: 'kg', costPerUnit: 2.5, stockQty: 5000 },
    { id: 'ABS-WHITE', name: 'ABS White Resin', type: 'resin', unit: 'kg', costPerUnit: 2.4, stockQty: 5000 },
    { id: 'PP-NATURAL', name: 'PP Natural', type: 'resin', unit: 'kg', costPerUnit: 1.8, stockQty: 6000 },
    { id: 'PC-CLEAR', name: 'Polycarbonate Clear', type: 'resin', unit: 'kg', costPerUnit: 4.5, stockQty: 3000 }
  ];

  for (const r of resins) {
    materials.push(await prisma.material.create({ data: { ...r, updatedAt: new Date() } }));
  }

  // Paints
  const paints = [
    { id: 'PAINT-RED', name: 'Red Spray Paint', type: 'paint', unit: 'liter', costPerUnit: 15.0, stockQty: 500 },
    { id: 'PAINT-BLUE', name: 'Blue Spray Paint', type: 'paint', unit: 'liter', costPerUnit: 15.0, stockQty: 500 },
    { id: 'PAINT-BLACK', name: 'Black Spray Paint', type: 'paint', unit: 'liter', costPerUnit: 12.0, stockQty: 600 },
    { id: 'PAINT-WHITE', name: 'White Spray Paint', type: 'paint', unit: 'liter', costPerUnit: 12.0, stockQty: 600 }
  ];

  for (const p of paints) {
    materials.push(await prisma.material.create({ data: { ...p, updatedAt: new Date() } }));
  }

  // Fasteners
  const fasteners = [
    { id: 'SCREW-M3', name: 'M3x10mm Screw', type: 'fastener', unit: 'pcs', costPerUnit: 0.05, stockQty: 100000 },
    { id: 'RIVET-3MM', name: '3mm Plastic Rivet', type: 'fastener', unit: 'pcs', costPerUnit: 0.03, stockQty: 150000 }
  ];

  for (const f of fasteners) {
    materials.push(await prisma.material.create({ data: { ...f, updatedAt: new Date() } }));
  }

  // Packaging
  const packaging = [
    { id: 'BOX-SMALL', name: 'Small Box', type: 'packaging', unit: 'pcs', costPerUnit: 0.50, stockQty: 10000 },
    { id: 'BOX-MEDIUM', name: 'Medium Box', type: 'packaging', unit: 'pcs', costPerUnit: 0.80, stockQty: 8000 }
  ];

  for (const p of packaging) {
    materials.push(await prisma.material.create({ data: { ...p, updatedAt: new Date() } }));
  }

  console.log(`  ✓ Created ${materials.length} materials`);
  return materials;
}

// =================================================================
// STEP 5: CREATE PLANNING PROJECTS (12 projects)
// =================================================================
async function createPlanningProjects(admin) {
  const projects = [];
  const stages = ['CONCEPT', 'FEASIBILITY', 'DESIGN', 'PROTOTYPE', 'TRIAL', 'PRE_PRODUCTION'];

  const templates = [
    { name: 'Premium Sunglasses 2026', code: 'PSG-2026', qty: 50000, components: 5 },
    { name: 'Smart Water Bottle', code: 'SWB-PRO', qty: 30000, components: 5 },
    { name: 'Ergonomic Keyboard', code: 'EKB-001', qty: 20000, components: 5 },
    { name: 'LED Desk Lamp', code: 'LDL-MOD', qty: 40000, components: 5 },
    { name: 'Portable Speaker', code: 'PSO-001', qty: 35000, components: 5 },
    { name: 'Kitchen Timer', code: 'KTD-001', qty: 60000, components: 5 },
    { name: 'Phone Stand', code: 'PSA-001', qty: 80000, components: 3 },
    { name: 'Travel Mug', code: 'TMI-001', qty: 45000, components: 5 },
    { name: 'Wall Clock', code: 'WCM-001', qty: 25000, components: 5 },
    { name: 'Cable Organizer', code: 'COS-001', qty: 100000, components: 4 },
    { name: 'Plant Pot', code: 'PPW-001', qty: 35000, components: 5 },
    { name: 'Lunch Box', code: 'LBC-001', qty: 55000, components: 5 }
  ];

  for (let i = 0; i < 12; i++) {
    const t = templates[i];
    const project = await prisma.project.create({
      data: {
        name: `${t.name} [${stages[i % stages.length]}]`,
        code: t.code,
        quantity: t.qty,
        cutoffDate: addDays(new Date(), 150 + i * 20),
        sku: `${t.code}-MAIN`
      }
    });

    // Create SKUs for components
    for (let j = 1; j <= t.components; j++) {
      await prisma.projectSku.create({
        data: {
          projectId: project.id,
          name: `Component ${j}`,
          code: `${t.code}-C${j}`,
          orderQty: t.qty,
          color: `Planning - Component ${j}`,
          type: 'Component'
        }
      });
    }

    projects.push(project);
  }

  console.log(`  ✓ Created ${projects.length} planning projects`);
  return projects;
}

// =================================================================
// STEP 6: CREATE PRODUCTION PROJECTS (8 projects) - CONTINUED...
// =================================================================

async function createProductionProjects(stations, materials, users) {
  const projects = [];

  const templates = [
    {
      name: 'HIT Sunglasses Classic',
      code: 'HIT-SUN-001',
      quantity: 100000,
      dailyTarget: 2500,
      skus: [
        { name: 'Front Frame', cycleTime: 45, cavities: 4, material: 'ABS-BLACK' },
        { name: 'Temple Left', cycleTime: 35, cavities: 8, material: 'ABS-BLACK' },
        { name: 'Temple Right', cycleTime: 35, cavities: 8, material: 'ABS-BLACK' },
        { name: 'Lens Left', cycleTime: 25, cavities: 4, material: 'PC-CLEAR' },
        { name: 'Lens Right', cycleTime: 25, cavities: 4, material: 'PC-CLEAR' }
      ],
      flow: [
        { step: 'Molding', type: 'MOLD', cycleTime: 45, stationPrefix: 'MOLD' },
        { step: 'Spray Painting', type: 'SPRAY', cycleTime: 120, stationPrefix: 'SPRAY' },
        { step: 'Pad Printing', type: 'PAD', cycleTime: 30, stationPrefix: 'PAD' },
        { step: 'Manual Assembly', type: 'ASSY', cycleTime: 180, stationPrefix: 'ASSY' },
        { step: 'Screwing', type: 'SCREW', cycleTime: 60, stationPrefix: 'SCREW' },
        { step: 'QC Check', type: 'QC', cycleTime: 30, stationPrefix: 'ASSY' },
        { step: 'Packing', type: 'PACK', cycleTime: 45, stationPrefix: 'PACK' }
      ]
    },
    {
      name: 'Wireless Mouse Ergonomic',
      code: 'WME-001',
      quantity: 75000,
      dailyTarget: 1875,
      skus: [
        { name: 'Top Shell', cycleTime: 40, cavities: 2, material: 'ABS-WHITE' },
        { name: 'Bottom Shell', cycleTime: 40, cavities: 2, material: 'ABS-BLACK' },
        { name: 'Scroll Wheel', cycleTime: 20, cavities: 8, material: 'ABS-WHITE' }
      ],
      flow: [
        { step: 'Molding', type: 'MOLD', cycleTime: 40, stationPrefix: 'MOLD' },
        { step: 'Spray Painting', type: 'SPRAY', cycleTime: 120, stationPrefix: 'SPRAY' },
        { step: 'PCB Assembly', type: 'ASSY', cycleTime: 240, stationPrefix: 'ASSY' },
        { step: 'Ultrasonic Welding', type: 'ULTRA', cycleTime: 45, stationPrefix: 'ULTRA' },
        { step: 'QC Test', type: 'QC', cycleTime: 60, stationPrefix: 'ASSY' },
        { step: 'Retail Packing', type: 'PACK', cycleTime: 50, stationPrefix: 'PACK' }
      ]
    },
    {
      name: 'USB Hub 4-Port',
      code: 'USB4-001',
      quantity: 90000,
      dailyTarget: 2250,
      skus: [
        { name: 'Housing Top', cycleTime: 30, cavities: 4, material: 'ABS-WHITE' },
        { name: 'Housing Bottom', cycleTime: 30, cavities: 4, material: 'ABS-WHITE' }
      ],
      flow: [
        { step: 'Molding', type: 'MOLD', cycleTime: 30, stationPrefix: 'MOLD' },
        { step: 'Surface Coating', type: 'SPRAY', cycleTime: 90, stationPrefix: 'AUTO-SPRAY' },
        { step: 'PCB Assembly', type: 'ASSY', cycleTime: 180, stationPrefix: 'ASSY' },
        { step: 'Ultrasonic Welding', type: 'ULTRA', cycleTime: 40, stationPrefix: 'ULTRA' },
        { step: 'Connection Test', type: 'QC', cycleTime: 45, stationPrefix: 'ASSY' },
        { step: 'Box Packing', type: 'PACK', cycleTime: 35, stationPrefix: 'PACK' }
      ]
    },
    {
      name: 'Pen Holder Rotating',
      code: 'PHR-001',
      quantity: 120000,
      dailyTarget: 3000,
      skus: [
        { name: 'Base', cycleTime: 50, cavities: 2, material: 'PP-NATURAL' },
        { name: 'Rotating Top', cycleTime: 45, cavities: 2, material: 'PP-NATURAL' },
        { name: 'Compartments', cycleTime: 25, cavities: 4, material: 'PP-NATURAL' }
      ],
      flow: [
        { step: 'Molding', type: 'MOLD', cycleTime: 50, stationPrefix: 'MOLD' },
        { step: 'Spray Painting', type: 'SPRAY', cycleTime: 100, stationPrefix: 'SPRAY' },
        { step: 'Component Assembly', type: 'ASSY', cycleTime: 120, stationPrefix: 'ASSY' },
        { step: 'Rivet Installation', type: 'RIVET', cycleTime: 45, stationPrefix: 'RIVET' },
        { step: 'Rotation Test', type: 'QC', cycleTime: 30, stationPrefix: 'ASSY' },
        { step: 'Shrink Wrap', type: 'PACK', cycleTime: 40, stationPrefix: 'PACK' }
      ]
    },
    {
      name: 'Smartphone Stand Foldable',
      code: 'SSF-001',
      quantity: 150000,
      dailyTarget: 3750,
      skus: [
        { name: 'Front Plate', cycleTime: 35, cavities: 4, material: 'ABS-WHITE' },
        { name: 'Back Support', cycleTime: 35, cavities: 4, material: 'ABS-WHITE' }
      ],
      flow: [
        { step: 'Molding', type: 'MOLD', cycleTime: 35, stationPrefix: 'MOLD' },
        { step: 'Auto Spray', type: 'SPRAY', cycleTime: 80, stationPrefix: 'AUTO-SPRAY' },
        { step: 'Hinge Assembly', type: 'ASSY', cycleTime: 90, stationPrefix: 'ASSY' },
        { step: 'Pin Riveting', type: 'RIVET', cycleTime: 35, stationPrefix: 'RIVET' },
        { step: 'Fold Test', type: 'QC', cycleTime: 25, stationPrefix: 'ASSY' },
        { step: 'Card Packing', type: 'PACK', cycleTime: 30, stationPrefix: 'PACK' }
      ]
    },
    {
      name: 'Earphone Case Protective',
      code: 'ECP-001',
      quantity: 80000,
      dailyTarget: 2000,
      skus: [
        { name: 'Case Body', cycleTime: 40, cavities: 4, material: 'ABS-BLACK' },
        { name: 'Lid', cycleTime: 35, cavities: 4, material: 'ABS-BLACK' }
      ],
      flow: [
        { step: 'Molding', type: 'MOLD', cycleTime: 40, stationPrefix: 'MOLD' },
        { step: 'Spray Painting', type: 'SPRAY', cycleTime: 110, stationPrefix: 'SPRAY' },
        { step: 'Logo Printing', type: 'PAD', cycleTime: 35, stationPrefix: 'PAD' },
        { step: 'Insert Installation', type: 'ASSY', cycleTime: 60, stationPrefix: 'ASSY' },
        { step: 'Hinge Welding', type: 'ULTRA', cycleTime: 40, stationPrefix: 'ULTRA' },
        { step: 'Fit Test', type: 'QC', cycleTime: 30, stationPrefix: 'ASSY' },
        { step: 'Blister Pack', type: 'PACK', cycleTime: 45, stationPrefix: 'PACK' }
      ]
    },
    {
      name: 'Key Organizer Compact',
      code: 'KOC-001',
      quantity: 110000,
      dailyTarget: 2750,
      skus: [
        { name: 'Frame Left', cycleTime: 30, cavities: 4, material: 'ABS-BLACK' },
        { name: 'Frame Right', cycleTime: 30, cavities: 4, material: 'ABS-BLACK' }
      ],
      flow: [
        { step: 'Molding', type: 'MOLD', cycleTime: 30, stationPrefix: 'MOLD' },
        { step: 'Spray Painting', type: 'SPRAY', cycleTime: 100, stationPrefix: 'SPRAY' },
        { step: 'Hardware Assembly', type: 'ASSY', cycleTime: 120, stationPrefix: 'ASSY' },
        { step: 'Frame Screwing', type: 'SCREW', cycleTime: 50, stationPrefix: 'SCREW' },
        { step: 'Assembly Check', type: 'QC', cycleTime: 25, stationPrefix: 'ASSY' },
        { step: 'Box Packing', type: 'PACK', cycleTime: 40, stationPrefix: 'PACK' }
      ]
    },
    {
      name: 'Desk Organizer Multi-Section',
      code: 'DOM-001',
      quantity: 95000,
      dailyTarget: 2375,
      skus: [
        { name: 'Main Tray', cycleTime: 60, cavities: 2, material: 'PP-NATURAL' },
        { name: 'Small Divider', cycleTime: 20, cavities: 8, material: 'PP-NATURAL' },
        { name: 'Large Divider', cycleTime: 25, cavities: 4, material: 'PP-NATURAL' }
      ],
      flow: [
        { step: 'Molding', type: 'MOLD', cycleTime: 60, stationPrefix: 'MOLD' },
        { step: 'Spray Painting', type: 'SPRAY', cycleTime: 120, stationPrefix: 'SPRAY' },
        { step: 'Divider Assembly', type: 'ASSY', cycleTime: 150, stationPrefix: 'ASSY' },
        { step: 'Welding', type: 'ULTRA', cycleTime: 50, stationPrefix: 'ULTRA' },
        { step: 'Visual Inspection', type: 'QC', cycleTime: 30, stationPrefix: 'ASSY' },
        { step: 'Carton Packing', type: 'PACK', cycleTime: 50, stationPrefix: 'PACK' }
      ]
    }
  ];

  for (const t of templates) {
    // Create project
    const project = await prisma.project.create({
      data: {
        name: `${t.name} [Production]`,
        code: t.code,
        quantity: t.quantity,
        cutoffDate: addDays(new Date(), 90),
        sku: `${t.code}-MAIN`
      }
    });

    // Create SKUs and store references
    const projectSkus = [];
    for (let skuIndex = 0; skuIndex < t.skus.length; skuIndex++) {
      const sku = t.skus[skuIndex];
      const projectSku = await prisma.projectSku.create({
        data: {
          projectId: project.id,
          name: sku.name,
          code: `${t.code}-${sku.name.replace(/\s/g, '')}`,
          orderQty: t.quantity,
          color: `Material: ${sku.material}`,
          type: 'Component',
          attributes: {
            cycleTime: sku.cycleTime,
            cavities: sku.cavities,
            material: sku.material,
            dailyTarget: t.dailyTarget
          }
        }
      });
      projectSkus.push(projectSku);

      // Create Mold (one per SKU with unique code)
      await prisma.mold.create({
        data: {
          projectId: project.id,
          moldCode: `${t.code}-${sku.name.substring(0, 4).toUpperCase()}-${skuIndex + 1}`,
          moldName: `Mold for ${sku.name}`,
          cavities: sku.cavities,
          material: sku.material,
          status: 'approved',
          weight: 50 + Math.random() * 100,
          createdBy: users.admin.id,
          notes: `Cycle time: ${sku.cycleTime}s, Component: ${sku.name}`
        }
      });
    }

    // Create Project Costing
    const materialCost = 15 + Math.random() * 35; // $15-50
    const laborCost = 8 + Math.random() * 12; // $8-20
    const overheadCost = 5 + Math.random() * 10; // $5-15
    const totalCost = materialCost + laborCost + overheadCost;
    const marginPercent = 25 + Math.random() * 15; // 25-40% margin
    const sellingPrice = totalCost * (1 + marginPercent / 100);

    await prisma.projectCosting.create({
      data: {
        projectId: project.id,
        version: 1,
        status: 'approved',
        exFactoryCost: totalCost,
        sellingPrice: sellingPrice,
        createdBy: users.admin.id,
        approvedBy: users.admin.id,
        approvedAt: new Date()
      }
    });

    // Create Purchase Order
    await prisma.purchaseOrder.create({
      data: {
        projectId: project.id,
        poNumber: `PO-${t.code}-${new Date().getFullYear()}`,
        fileKey: `po/${t.code}/${Date.now()}.pdf`
      }
    });

    // Create Process Flow
    const processFlow = await prisma.processFlow.create({
      data: {
        projectId: project.id,
        flowName: `${t.name} - Production Flow`,
        flowDescription: `Complete ${t.flow.length}-step production process`,
        status: 'active',
        version: '1.0',
        totalOperations: t.flow.length,
        estimatedDuration: t.flow.reduce((sum, f) => sum + f.cycleTime, 0),
        createdBy: users.admin.id
      }
    });

    // Create Process Operations
    for (let i = 0; i < t.flow.length; i++) {
      const f = t.flow[i];
      
      // Find appropriate station
      const availableStations = stations.filter(s => 
        s.code && s.code.startsWith(f.stationPrefix)
      );
      const station = availableStations[randomInt(0, availableStations.length - 1)];

      const operation = await prisma.processOperation.create({
        data: {
          processFlowId: processFlow.id,
          operationName: f.step,
          operationCode: `${t.code}-OP${String(i + 1).padStart(2, '0')}`,
          operationDescription: `${f.type} operation for ${t.name}`,
          sequence: i + 1,
          stationId: station?.id,
          estimatedTime: f.cycleTime,
          standardOutput: Math.floor(720 / f.cycleTime), // Assumes 12-hour shift
          skillLevel: f.type === 'QC' ? 'advanced' : (f.type === 'ASSY' ? 'intermediate' : 'beginner'),
          qualityCheckpoints: f.type === 'QC' ? ['visual', 'dimensional', 'functional'] : [],
          predecessorIds: i > 0 ? [i] : [], // Simple sequential dependency
          notes: `Cycle time: ${f.cycleTime} min, Station type: ${f.type}`
        }
      });

      // Create BOM items (linked to first SKU, not project) AND ProductComponent (for workflow check)
      if (f.type === 'MOLD') {
        const resin = materials.find(m => m.type === 'resin');
        if (resin && projectSkus.length > 0) {
          const qty = 0.05 + Math.random() * 0.1;
          await prisma.bOMItem.create({
            data: {
              skuId: projectSkus[0].id,
              materialId: resin.id,
              quantityPerUnit: qty,
              unit: 'kg',
              notes: `Operation: ${f.step}`,
              isActive: true
            }
          });
          // Also create ProductComponent + ComponentMaterial for workflow status check
          const component = await prisma.productComponent.create({
            data: {
              projectId: project.id,
              skuId: projectSkus[0].id,
              name: `Resin Component`,
              type: 'material',
              material: resin.name,
              color: 'N/A',
              qtyPerUnit: 1,
              active: true
            }
          });
          await prisma.componentMaterial.create({
            data: {
              componentId: component.id,
              materialId: resin.id,
              qtyPerComponent: qty,
              unit: 'kg',
              stage: 'MOLD'
            }
          });
        }
      } else if (f.type === 'SPRAY') {
        const paint = materials.find(m => m.type === 'paint');
        if (paint && projectSkus.length > 0) {
          const qty = 0.01 + Math.random() * 0.02;
          await prisma.bOMItem.create({
            data: {
              skuId: projectSkus[0].id,
              materialId: paint.id,
              quantityPerUnit: qty,
              unit: 'liter',
              notes: `Operation: ${f.step}`,
              isActive: true
            }
          });
          const component = await prisma.productComponent.create({
            data: {
              projectId: project.id,
              skuId: projectSkus[0].id,
              name: `Paint Component`,
              type: 'material',
              material: paint.name,
              color: 'N/A',
              qtyPerUnit: 1,
              active: true
            }
          });
          await prisma.componentMaterial.create({
            data: {
              componentId: component.id,
              materialId: paint.id,
              qtyPerComponent: qty,
              unit: 'liter',
              stage: 'SPRAY'
            }
          });
        }
      } else if (f.type === 'SCREW') {
        const screw = materials.find(m => m.id === 'SCREW-M3');
        if (screw && projectSkus.length > 0) {
          const qty = 2 + randomInt(1, 4);
          await prisma.bOMItem.create({
            data: {
              skuId: projectSkus[0].id,
              materialId: screw.id,
              quantityPerUnit: qty,
              unit: 'pcs',
              notes: `Operation: ${f.step}`,
              isActive: true
            }
          });
          const component = await prisma.productComponent.create({
            data: {
              projectId: project.id,
              skuId: projectSkus[0].id,
              name: `Screw Component`,
              type: 'fastener',
              material: screw.name,
              color: 'N/A',
              qtyPerUnit: 2,
              active: true
            }
          });
          await prisma.componentMaterial.create({
            data: {
              componentId: component.id,
              materialId: screw.id,
              qtyPerComponent: qty,
              unit: 'pcs',
              stage: 'SCREW'
            }
          });
        }
      } else if (f.type === 'PACK') {
        const box = materials.find(m => m.id === 'BOX-SMALL');
        if (box && projectSkus.length > 0) {
          await prisma.bOMItem.create({
            data: {
              skuId: projectSkus[0].id,
              materialId: box.id,
              quantityPerUnit: 1,
              unit: 'pcs',
              notes: `Operation: ${f.step}`,
              isActive: true
            }
          });
          const component = await prisma.productComponent.create({
            data: {
              projectId: project.id,
              skuId: projectSkus[0].id,
              name: `Packaging Component`,
              type: 'packaging',
              material: box.name,
              color: 'N/A',
              qtyPerUnit: 1,
              active: true
            }
          });
          await prisma.componentMaterial.create({
            data: {
              componentId: component.id,
              materialId: box.id,
              qtyPerComponent: 1,
              unit: 'pcs',
              stage: 'PACK'
            }
          });
        }
      }

      // QCSubmission requires templateId and actual submission data
      // Skip creating QC submissions in seed - they'll be created during actual production
    }

    projects.push({ ...project, flow: t.flow });
  }

  console.log(`  ✓ Created ${projects.length} production projects with complete flows`);
  return projects;
}

// =================================================================
// STEP 7: CREATE SHIFT SCHEDULES
// =================================================================
async function createShiftSchedules(users, projects) {
  let shiftCount = 0;

  for (let day = -10; day <= 30; day++) {
    const date = addDays(new Date(), day);
    
    // Day Shift
    const dayShiftStart = new Date(date);
    dayShiftStart.setHours(8, 0, 0);
    const dayShiftEnd = new Date(date);
    dayShiftEnd.setHours(20, 0, 0);
    
    // Day shift for each project
    for (const project of projects.slice(0, 4)) {
      await prisma.shiftEntry.create({
        data: {
          projectId: project.id,
          shiftDate: date,
          shiftType: 'morning',
          shiftStartTime: dayShiftStart,
          shiftEndTime: dayShiftEnd,
          supervisorId: users.all[Math.abs(day) % users.all.length].id,
          createdBy: users.all[0].id,
          workersPresent: 15 + randomInt(0, 10),
          targetProduction: 100 + randomInt(0, 50),
          status: 'submitted'
        }
      });
      shiftCount++;
    }

    // Night Shift
    const nightShiftStart = new Date(date);
    nightShiftStart.setHours(20, 0, 0);
    const nightShiftEnd = new Date(addDays(date, 1));
    nightShiftEnd.setHours(8, 0, 0);
    
    // Night shift for each project
    for (const project of projects.slice(4, 8)) {
      await prisma.shiftEntry.create({
        data: {
          projectId: project.id,
          shiftDate: date,
          shiftType: 'night',
          shiftStartTime: nightShiftStart,
          shiftEndTime: nightShiftEnd,
          supervisorId: users.all[(Math.abs(day) + 1) % users.all.length].id,
          createdBy: users.all[0].id,
          workersPresent: 12 + randomInt(0, 8),
          targetProduction: 80 + randomInt(0, 40),
          status: 'submitted'
        }
      });
      shiftCount++;
    }
  }

  console.log(`  ✓ Created ${shiftCount} shift entries (41 days x 2 shifts)`);
}

// =================================================================
// STEP 8: CREATE WORK ORDERS & WIP
// =================================================================
async function createWorkOrders(stations, users, projects) {
  let woCount = 0;
  let wipCount = 0;

  for (const project of projects) {
    // Get all operations for this project
    const processFlows = await prisma.processFlow.findMany({
      where: { projectId: project.id },
      include: { operations: true }
    });

    if (processFlows.length === 0) continue;

    const operations = processFlows[0].operations;
    const dailyTarget = project.metadata?.dailyTarget || 1000;

    // Create work orders for past 5 days
    for (let day = -5; day < 0; day++) {
      const date = addDays(new Date(), day);

      for (const operation of operations) {
        const station = operation.stationId 
          ? stations.find(s => s.id === operation.stationId)
          : null;

        if (!station) continue;

        const targetQty = dailyTarget / operations.length / 2; // Split between shifts
        const actualQty = Math.floor(targetQty * (0.85 + Math.random() * 0.15));
        const rejectedQty = Math.floor(actualQty * 0.02);

        // Day shift WO
        const dayWO = await prisma.workOrder.create({
          data: {
            projectId: project.id,
            operationId: operation.id,
            stationId: station.id,
            assignedTo: users.operators[randomInt(0, users.operators.length - 1)].id,
            workOrderNumber: `WO-${project.code}-${operation.sequenceOrder}-D${Math.abs(day)}-DAY`,
            scheduledDate: date,
            shiftType: 'DAY',
            status: 'COMPLETED',
            priority: project.priority,
            targetQuantity: targetQty,
            completedQuantity: actualQty,
            rejectedQuantity: rejectedQty,
            metadata: {
              cycleTime: operation.metadata?.cycleTime || 60,
              stationCode: station.code,
              operationName: operation.name,
              shiftTransfer: {
                transferTime: '20:00',
                machineStatus: 'Running',
                notes: 'Normal operation'
              }
            }
          }
        });
        woCount++;

        // Night shift WO
        await prisma.workOrder.create({
          data: {
            projectId: project.id,
            operationId: operation.id,
            stationId: station.id,
            assignedTo: users.operators[randomInt(0, users.operators.length - 1)].id,
            workOrderNumber: `WO-${project.code}-${operation.sequenceOrder}-D${Math.abs(day)}-NIGHT`,
            scheduledDate: date,
            shiftType: 'NIGHT',
            status: 'COMPLETED',
            priority: project.priority,
            targetQuantity: targetQty,
            completedQuantity: actualQty,
            rejectedQuantity: rejectedQty,
            metadata: {
              cycleTime: operation.metadata?.cycleTime || 60,
              stationCode: station.code,
              operationName: operation.name,
              shiftTransfer: {
                transferTime: '08:00',
                machineStatus: 'Running',
                notes: 'Normal operation'
              }
            }
          }
        });
        woCount++;

        // Create WIP ledger entries
        await prisma.wIPLedger.create({
          data: {
            projectId: project.id,
            operationId: operation.id,
            date: date,
            shiftType: 'DAY',
            openingBalance: Math.floor(targetQty * 0.1),
            received: actualQty,
            consumed: Math.floor(actualQty * 0.98),
            rejected: rejectedQty,
            closingBalance: Math.floor(targetQty * 0.12),
            metadata: {
              workOrderNumber: dayWO.workOrderNumber,
              stationCode: station.code
            }
          }
        });
        wipCount++;

        await prisma.wIPLedger.create({
          data: {
            projectId: project.id,
            operationId: operation.id,
            date: date,
            shiftType: 'NIGHT',
            openingBalance: Math.floor(targetQty * 0.12),
            received: actualQty,
            consumed: Math.floor(actualQty * 0.98),
            rejected: rejectedQty,
            closingBalance: Math.floor(targetQty * 0.14),
            metadata: {
              workOrderNumber: `WO-${project.code}-${operation.sequenceOrder}-D${Math.abs(day)}-NIGHT`,
              stationCode: station.code
            }
          }
        });
        wipCount++;
      }
    }
  }

  console.log(`  ✓ Created ${woCount} work orders`);
  console.log(`  ✓ Created ${wipCount} WIP ledger entries`);
}

// =================================================================
// EXECUTE MAIN
// =================================================================
main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
