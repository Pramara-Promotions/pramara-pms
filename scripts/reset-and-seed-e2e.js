/*
  Reset and Seed (E2E) — Full realistic dataset for demos and validation

  What this does:
  1) Hard-reset DB by truncating all public tables (except _prisma_migrations)
  2) Seed factories (2), floors (3 each), sections (12 each), rooms (1 per section)
  3) Seed 460 stations across machine/manual types distributed across rooms
  4) Create users (10) for supervisors/creators and settings for costing
  5) Create third-party providers (3) and 600 workers (company + contractors)
  6) Create 13 projects (8 active + 5 pipeline) with SKUs, process flows, documents, QC templates
  7) For active projects: generate 30 days shift entries across multiple stations, plus QC submissions
  8) Create costings with components to power P&L and variance endpoints

  Notes:
  - Safe for dev/demo. DO NOT run in production.
  - Requires DATABASE_URL to be configured and migrations applied.
*/

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function lastNDates(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
}

const MACHINE_TYPES = [
  { key: 'MOULD', label: 'Moulding Machine', wsType: 'machine' },
  { key: 'SPRAY', label: 'Spray Booth', wsType: 'machine' },
  { key: 'PAD', label: 'Pad Printing', wsType: 'machine' },
  { key: 'ULTRA', label: 'Ultrasonic Machine', wsType: 'machine' },
  { key: 'PACK', label: 'Packing Station', wsType: 'manual' },
  { key: 'WORK', label: 'Assembly Workstation', wsType: 'manual' },
];

async function truncateAll() {
  // Truncate all public tables except Prisma migrations
  // Postgres-specific; uses CASCADE to respect FKs
  const tables = await prisma.$queryRawUnsafe(`
    SELECT tablename AS name
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations';
  `);

  const tableList = tables.map(t => `"public"."${t.name}"`).join(', ');
  if (tableList.length === 0) return;
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`);
}

async function ensureBaseUsers() {
  const existing = await prisma.user.findMany();
  if (existing.length >= 5) return existing;
  const bcrypt = require('bcryptjs');
  const users = [];
  for (let i = 1; i <= 10; i++) {
    users.push(
      prisma.user.upsert({
        where: { email: `user${i}@pramara.com` },
        update: {},
        create: {
          email: `user${i}@pramara.com`,
          name: `User ${i}`,
          firstName: 'User',
          lastName: `${i}`,
          passwordHash: await bcrypt.hash('password123', 10),
          status: 'ACTIVE',
        },
      })
    );
  }
  return Promise.all(users);
}

async function seedFactoriesFloorsSectionsRooms() {
  const factories = [];
  const sectionsMaster = [
    'Moulding', 'Spray Booth', 'Pad Printing', 'Ultrasonic',
    'Assembly', 'Packing', 'Quality Assurance', 'Storage',
    'Maintenance', 'Tool Room', 'Incoming QC', 'Outgoing QC',
  ];

  for (let f = 1; f <= 2; f++) {
    const factory = await prisma.factory.create({
      data: {
        name: `Pramara Unit ${f}`,
        code: `FAC-${String(f).padStart(2, '0')}`,
        location: f === 1 ? 'Mumbai, IN' : 'Vasai, IN',
        address: `Industrial Estate Block ${f}`,
        contactPerson: `Factory Manager ${f}`,
        contactPhone: `+91-90000${f}000`,
        updatedAt: new Date(),
      },
    });

    for (let fl = 0; fl < 3; fl++) {
      const floor = await prisma.floor.create({
        data: {
          factoryId: factory.id,
          name: fl === 0 ? 'Ground' : fl === 1 ? 'First' : 'Second',
          floorNumber: fl,
          updatedAt: new Date(),
        },
      });

      // 12 sections per factory (spread across floors ~4 each)
      for (let si = 0; si < 4; si++) {
        const sectionName = sectionsMaster[fl * 4 + si];
        const section = await prisma.section.create({
          data: {
            floorId: floor.id,
            name: sectionName,
            description: `${sectionName} Area`,
            updatedAt: new Date(),
          },
        });

        // 1 room per section
        await prisma.room.create({
          data: {
            sectionId: section.id,
            name: `${sectionName} Room`,
            roomNumber: `${fl + 1}${si + 1}`,
            description: `${sectionName} Workspace`,
            updatedAt: new Date(),
          },
        });
      }
    }
    factories.push(factory);
  }

  return factories;
}

async function seedStations(targetTotal = 460) {
  const rooms = await prisma.room.findMany();
  if (rooms.length === 0) throw new Error('Rooms not created');

  // Distribution across types totaling ~460
  const dist = {
    MOULD: 100,
    SPRAY: 80,
    PAD: 60,
    ULTRA: 40,
    PACK: 80,
    WORK: 100,
  };

  const now = new Date();
  const stationsData = [];
  for (const type of MACHINE_TYPES) {
    const count = dist[type.key] || 0;
    for (let i = 1; i <= count; i++) {
      const room = pick(rooms);
      stationsData.push({
        name: `${type.label} ${i}`,
        code: `${type.key}-${String(i).padStart(3, '0')}`,
        workstationType: type.wsType,
        capacity: randInt(60, 180),
        status: 'operational',
        description: `${type.label} in ${room.name}`,
        roomId: room.id,
        updatedAt: now,
      });
    }
  }
  
  // Create stations in batches to avoid connection pool issues
  const batchSize = 50;
  const created = [];
  for (let i = 0; i < stationsData.length; i += batchSize) {
    const batch = stationsData.slice(i, i + batchSize);
    const batchCreated = await Promise.all(batch.map(s => prisma.station.create({ data: s })));
    created.push(...batchCreated);
    console.log(`  Stations batch ${Math.floor(i/batchSize) + 1}: ${batchCreated.length} created`);
  }
  return created;
}

async function seedProvidersAndWorkers(workerTarget = 600) {
  // Indian names pool
  const maleNames = ['Rajesh', 'Amit', 'Suresh', 'Vijay', 'Rahul', 'Anil', 'Manoj', 'Sandeep', 'Prakash', 'Deepak', 
    'Ravi', 'Ajay', 'Sanjay', 'Ramesh', 'Vinod', 'Ashok', 'Dinesh', 'Mukesh', 'Naveen', 'Pankaj',
    'Rohan', 'Nitin', 'Vishal', 'Sachin', 'Rakesh', 'Gopal', 'Mohan', 'Krishna', 'Sunil', 'Arun'];
  const femaleNames = ['Priya', 'Pooja', 'Sunita', 'Rekha', 'Anita', 'Kavita', 'Neha', 'Meera', 'Sonia', 'Asha',
    'Ritu', 'Geeta', 'Nisha', 'Anjali', 'Swati', 'Preeti', 'Divya', 'Sneha', 'Deepa', 'Lakshmi',
    'Savita', 'Radha', 'Usha', 'Suman', 'Kiran', 'Poonam', 'Shobha', 'Sarita', 'Mamta', 'Jyoti'];
  const surnames = ['Kumar', 'Singh', 'Sharma', 'Verma', 'Patel', 'Yadav', 'Reddy', 'Gupta', 'Joshi', 'Desai',
    'Nair', 'Iyer', 'Mehta', 'Pillai', 'Rao', 'Das', 'Bose', 'Chopra', 'Malhotra', 'Kapoor'];

  const getRandomName = () => {
    const isMale = Math.random() > 0.3; // 70% male in manufacturing
    const firstName = pick(isMale ? maleNames : femaleNames);
    const lastName = pick(surnames);
    return `${firstName} ${lastName}`;
  };

  // Contractors (3rd party providers)
  const providers = await Promise.all([
    prisma.thirdPartyProvider.create({
      data: { 
        id: 'prov-a', 
        name: 'Om Staffing Co.', 
        contactPerson: 'Rajiv Malhotra', 
        phone: '+91-900001', 
        email: 'rajiv@omstaffing.com',
        location: 'Pune, Maharashtra',
        updatedAt: new Date() 
      },
    }),
    prisma.thirdPartyProvider.create({
      data: { 
        id: 'prov-b', 
        name: 'Karma Associates', 
        contactPerson: 'Anand Verma', 
        phone: '+91-900002',
        email: 'anand@karmaassoc.com', 
        location: 'Mumbai, Maharashtra',
        updatedAt: new Date() 
      },
    }),
    prisma.thirdPartyProvider.create({
      data: { 
        id: 'prov-c', 
        name: 'Shakti Manpower', 
        contactPerson: 'Pradeep Sharma', 
        phone: '+91-900003',
        email: 'pradeep@shaktimanpower.com',
        location: 'Bangalore, Karnataka', 
        updatedAt: new Date() 
      },
    }),
  ]);

  const workers = [];
  const companyCount = Math.floor(workerTarget * 0.58); // ~58% company
  const contractorCount = workerTarget - companyCount;   // rest contractors (3rd party)

  // Company workers - permanent employees (batched)
  const batchSize = 50;
  for (let i = 1; i <= companyCount; i++) {
    const name = getRandomName();
    workers.push({
      id: `W-CMP-${Date.now()}-${i}`,
      name,
      employeeCode: `EC${String(i).padStart(5, '0')}`,
      workerType: 'company',
      skills: ['assembly', 'packing', 'quality', 'inspection'].slice(0, randInt(1, 3)),
      hireDate: new Date('2023-01-01'),
      hourlyRate: 120,
      overtimeRate: 180,
      status: 'active',
      updatedAt: new Date(),
    });
  }

  // Contractor workers - 3rd party (batched)
  for (let i = 1; i <= contractorCount; i++) {
    const name = getRandomName();
    const provider = pick(providers);
    workers.push({
      id: `W-CTR-${Date.now()}-${i}`,
      name,
      employeeCode: `CT${String(i).padStart(5, '0')}`,
      workerType: 'contractor',
      providerId: provider.id,
      skills: ['moulding', 'spray', 'pad_print', 'trimming'].slice(0, randInt(1, 3)),
      hireDate: new Date('2024-01-01'),
      hourlyRate: 100,
      overtimeRate: 150,
      status: 'active',
      updatedAt: new Date(),
    });
  }
  
  // Create workers in batches to avoid connection pool timeout
  const createdWorkers = [];
  for (let i = 0; i < workers.length; i += batchSize) {
    const batch = workers.slice(i, i + batchSize);
    const created = await Promise.all(batch.map(w => prisma.worker.create({ data: w })));
    createdWorkers.push(...created);
    console.log(`  Workers batch ${Math.floor(i/batchSize) + 1}: ${created.length} created`);
  }
  
  return createdWorkers;
}

async function seedWorkerPerformance(workers, projects) {
  // Create performance records for last 7 days to show efficiency
  const perfRecords = [];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  // Get first few project IDs
  const projectIds = projects.slice(0, 5).map(p => p.id);
  
  for (let day = 0; day < 7; day++) {
    const perfDate = new Date(sevenDaysAgo);
    perfDate.setDate(perfDate.getDate() + day);
    
    // Sample 50 random workers per day for performance tracking
    const sampleWorkers = workers.sort(() => Math.random() - 0.5).slice(0, 50);
    
    for (const worker of sampleWorkers) {
      const targetQty = 100 + randInt(0, 50);
      const actualQty = Math.floor(targetQty * (0.85 + Math.random() * 0.2)); // 85-105% efficiency
      const rejectedQty = Math.floor(actualQty * (Math.random() * 0.05)); // 0-5% rejection
      const efficiency = (actualQty / targetQty) * 100;
      const qualityRate = ((actualQty - rejectedQty) / actualQty) * 100;
      
      perfRecords.push(
        prisma.workerPerformance.create({
          data: {
            id: `PERF-${Date.now()}-${day}-${Math.random().toString(36).substr(2, 8)}`,
            workerId: worker.id,
            projectId: pick(projectIds),
            stationId: randInt(1, 50),
            date: perfDate,
            shiftId: `SH-${day}-${randInt(1, 3)}`,
            shiftType: pick(['morning', 'afternoon', 'night']),
            hoursWorked: 8,
            tasksCompleted: randInt(5, 15),
            targetQty,
            actualQty,
            rejectedQty,
            efficiency,
            qualityRate,
          },
        })
      );
    }
  }
  
  // Create performance records in batches
  const batchSize = 50;
  let createdCount = 0;
  for (let i = 0; i < perfRecords.length; i += batchSize) {
    const batch = perfRecords.slice(i, i + batchSize);
    await Promise.all(batch);
    createdCount += batch.length;
  }
  console.log(`✅ Performance records created: ${createdCount}`);
}

async function ensureCostingSettings() {
  const settings = [
    { key: 'laborHourlyRate', value: 120 },
    { key: 'overheadRatePct', value: 12.5 },
  ];
  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      create: { key: s.key, value: s.value, updatedAt: new Date() },
      update: { value: s.value, updatedAt: new Date() },
    });
  }
}

function buildProjectConfig(idx) {
  const customers = ['TechCorp', 'GreenCo', 'BizWorld', 'AutoMotive', 'NovaBrands', 'UrbanWorks', 'Sunrise Ltd', 'Pixel Inc'];
  const products = ['USB Drive', 'Water Bottle', 'Executive Pen', 'Metal Keychain', 'Notebook A5', 'Gift Box', 'Phone Stand', 'Badge Reel'];
  const name = `${products[idx % products.length]} - ${customers[idx % customers.length]}`;
  const code = `PROJ-${String(idx + 1).padStart(3, '0')}`;
  const sku = `${products[idx % products.length].toUpperCase().replace(/\s+/g, '-')}-${(2025).toString().slice(-2)}-${String(idx + 1).padStart(2, '0')}`;
  const qty = 30000 + (idx % 5) * 10000;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + 30 + idx * 7);
  return { name, code, sku, quantity: qty, cutoffDate };
}

async function seedProjectDocuments(projectId, creatorId) {
  const docs = [
    { kind: 'BOM', title: 'Bill of Materials v1', contentType: 'application/pdf' },
    { kind: 'QC_PLAN', title: 'QC Plan v1', contentType: 'application/pdf' },
    { kind: 'ARTWORK', title: 'Artwork Master', contentType: 'image/png' },
    { kind: 'SOP', title: 'Standard Operating Procedure', contentType: 'application/pdf' },
    { kind: 'CONTRACT', title: 'Customer PO & Contract', contentType: 'application/pdf' },
  ];
  for (const [i, d] of docs.entries()) {
    await prisma.projectDocument.create({
      data: {
        projectId,
        kind: d.kind,
        title: d.title,
        version: i + 1,
        active: true,
        contentType: d.contentType,
        storageKey: `project_${projectId}/${d.kind.toLowerCase()}_${i + 1}.dat`,
        uploadedBy: creatorId,
        updatedAt: new Date(),
      },
    });
  }
}

async function seedQCForProject(project, stations, skus, creatorId) {
  // Template
  const template = await prisma.qCChecklistTemplate.create({
    data: {
      id: `QCT-${project.id}`,
      name: `${project.code} QC Template`,
      projectId: project.id,
      version: 1,
      active: true,
      createdBy: creatorId,
      updatedAt: new Date(),
    },
  });
  const items = [
    { code: 'DIM_CHECK', label: 'Dimension Check (mm)', type: 'number', unit: 'mm', min: 49, max: 51 },
    { code: 'PANTONE', label: 'Pantone Match', type: 'enum', options: ['Match', 'Slight Deviation', 'Fail'] },
    { code: 'VISUAL', label: 'Visual Inspection', type: 'boolean' },
  ];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    await prisma.qCItemTemplate.create({
      data: {
        id: `${template.id}-I${i + 1}`,
        templateId: template.id,
        code: it.code,
        label: it.label,
        type: it.type,
        required: true,
        order: i + 1,
        unit: it.unit || null,
        min: it.min ?? null,
        max: it.max ?? null,
        options: it.options || [],
      },
    });
  }

  // A couple of submissions for first active days
  const subStations = stations.slice(0, 5);
  for (let d = 0; d < 5; d++) {
    const st = subStations[d % subStations.length];
    const sku = skus[d % skus.length];
    const subId = `QCS-${project.id}-${d + 1}`;
    await prisma.qCSubmission.create({
      data: {
        id: subId,
        templateId: template.id,
        projectId: project.id,
        stationId: st.id,
        projectSkuId: sku.id,
        overallPass: true,
        photos: [],
        submittedBy: creatorId,
        submittedAt: new Date(),
      },
    });
    await prisma.qCItemResult.create({
      data: { id: `${subId}-1`, submissionId: subId, code: 'DIM_CHECK', type: 'number', valueNumber: 50, pass: true, photoKeys: [] },
    });
    await prisma.qCItemResult.create({
      data: { id: `${subId}-2`, submissionId: subId, code: 'PANTONE', type: 'enum', valueEnum: 'Match', pass: true, photoKeys: [] },
    });
    await prisma.qCItemResult.create({
      data: { id: `${subId}-3`, submissionId: subId, code: 'VISUAL', type: 'boolean', valueBool: true, pass: true, photoKeys: [] },
    });
  }
}

async function seedProcessFlows(project, stations, creatorId) {
  // Create one process flow per project with 4-5 operations mapped to station groups
  const flow = await prisma.processFlow.create({
    data: {
      projectId: project.id,
      flowName: `${project.code} Main Process`,
      flowDescription: 'Autogenerated process flow',
      status: 'active',
      createdBy: creatorId,
    },
  });
  const groups = {
    MOULD: stations.filter(s => s.code.startsWith('MOULD-')),
    SPRAY: stations.filter(s => s.code.startsWith('SPRAY-')),
    PAD: stations.filter(s => s.code.startsWith('PAD-')),
    WORK: stations.filter(s => s.code.startsWith('WORK-')),
    PACK: stations.filter(s => s.code.startsWith('PACK-')),
    ULTRA: stations.filter(s => s.code.startsWith('ULTRA-')),
  };
  const ops = [
    { name: 'Moulding', code: 'OP-MOULD', group: 'MOULD' },
    { name: 'Spray Coating', code: 'OP-SPRAY', group: 'SPRAY' },
    { name: 'Pad Printing', code: 'OP-PAD', group: 'PAD' },
    { name: 'Assembly', code: 'OP-ASSM', group: 'WORK' },
    { name: 'Packaging', code: 'OP-PACK', group: 'PACK' },
  ];
  let seq = 1;
  for (const o of ops) {
    const g = groups[o.group];
    if (!g || g.length === 0) continue;
    await prisma.processOperation.create({
      data: {
        processFlowId: flow.id,
        operationName: o.name,
        operationCode: `${o.code}-${project.id}-${seq}`,
        sequence: seq++,
        stationId: pick(g).id,
        estimatedTime: randInt(60, 180),
        standardOutput: randInt(400, 1200),
        operationDescription: `${o.name} step`,
        isCriticalPath: seq <= 3,
      },
    });
  }
}

async function seedCosting(project, creatorId) {
  const pc = await prisma.projectCosting.create({
    data: {
      projectId: project.id,
      version: 1,
      status: 'approved',
      exFactoryCost: 0,
      fobCost: 0,
      sellingPrice: 0,
      createdBy: creatorId,
      approvedBy: creatorId,
      approvedAt: new Date(),
    },
  });
  const components = [
    { category: 'material', name: 'Plastic Resin', allocation: 'per_unit', quantity: 0.02, costPerUnit: 120, unit: 'kg' },
    { category: 'labor', name: 'Assembly', allocation: 'per_unit', quantity: 1, costPerUnit: 5, unit: 'min' },
    { category: 'overhead', name: 'Power & Utilities', allocation: 'per_unit', quantity: 1, costPerUnit: 2, unit: 'unit' },
    { category: 'asset', name: 'Mould Depreciation', allocation: 'per_unit', quantity: 1, costPerUnit: 1, unit: 'unit' },
  ];
  for (const c of components) {
    const total = (c.quantity || 0) * (c.costPerUnit || 0);
    await prisma.costComponent.create({
      data: {
        projectCostingId: pc.id,
        category: c.category,
        name: c.name,
        allocation: c.allocation,
        quantity: c.quantity,
        costPerUnit: c.costPerUnit,
        totalCost: total,
        unit: c.unit,
      },
    });
  }
}

async function seedProjects(stations, users) {
  const creatorId = users[0].id;
  const projects = [];
  // 13 projects: 8 active + 5 pipeline
  for (let i = 0; i < 13; i++) {
    const pCfg = buildProjectConfig(i);
    const project = await prisma.project.create({ data: pCfg });
    projects.push(project);

    // SKUs 3-5 per project
    const skuCount = randInt(3, 5);
    const skus = [];
    for (let k = 1; k <= skuCount; k++) {
      skus.push(await prisma.projectSku.create({
        data: {
          projectId: project.id,
          code: `${project.code}-SKU-${k}`,
          name: `SKU ${k}`,
          orderQty: Math.floor(project.quantity / skuCount),
          color: ['Black', 'Blue', 'Red', 'Silver'][k % 4],
          type: 'FinishedGood',
          attributes: { unitPrice: 100 + k * 5, dimensions: 'N/A' },
        },
      }));
    }

    await seedProjectDocuments(project.id, creatorId);
    await seedProcessFlows(project, stations, creatorId);
    await seedCosting(project, creatorId);

    // Mark first 8 as active with QC + ShiftEntries, remaining 5 as pipeline (no production yet)
    if (i < 8) {
      await seedQCForProject(project, stations, skus, creatorId);

      // Generate 30 days of shift entries across random stations
      const dates = lastNDates(30);
      const shiftTypes = ['MORNING', 'AFTERNOON', 'NIGHT'];
      const shiftTimes = { MORNING: { start: 6, end: 14 }, AFTERNOON: { start: 14, end: 22 }, NIGHT: { start: 22, end: 6 } };
      for (const date of dates) {
        for (const stype of shiftTypes) {
          const stns = [
            pick(stations.filter(s => s.code.startsWith('MOULD-'))),
            pick(stations.filter(s => s.code.startsWith('SPRAY-'))),
            pick(stations.filter(s => s.code.startsWith('PAD-'))),
            pick(stations.filter(s => s.code.startsWith('WORK-'))),
            pick(stations.filter(s => s.code.startsWith('PACK-'))),
          ];
          for (const stn of stns) {
            const workersPresent = randInt(8, 20);
            const totalProduced = randInt(400, 1200);
            const qualityPassed = Math.floor(totalProduced * (0.91 + Math.random() * 0.06));
            const qualityRejected = totalProduced - qualityPassed;
            const startTime = new Date(date);
            startTime.setHours(shiftTimes[stype].start, 0, 0, 0);
            const endTime = new Date(date);
            if (stype === 'NIGHT') endTime.setDate(endTime.getDate() + 1);
            endTime.setHours(shiftTimes[stype].end, 0, 0, 0);
            await prisma.shiftEntry.create({
              data: {
                projectId: project.id,
                stationId: stn.id,
                shiftDate: date,
                shiftType: stype,
                shiftStartTime: startTime,
                shiftEndTime: endTime,
                supervisorId: pick(users).id,
                workersPresent,
                workersAbsent: randInt(0, 3),
                totalProduced,
                qualityPassed,
                qualityRejected,
                efficiency: 0.8 + Math.random() * 0.15,
                status: 'approved',
                createdBy: pick(users).id,
                achievements: `Produced ${totalProduced}`,
              },
            });
          }
        }
      }
    }
  }
  return projects;
}

/**
 * Seed molds for projects and link them to molding machines
 */
async function seedMoldsForProjects(projects, stations, users) {
  const moldingStations = stations.filter(s => s.code.startsWith('MOULD-'));
  const creatorId = users[0].id;
  let totalMolds = 0;
  
  for (const project of projects) {
    // Create 3-5 molds per project (realistic variation)
    const moldCount = randInt(3, 5);
    
    for (let m = 1; m <= moldCount; m++) {
      const cavities = pick([1, 2, 4, 8, 16]); // Common cavity counts
      const cycleTimeSec = randInt(30, 120); // 30-120 seconds
      
      const mold = await prisma.moldMaster.create({
        data: {
          projectId: project.id,
          moldCode: `${project.code}-MOLD-${String(m).padStart(2, '0')}`,
          moldName: `${project.name} Mold ${m}`,
          supplierName: pick(['ABC Tooling', 'XYZ Dies', 'PQR Moulds', 'Internal Workshop']),
          cavities,
          cycleTimeSec,
          material: pick(['Steel', 'Aluminum', 'P20 Steel', 'H13 Steel']),
          dimensions: `${randInt(200, 600)}x${randInt(200, 600)}x${randInt(100, 300)} mm`,
          weight: randInt(50, 500),
          cost: randInt(50000, 500000),
          location: pick(['Mold Store A', 'Mold Store B', 'Production Floor']),
          status: 'active',
          notes: `Mold for ${project.name}`,
          createdBy: creatorId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      // Link mold to 1-2 molding machines at random stations
      const assignedMachines = randInt(1, 2);
      const selectedStations = [];
      
      for (let i = 0; i < assignedMachines; i++) {
        const station = pick(moldingStations.filter(s => !selectedStations.includes(s.id)));
        if (!station) continue;
        
        selectedStations.push(station.id);
        
        // Create or update machine at this station
        await prisma.stationMachine.upsert({
          where: {
            stationId_machineNumber: {
              stationId: station.id,
              machineNumber: m
            }
          },
          update: {
            moldMasterId: mold.id,
            cavities,
            cycleTimeSec,
            status: 'operational',
            updatedAt: new Date()
          },
          create: {
            stationId: station.id,
            machineNumber: m,
            machineName: `${station.name} Machine ${m}`,
            machineType: 'molding',
            moldMasterId: mold.id,
            cavities,
            cycleTimeSec,
            status: 'operational',
            serialNumber: `MACH-${station.id}-${m}`,
            manufacturer: pick(['Haitian', 'Engel', 'Arburg', 'Toshiba']),
            modelNumber: `M${randInt(100, 999)}`,
            yearOfManufacture: randInt(2015, 2023),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
      
      totalMolds++;
    }
  }
  
  console.log(`✅ Molds created and linked: ${totalMolds} molds across ${projects.length} projects`);
  return totalMolds;
}

async function main() {
  console.log('🧨 Reset & Seed (E2E) — starting...');
  console.time('total');

  // 1) Nuke data
  console.time('truncate');
  await truncateAll();
  console.timeEnd('truncate');
  console.log('✅ Database truncated (CASCADE)');

  // 2) Base users and settings
  const users = await ensureBaseUsers();
  await ensureCostingSettings();
  console.log(`✅ Users ready: ${users.length}`);

  // 3) Factory structure
  await seedFactoriesFloorsSectionsRooms();
  console.log('✅ Factories, floors, sections, rooms created');

  // 4) Stations
  const stations = await seedStations(460);
  console.log(`✅ Stations created: ${stations.length}`);

  // 5) Workforce
  const workers = await seedProvidersAndWorkers(600);
  console.log(`✅ Workers created: ${workers.length}`);

  // 6) Projects and related data
  console.log('➡️  Seeding projects and related data...');
  let projects = [];
  try {
    projects = await seedProjects(stations, users);
  } catch (err) {
    console.error('❌ Error while seeding projects:', err);
    throw err;
  }
  console.log(`✅ Projects created: ${projects.length} (8 active, 5 pipeline)`);

  // 6.5) Molds for projects
  await seedMoldsForProjects(projects, stations, users);

  // 7) Worker performance data
  await seedWorkerPerformance(workers, projects);

  // Summary counts
  const [factoryCount, floorCount, sectionCount, roomCount, stationCount, workerCount, activeShiftCount, docCount] = await Promise.all([
    prisma.factory.count(),
    prisma.floor.count(),
    prisma.section.count(),
    prisma.room.count(),
    prisma.station.count(),
    prisma.worker.count(),
    prisma.shiftEntry.count(),
    prisma.projectDocument.count(),
  ]);

  console.log('\n📊 Seed Summary');
  console.log(`  • Factories: ${factoryCount}`);
  console.log(`  • Floors: ${floorCount} (3 per factory)`);
  console.log(`  • Sections: ${sectionCount} (12 per factory)`);
  console.log(`  • Rooms: ${roomCount} (1 per section)`);
  console.log(`  • Stations: ${stationCount} (target ~460)`);
  console.log(`  • Workers: ${workerCount} (company + contractor)`);
  console.log(`  • Projects: ${projects.length} (8 active + 5 pipeline)`);
  console.log(`  • Documents: ${docCount} (~5 per project)`);
  console.log(`  • Shift Entries: ${activeShiftCount} (~active projects x 30 days x stations per shift)`);

  console.timeEnd('total');
  console.log('\n🎉 Reset & Seed complete. You can refresh the app and explore.');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
