// scripts/comprehensive-seed.js
// Comprehensive production system seed with complete process chains and dependencies

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION
// ============================================================================

const MACHINES = {
  MOLDING: 10,
  SPRAY_BOOTHS: 60,
  PAD_PRINTING: 10,
  AUTO_SCREWING: 5,
  RIVETING: 3,
  AUTO_SPRAY_BOOTH: 1,
  ASSEMBLY_STATIONS: 200,
  ULTRASONIC: 15,
  PACKING: 25
};

const SHIFTS = [
  { name: 'Day Shift', startTime: '08:00', endTime: '20:00', hours: 12 },
  { name: 'Night Shift', startTime: '20:00', endTime: '08:00', hours: 12 }
];

const PROJECT_STAGES = {
  PLANNING: 12, // Projects in various planning stages
  PRODUCTION: 8  // Projects currently running
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log('🧹 Purging old data...');
  await purgeOldData();

  console.log('🏭 Creating factory infrastructure...');
  const factory = await createFactory();

  console.log('👥 Creating workforce...');
  const users = await createUsers();

  console.log('🏢 Creating rooms and stations...');
  const { rooms, stations } = await createRoomsAndStations(factory.id);

  console.log('🔧 Creating assets (machines and equipment)...');
  const assets = await createAssets(stations);

  console.log('📦 Creating materials...');
  const materials = await createMaterials();

  console.log('📋 Creating 12 planning stage projects...');
  const planningProjects = await createPlanningProjects(factory.id, users, materials);

  console.log('🏃 Creating 8 production projects...');
  const productionProjects = await createProductionProjects(
    factory.id,
    users,
    materials,
    stations,
    machines
  );

  console.log('⏰ Creating shift schedules...');
  await createShiftSchedules(users, productionProjects);

  console.log('📊 Creating quality checkpoints...');
  await createQualityCheckpoints(productionProjects);

  console.log('📝 Creating work orders...');
  await createWorkOrders(productionProjects, stations, users);

  console.log('✅ Seed complete!');
  console.log(`
  Summary:
  - Factory: 1
  - Rooms: ${rooms.length}
  - Stations: ${stations.length}
  - Machines: ${Object.values(machines).flat().length}
  - Materials: ${materials.length}
  - Planning Projects: ${planningProjects.length}
  - Production Projects: ${productionProjects.length}
  - Users: ${users.length}
  `);
}

// ============================================================================
// PURGE OLD DATA
// ============================================================================

async function purgeOldData() {
  // Delete in reverse dependency order, handling models that may not exist
  try {
    // Delete planning system data if exists
    if (prisma.processPlanDetail) await prisma.processPlanDetail.deleteMany();
    if (prisma.planModificationHistory) await prisma.planModificationHistory.deleteMany();
    if (prisma.planConflict) await prisma.planConflict.deleteMany();
    if (prisma.loadBalancingOpportunity) await prisma.loadBalancingOpportunity.deleteMany();
    if (prisma.resourceAvailabilityEvent) await prisma.resourceAvailabilityEvent.deleteMany();
    if (prisma.dailyPlanStationAuto) await prisma.dailyPlanStationAuto.deleteMany();
    if (prisma.dailyPlanGeneration) await prisma.dailyPlanGeneration.deleteMany();
    
    // Delete production data
    await prisma.wIPLedger.deleteMany();
    await prisma.shiftEntry.deleteMany();
    await prisma.qCSubmission.deleteMany();
    if (prisma.productionEntry) await prisma.productionEntry.deleteMany();
    await prisma.workOrder.deleteMany();
    await prisma.processOperation.deleteMany();
    await prisma.processFlow.deleteMany();
    if (prisma.trial) await prisma.trial.deleteMany();
    await prisma.mold.deleteMany();
    await prisma.projectSku.deleteMany();
    await prisma.bOMItem.deleteMany();
    await prisma.stationMachine.deleteMany();
    await prisma.machine.deleteMany();
    await prisma.station.deleteMany();
    await prisma.room.deleteMany();
    await prisma.project.deleteMany();
    await prisma.material.deleteMany();
    await prisma.factory.deleteMany();
    
    console.log('  ✓ All old data purged');
  } catch (error) {
    console.warn('  ⚠ Warning during purge:', error.message);
    console.log('  ✓ Continuing with seed...');
  }
}

// ============================================================================
// CREATE FACTORY
// ============================================================================

async function createFactory() {
  return await prisma.factory.create({
    data: {
      name: 'Pramara Central Manufacturing',
      code: 'PCM-001',
      address: '123 Industrial Park, Manufacturing District',
      contactPerson: 'Factory Manager',
      contactPhone: '+91-9876543210',
      active: true,
      updatedAt: new Date()
    }
  });
}

// ============================================================================
// CREATE USERS
// ============================================================================

async function createUsers() {
  const users = [];
  
  // Admin
  users.push(await prisma.user.create({
    data: {
      email: 'admin@pramara.com',
      name: 'Admin User',
      passwordHash: '$2a$10$XQWz5Q5z5Z5z5Z5z5Z5z5O', // dummy hash
      isActive: true,
      status: 'ACTIVE'
    }
  }));

  // Production Manager
  users.push(await prisma.user.create({
    data: {
      email: 'prod.manager@pramara.com',
      name: 'Production Manager',
      passwordHash: '$2a$10$XQWz5Q5z5Z5z5Z5z5Z5z5O',
      isActive: true,
      status: 'ACTIVE'
    }
  }));

  // QC Manager
  users.push(await prisma.user.create({
    data: {
      email: 'qc.manager@pramara.com',
      name: 'QC Manager',
      passwordHash: '$2a$10$XQWz5Q5z5Z5z5Z5z5Z5z5O',
      isActive: true,
      status: 'ACTIVE'
    }
  }));

  // Shift Supervisors
  for (let i = 1; i <= 4; i++) {
    users.push(await prisma.user.create({
      data: {
        email: `supervisor${i}@pramara.com`,
        name: `Shift Supervisor ${i}`,
        passwordHash: '$2a$10$XQWz5Q5z5Z5z5Z5z5Z5z5O',
        isActive: true,
        status: 'ACTIVE'
      }
    }));
  }

  // Operators
  for (let i = 1; i <= 50; i++) {
    users.push(await prisma.user.create({
      data: {
        email: `operator${i}@pramara.com`,
        name: `Operator ${i}`,
        passwordHash: '$2a$10$XQWz5Q5z5Z5z5Z5z5Z5z5O',
        isActive: true,
        status: 'ACTIVE'
      }
    }));
  }

  return users;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function createStationHelper(roomId, name, code, description, type) {
  return await prisma.station.create({
    data: {
      roomId,
      name,
      code,
      description,
      active: true,
      workstationType: type || 'machine',
      requiresAssets: type !== 'manual',
      updatedAt: new Date()
    }
  });
}

// ============================================================================
// CREATE ROOMS AND STATIONS
// ============================================================================

async function createRoomsAndStations(factoryId) {
  const rooms = [];
  const stations = [];

  // Create Floor
  const floor1 = await prisma.floor.create({
    data: {
      factoryId,
      name: 'Production Floor 1',
      floorNumber: 1,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  const floor2 = await prisma.floor.create({
    data: {
      factoryId,
      name: 'Production Floor 2',
      floorNumber: 2,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  const floor3 = await prisma.floor.create({
    data: {
      factoryId,
      name: 'Packing Floor 3',
      floorNumber: 3,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Create Sections
  const moldingSection = await prisma.section.create({
    data: {
      floorId: floor1.id,
      name: 'Molding Section',
      description: 'Injection molding operations',
      active: true,
      updatedAt: new Date()
    }
  });

  const paintingSection = await prisma.section.create({
    data: {
      floorId: floor1.id,
      name: 'Painting Section',
      description: 'Spray painting and coating operations',
      active: true,
      updatedAt: new Date()
    }
  });

  const printingSection = await prisma.section.create({
    data: {
      floorId: floor1.id,
      name: 'Printing Section',
      description: 'Pad printing operations',
      active: true,
      updatedAt: new Date()
    }
  });

  const assemblyMechSection = await prisma.section.create({
    data: {
      floorId: floor2.id,
      name: 'Mechanical Assembly Section',
      description: 'Ultrasonic welding, screwing, and riveting',
      active: true,
      updatedAt: new Date()
    }
  });

  const assemblySection = await prisma.section.create({
    data: {
      floorId: floor2.id,
      name: 'Manual Assembly Section',
      description: 'Manual assembly operations',
      active: true,
      updatedAt: new Date()
    }
  });

  const packingSection = await prisma.section.create({
    data: {
      floorId: floor3.id,
      name: 'Packing Section',
      description: 'Final packing and dispatch',
      active: true,
      updatedAt: new Date()
    }
  });

  // Molding Room
  const moldingRoom = await prisma.room.create({
    data: {
      sectionId: moldingSection.id,
      name: 'Molding Department',
      roomNumber: 'M-001',
      active: true,
      updatedAt: new Date()
    }
  });
  rooms.push(moldingRoom);

  // Create molding stations
  for (let i = 1; i <= MACHINES.MOLDING; i++) {
    stations.push(await prisma.station.create({
      data: {
        roomId: moldingRoom.id,
        name: `Molding Station ${i}`,
        code: `MS-${String(i).padStart(3, '0')}`,
        description: 'Injection molding workstation',
        active: true,
        workstationType: 'machine',
        requiresAssets: true,
        updatedAt: new Date()
      }
    }));
  }

  // Spray Painting Room
  const sprayRoom = await prisma.room.create({
    data: {
      sectionId: paintingSection.id,
      name: 'Spray Painting Department',
      roomNumber: 'SP-001',
      active: true,
      updatedAt: new Date()
    }
  });
  rooms.push(sprayRoom);

  for (let i = 1; i <= MACHINES.SPRAY_BOOTHS; i++) {
    stations.push(await createStationHelper(
      sprayRoom.id,
      `Spray Booth ${i}`,
      `SB-${String(i).padStart(3, '0')}`,
      'Manual spray painting booth',
      'hybrid'
    ));
  }

  // Auto Spray Booth
  stations.push(await createStationHelper(
    sprayRoom.id,
    'Automatic Spray Booth',
    'ASB-001',
    'Automatic spray painting system',
    'machine'
  ));

  // Pad Printing Room
  const padRoom = await prisma.room.create({
    data: {
      sectionId: printingSection.id,
      name: 'Pad Printing Department',
      roomNumber: 'PP-001',
      active: true,
      updatedAt: new Date()
    }
  });
  rooms.push(padRoom);

  for (let i = 1; i <= MACHINES.PAD_PRINTING; i++) {
    stations.push(await createStationHelper(
      padRoom.id,
      `Pad Printing Station ${i}`,
      `PP-${String(i).padStart(3, '0')}`,
      'Pad printing workstation',
      'machine'
    ));
  }

  // Ultrasonic Welding Room
  const ultrasonicRoom = await prisma.room.create({
    data: {
      sectionId: assemblyMechSection.id,
      name: 'Ultrasonic Welding Department',
      roomNumber: 'UW-001',
      active: true,
      updatedAt: new Date()
    }
  });
  rooms.push(ultrasonicRoom);

  for (let i = 1; i <= MACHINES.ULTRASONIC; i++) {
    stations.push(await createStationHelper(
      ultrasonicRoom.id,
      `Ultrasonic Machine ${i}`,
      `UM-${String(i).padStart(3, '0')}`,
      'Ultrasonic welding station',
      'machine'
    ));
  }

  // Screwing & Riveting Room
  const assembleMechRoom = await prisma.room.create({
    data: {
      sectionId: assemblyMechSection.id,
      name: 'Mechanical Assembly Department',
      roomNumber: 'MA-001',
      active: true,
      updatedAt: new Date()
    }
  });
  rooms.push(assembleMechRoom);

  for (let i = 1; i <= MACHINES.AUTO_SCREWING; i++) {
    stations.push(await createStationHelper(
      assembleMechRoom.id,
      `Auto Screwing Machine ${i}`,
      `AS-${String(i).padStart(3, '0')}`,
      'Automatic screwing station',
      'machine'
    ));
  }

  for (let i = 1; i <= MACHINES.RIVETING; i++) {
    stations.push(await createStationHelper(
      assembleMechRoom.id,
      `Riveting Machine ${i}`,
      `RV-${String(i).padStart(3, '0')}`,
      'Riveting workstation',
      'machine'
    ));
  }

  // Assembly Hall
  const assemblyHall = await prisma.room.create({
    data: {
      sectionId: assemblySection.id,
      name: 'Manual Assembly Hall',
      roomNumber: 'AS-001',
      active: true,
      updatedAt: new Date()
    }
  });
  rooms.push(assemblyHall);

  for (let i = 1; i <= MACHINES.ASSEMBLY_STATIONS; i++) {
    stations.push(await createStationHelper(
      assemblyHall.id,
      `Assembly Workstation ${i}`,
      `AW-${String(i).padStart(3, '0')}`,
      'Manual assembly workstation',
      'manual'
    ));
  }

  // Packing Room
  const packingRoom = await prisma.room.create({
    data: {
      sectionId: packingSection.id,
      name: 'Packing Department',
      roomNumber: 'PK-001',
      active: true,
      updatedAt: new Date()
    }
  });
  rooms.push(packingRoom);

  for (let i = 1; i <= MACHINES.PACKING; i++) {
    stations.push(await createStationHelper(
      packingRoom.id,
      `Packing Station ${i}`,
      `PK-${String(i).padStart(3, '0')}`,
      'Packing workstation',
      'hybrid'
    ));
  }

  return { rooms, stations };
}

// ============================================================================
// CREATE ASSETS (MACHINES & EQUIPMENT)
// ============================================================================

async function createAssets(stations) {
  const assets = {
    molding: [],
    spray: [],
    padPrinting: [],
    ultrasonic: [],
    screwing: [],
    riveting: [],
    packing: []
  };

  // Molding machines  
  const moldingStations = stations.filter(s => s.code && s.code.startsWith('MS-'));
  for (let i = 0; i < moldingStations.length; i++) {
    const asset = await prisma.asset.create({
      data: {
        assetCode: `MOLD-M${String(i + 1).padStart(3, '0')}`,
        assetName: `Injection Molding Machine ${i + 1}`,
        assetType: 'machine',
        category: 'injection_molding',
        manufacturer: ['Haitian', 'Engel', 'Sumitomo'][i % 3],
        model: `IM-${[80, 120, 160, 200, 250][i % 5]}T`,
        specifications: {
          tonnage: [80, 120, 160, 200, 250][i % 5],
          shotSize: 100 + i * 50,
          clampForce: [80, 120, 160, 200, 250][i % 5]
        },
        mobility: 'fixed',
        assignedToStation: moldingStations[i].code,
        status: 'available',
        condition: 'good',
        maintenanceIntervalDays: 30,
        lastMaintenanceDate: addDays(new Date(), -7),
        nextMaintenanceDate: addDays(new Date(), 23)
      }
    });
    assets.molding.push(asset);
  }

  // Spray booths
  const sprayStations = stations.filter(s => s.category === 'painting' && s.code.startsWith('SB'));
  for (let i = 0; i < sprayStations.length; i++) {
    const machine = await prisma.machine.create({
      data: {
        code: `SPRAY-B${String(i + 1).padStart(3, '0')}`,
        name: `Manual Spray Booth ${i + 1}`,
        type: 'spray_booth',
        manufacturer: 'Standard Industrial',
        isActive: true,
        maintenanceInterval: 360,
        lastMaintenance: new Date()
      }
    });
    
    await prisma.stationMachine.create({
      data: {
        stationId: sprayStations[i].id,
        machineId: machine.id,
        isPrimary: true
      }
    });
    
    machines.spray.push(machine);
  }

  // Auto spray booth
  const autoSprayStation = stations.find(s => s.code === 'ASB-001');
  if (autoSprayStation) {
    const machine = await prisma.machine.create({
      data: {
        code: 'SPRAY-AUTO-001',
        name: 'Automatic Spray Booth',
        type: 'auto_spray',
        manufacturer: 'Durr Systems',
        isActive: true,
        maintenanceInterval: 500,
        lastMaintenance: new Date()
      }
    });
    
    await prisma.stationMachine.create({
      data: {
        stationId: autoSprayStation.id,
        machineId: machine.id,
        isPrimary: true
      }
    });
    
    machines.spray.push(machine);
  }

  // Pad printing machines
  const padStations = stations.filter(s => s.category === 'printing');
  for (let i = 0; i < padStations.length; i++) {
    const machine = await prisma.machine.create({
      data: {
        code: `PAD-P${String(i + 1).padStart(3, '0')}`,
        name: `Pad Printing Machine ${i + 1}`,
        type: 'pad_printing',
        manufacturer: ['Teca Print', 'Comec'][i % 2],
        isActive: true,
        maintenanceInterval: 400,
        lastMaintenance: new Date()
      }
    });
    
    await prisma.stationMachine.create({
      data: {
        stationId: padStations[i].id,
        machineId: machine.id,
        isPrimary: true
      }
    });
    
    machines.padPrinting.push(machine);
  }

  // Ultrasonic machines
  const ultrasonicStations = stations.filter(s => s.category === 'welding');
  for (let i = 0; i < ultrasonicStations.length; i++) {
    const machine = await prisma.machine.create({
      data: {
        code: `ULTRA-${String(i + 1).padStart(3, '0')}`,
        name: `Ultrasonic Welding Machine ${i + 1}`,
        type: 'ultrasonic_welding',
        manufacturer: ['Herrmann', 'Branson'][i % 2],
        frequency: [20, 40][i % 2], // kHz
        isActive: true,
        maintenanceInterval: 600,
        lastMaintenance: new Date()
      }
    });
    
    await prisma.stationMachine.create({
      data: {
        stationId: ultrasonicStations[i].id,
        machineId: machine.id,
        isPrimary: true
      }
    });
    
    machines.ultrasonic.push(machine);
  }

  // Auto screwing machines
  const screwingStations = stations.filter(s => s.category === 'screwing');
  for (let i = 0; i < screwingStations.length; i++) {
    const machine = await prisma.machine.create({
      data: {
        code: `SCREW-${String(i + 1).padStart(3, '0')}`,
        name: `Automatic Screwing Machine ${i + 1}`,
        type: 'auto_screwing',
        manufacturer: ['Nitto Kohki', 'Weber'][i % 2],
        isActive: true,
        maintenanceInterval: 500,
        lastMaintenance: new Date()
      }
    });
    
    await prisma.stationMachine.create({
      data: {
        stationId: screwingStations[i].id,
        machineId: machine.id,
        isPrimary: true
      }
    });
    
    machines.screwing.push(machine);
  }

  // Riveting machines
  const rivetingStations = stations.filter(s => s.category === 'riveting');
  for (let i = 0; i < rivetingStations.length; i++) {
    const machine = await prisma.machine.create({
      data: {
        code: `RIVET-${String(i + 1).padStart(3, '0')}`,
        name: `Riveting Machine ${i + 1}`,
        type: 'riveting',
        manufacturer: 'Tucker Auto-Mation',
        isActive: true,
        maintenanceInterval: 450,
        lastMaintenance: new Date()
      }
    });
    
    await prisma.stationMachine.create({
      data: {
        stationId: rivetingStations[i].id,
        machineId: machine.id,
        isPrimary: true
      }
    });
    
    machines.riveting.push(machine);
  }

  // Packing machines
  const packingStations = stations.filter(s => s.category === 'packing');
  for (let i = 0; i < packingStations.length; i++) {
    const machine = await prisma.machine.create({
      data: {
        code: `PACK-${String(i + 1).padStart(3, '0')}`,
        name: `Packing Machine ${i + 1}`,
        type: 'packing',
        manufacturer: 'Standard Pack Systems',
        isActive: true,
        maintenanceInterval: 300,
        lastMaintenance: new Date()
      }
    });
    
    await prisma.stationMachine.create({
      data: {
        stationId: packingStations[i].id,
        machineId: machine.id,
        isPrimary: true
      }
    });
    
    machines.packing.push(machine);
  }

  return machines;
}

// ============================================================================
// CREATE MATERIALS
// ============================================================================

async function createMaterials() {
  const materials = [];

  // Plastic resins
  const resins = [
    { code: 'ABS-001', name: 'ABS Natural', category: 'resin', unit: 'kg', price: 2.5 },
    { code: 'ABS-002', name: 'ABS Black', category: 'resin', unit: 'kg', price: 2.7 },
    { code: 'PP-001', name: 'PP Natural', category: 'resin', unit: 'kg', price: 1.8 },
    { code: 'PP-002', name: 'PP Black', category: 'resin', unit: 'kg', price: 2.0 },
    { code: 'PS-001', name: 'Polystyrene Clear', category: 'resin', unit: 'kg', price: 2.2 },
    { code: 'PC-001', name: 'Polycarbonate Clear', category: 'resin', unit: 'kg', price: 4.5 },
  ];

  for (const r of resins) {
    materials.push(await prisma.material.create({ data: r }));
  }

  // Paints
  const paints = [
    { code: 'PAINT-RED', name: 'Red Spray Paint', category: 'paint', unit: 'liter', price: 15.0 },
    { code: 'PAINT-BLUE', name: 'Blue Spray Paint', category: 'paint', unit: 'liter', price: 15.0 },
    { code: 'PAINT-GREEN', name: 'Green Spray Paint', category: 'paint', unit: 'liter', price: 15.0 },
    { code: 'PAINT-YELLOW', name: 'Yellow Spray Paint', category: 'paint', unit: 'liter', price: 15.0 },
    { code: 'PAINT-WHITE', name: 'White Spray Paint', category: 'paint', unit: 'liter', price: 12.0 },
    { code: 'PAINT-BLACK', name: 'Black Spray Paint', category: 'paint', unit: 'liter', price: 12.0 },
    { code: 'PAINT-METAL', name: 'Metallic Silver Paint', category: 'paint', unit: 'liter', price: 25.0 },
  ];

  for (const p of paints) {
    materials.push(await prisma.material.create({ data: p }));
  }

  // Fasteners
  const fasteners = [
    { code: 'SCREW-M3-10', name: 'M3x10mm Screw', category: 'fastener', unit: 'pcs', price: 0.05 },
    { code: 'SCREW-M3-15', name: 'M3x15mm Screw', category: 'fastener', unit: 'pcs', price: 0.06 },
    { code: 'SCREW-M4-12', name: 'M4x12mm Screw', category: 'fastener', unit: 'pcs', price: 0.08 },
    { code: 'RIVET-3MM', name: '3mm Plastic Rivet', category: 'fastener', unit: 'pcs', price: 0.03 },
    { code: 'RIVET-4MM', name: '4mm Plastic Rivet', category: 'fastener', unit: 'pcs', price: 0.04 },
  ];

  for (const f of fasteners) {
    materials.push(await prisma.material.create({ data: f }));
  }

  // Packaging
  const packaging = [
    { code: 'BOX-SMALL', name: 'Small Cardboard Box', category: 'packaging', unit: 'pcs', price: 0.50 },
    { code: 'BOX-MEDIUM', name: 'Medium Cardboard Box', category: 'packaging', unit: 'pcs', price: 0.80 },
    { code: 'BOX-LARGE', name: 'Large Cardboard Box', category: 'packaging', unit: 'pcs', price: 1.20 },
    { code: 'BUBBLE-WRAP', name: 'Bubble Wrap', category: 'packaging', unit: 'meter', price: 0.30 },
    { code: 'TAPE', name: 'Packing Tape', category: 'packaging', unit: 'roll', price: 2.50 },
  ];

  for (const p of packaging) {
    materials.push(await prisma.material.create({ data: p }));
  }

  return materials;
}

// ============================================================================
// CREATE PLANNING STAGE PROJECTS (12 projects in various planning stages)
// ============================================================================

async function createPlanningProjects(factoryId, users, materials) {
  const projects = [];
  const planningStages = [
    'CONCEPT',
    'FEASIBILITY',
    'DESIGN',
    'PROTOTYPE',
    'TRIAL',
    'PRE_PRODUCTION'
  ];

  const projectTemplates = [
    {
      name: 'Premium Sunglasses Collection 2026',
      code: 'PSG-2026',
      description: 'High-end sunglasses with polarized lenses',
      complexity: 'HIGH',
      estimatedQuantity: 50000,
      components: ['Frame', 'Lens', 'Hinge', 'Screws', 'Nose Pads']
    },
    {
      name: 'Smart Water Bottle Pro',
      code: 'SWB-PRO',
      description: 'IoT-enabled water bottle with temperature display',
      complexity: 'HIGH',
      estimatedQuantity: 30000,
      components: ['Body', 'Cap', 'Display Module', 'Battery', 'Circuit Board']
    },
    {
      name: 'Ergonomic Keyboard Series',
      code: 'EKB-001',
      description: 'Mechanical keyboard with custom switches',
      complexity: 'MEDIUM',
      estimatedQuantity: 20000,
      components: ['Base Plate', 'Keys', 'Switches', 'PCB', 'Cable']
    },
    {
      name: 'LED Desk Lamp Modern',
      code: 'LDL-MOD',
      description: 'Adjustable LED desk lamp with touch controls',
      complexity: 'MEDIUM',
      estimatedQuantity: 40000,
      components: ['Base', 'Arm', 'LED Panel', 'Control Board', 'Power Supply']
    },
    {
      name: 'Portable Speaker Outdoor',
      code: 'PSO-001',
      description: 'Waterproof Bluetooth speaker',
      complexity: 'HIGH',
      estimatedQuantity: 35000,
      components: ['Housing', 'Speaker Unit', 'Battery', 'Circuit Board', 'Buttons']
    },
    {
      name: 'Kitchen Timer Digital',
      code: 'KTD-001',
      description: 'Magnetic digital kitchen timer',
      complexity: 'LOW',
      estimatedQuantity: 60000,
      components: ['Front Case', 'Back Case', 'Display', 'Buttons', 'Magnet']
    },
    {
      name: 'Phone Stand Adjustable',
      code: 'PSA-001',
      description: 'Multi-angle phone stand for desk',
      complexity: 'LOW',
      estimatedQuantity: 80000,
      components: ['Base', 'Arm', 'Holder', 'Hinge', 'Rubber Pads']
    },
    {
      name: 'Travel Mug Insulated',
      code: 'TMI-001',
      description: 'Vacuum insulated travel mug',
      complexity: 'MEDIUM',
      estimatedQuantity: 45000,
      components: ['Inner Body', 'Outer Body', 'Lid', 'Seal', 'Handle']
    },
    {
      name: 'Wall Clock Modern',
      code: 'WCM-001',
      description: 'Silent wall clock with modern design',
      complexity: 'MEDIUM',
      estimatedQuantity: 25000,
      components: ['Front Frame', 'Back Panel', 'Clock Mechanism', 'Hands', 'Numbers']
    },
    {
      name: 'Cable Organizer Set',
      code: 'COS-001',
      description: 'Desk cable management system',
      complexity: 'LOW',
      estimatedQuantity: 100000,
      components: ['Base Clip', 'Side Clip', 'Cable Holder', 'Adhesive Pad']
    },
    {
      name: 'Plant Pot Self-Watering',
      code: 'PPW-001',
      description: 'Self-watering plant pot with indicator',
      complexity: 'MEDIUM',
      estimatedQuantity: 35000,
      components: ['Outer Pot', 'Inner Pot', 'Water Reservoir', 'Wick', 'Indicator']
    },
    {
      name: 'Lunch Box Compartment',
      code: 'LBC-001',
      description: 'Multi-compartment lunch box',
      complexity: 'MEDIUM',
      estimatedQuantity: 55000,
      components: ['Base', 'Lid', 'Dividers', 'Seal', 'Clips']
    }
  ];

  for (let i = 0; i < 12; i++) {
    const template = projectTemplates[i];
    const stage = planningStages[i % planningStages.length];
    
    const project = await prisma.project.create({
      data: {
        factoryId,
        name: template.name,
        code: template.code,
        description: template.description,
        status: 'PLANNING',
        planningStage: stage,
        priority: Math.ceil(Math.random() * 5),
        startDate: addDays(new Date(), 30 + i * 10),
        endDate: addDays(new Date(), 150 + i * 20),
        quantity: template.estimatedQuantity,
        createdBy: users[0].id,
        metadata: {
          complexity: template.complexity,
          components: template.components,
          planningVariation: `Variation ${i + 1}`
        }
      }
    });

    // Create SKUs for each component
    for (let j = 0; j < template.components.length; j++) {
      const component = template.components[j];
      await prisma.projectSku.create({
        data: {
          projectId: project.id,
          name: component,
          code: `${template.code}-C${String(j + 1).padStart(2, '0')}`,
          quantity: template.estimatedQuantity,
          unit: 'pcs',
          metadata: {
            componentType: 'standard',
            stage: 'planning'
          }
        }
      });
    }

    projects.push(project);
  }

  return projects;
}

// ============================================================================
// CREATE PRODUCTION PROJECTS (8 projects currently running)
// ============================================================================

async function createProductionProjects(factoryId, users, materials, stations, machines) {
  const projects = [];

  const productionTemplates = [
    {
      name: 'Classic Sunglasses Model HIT',
      code: 'HIT-SUN-001',
      description: 'Best-selling classic sunglasses model',
      quantity: 100000,
      dailyTarget: 2500,
      skus: [
        { name: 'Front Frame', code: 'FRONT', cycleTime: 45, material: 'ABS-002' },
        { name: 'Temple Left', code: 'TEMP-L', cycleTime: 35, material: 'ABS-002' },
        { name: 'Temple Right', code: 'TEMP-R', cycleTime: 35, material: 'ABS-002' },
        { name: 'Lens Left', code: 'LENS-L', cycleTime: 25, material: 'PC-001' },
        { name: 'Lens Right', code: 'LENS-R', cycleTime: 25, material: 'PC-001' }
      ],
      processFlow: [
        { type: 'molding', operation: 'Injection Molding', dependencies: [] },
        { type: 'painting', operation: 'Spray Painting', dependencies: ['molding'] },
        { type: 'printing', operation: 'Logo Printing', dependencies: ['painting'] },
        { type: 'assembly', operation: 'Manual Assembly', dependencies: ['printing'] },
        { type: 'screwing', operation: 'Hinge Screwing', dependencies: ['assembly'] },
        { type: 'qc', operation: 'Quality Check', dependencies: ['screwing'] },
        { type: 'packing', operation: 'Final Packing', dependencies: ['qc'] }
      ]
    },
    {
      name: 'Wireless Mouse Ergonomic',
      code: 'WME-001',
      description: 'Ergonomic wireless mouse',
      quantity: 75000,
      dailyTarget: 1875,
      skus: [
        { name: 'Top Shell', code: 'TOP', cycleTime: 40, material: 'ABS-001' },
        { name: 'Bottom Shell', code: 'BTM', cycleTime: 40, material: 'ABS-002' },
        { name: 'Scroll Wheel', code: 'WHEEL', cycleTime: 20, material: 'ABS-001' },
        { name: 'Button Left', code: 'BTN-L', cycleTime: 15, material: 'ABS-001' },
        { name: 'Button Right', code: 'BTN-R', cycleTime: 15, material: 'ABS-001' }
      ],
      processFlow: [
        { type: 'molding', operation: 'Injection Molding', dependencies: [] },
        { type: 'painting', operation: 'Spray Painting', dependencies: ['molding'] },
        { type: 'printing', operation: 'Logo Printing', dependencies: ['painting'] },
        { type: 'assembly', operation: 'PCB Installation', dependencies: ['printing'] },
        { type: 'screwing', operation: 'Shell Assembly', dependencies: ['assembly'] },
        { type: 'qc', operation: 'Functional Test', dependencies: ['screwing'] },
        { type: 'packing', operation: 'Retail Packing', dependencies: ['qc'] }
      ]
    },
    {
      name: 'USB Hub 4-Port',
      code: 'USB4-001',
      description: '4-port USB 3.0 hub',
      quantity: 90000,
      dailyTarget: 2250,
      skus: [
        { name: 'Housing Top', code: 'HSG-T', cycleTime: 30, material: 'ABS-001' },
        { name: 'Housing Bottom', code: 'HSG-B', cycleTime: 30, material: 'ABS-001' }
      ],
      processFlow: [
        { type: 'molding', operation: 'Injection Molding', dependencies: [] },
        { type: 'painting', operation: 'Surface Coating', dependencies: ['molding'] },
        { type: 'assembly', operation: 'PCB Assembly', dependencies: ['painting'] },
        { type: 'welding', operation: 'Ultrasonic Welding', dependencies: ['assembly'] },
        { type: 'qc', operation: 'Connection Test', dependencies: ['welding'] },
        { type: 'packing', operation: 'Box Packing', dependencies: ['qc'] }
      ]
    },
    {
      name: 'Pen Holder Rotating',
      code: 'PHR-001',
      description: 'Rotating desk pen holder',
      quantity: 120000,
      dailyTarget: 3000,
      skus: [
        { name: 'Base', code: 'BASE', cycleTime: 50, material: 'PP-001' },
        { name: 'Rotating Top', code: 'TOP', cycleTime: 45, material: 'PP-001' },
        { name: 'Compartments', code: 'COMP', cycleTime: 25, material: 'PP-001' }
      ],
      processFlow: [
        { type: 'molding', operation: 'Injection Molding', dependencies: [] },
        { type: 'painting', operation: 'Spray Painting', dependencies: ['molding'] },
        { type: 'assembly', operation: 'Component Assembly', dependencies: ['painting'] },
        { type: 'riveting', operation: 'Rivet Installation', dependencies: ['assembly'] },
        { type: 'qc', operation: 'Rotation Test', dependencies: ['riveting'] },
        { type: 'packing', operation: 'Shrink Wrap', dependencies: ['qc'] }
      ]
    },
    {
      name: 'Smartphone Stand Foldable',
      code: 'SSF-001',
      description: 'Foldable smartphone stand',
      quantity: 150000,
      dailyTarget: 3750,
      skus: [
        { name: 'Front Plate', code: 'FRONT', cycleTime: 35, material: 'ABS-001' },
        { name: 'Back Support', code: 'BACK', cycleTime: 35, material: 'ABS-001' },
        { name: 'Hinge Pin', code: 'HINGE', cycleTime: 20, material: 'ABS-002' }
      ],
      processFlow: [
        { type: 'molding', operation: 'Injection Molding', dependencies: [] },
        { type: 'painting', operation: 'Auto Spray Painting', dependencies: ['molding'] },
        { type: 'assembly', operation: 'Hinge Assembly', dependencies: ['painting'] },
        { type: 'riveting', operation: 'Pin Riveting', dependencies: ['assembly'] },
        { type: 'qc', operation: 'Fold Test', dependencies: ['riveting'] },
        { type: 'packing', operation: 'Card Packing', dependencies: ['qc'] }
      ]
    },
    {
      name: 'Earphone Case Protective',
      code: 'ECP-001',
      description: 'Protective case for wireless earphones',
      quantity: 80000,
      dailyTarget: 2000,
      skus: [
        { name: 'Case Body', code: 'BODY', cycleTime: 40, material: 'ABS-001' },
        { name: 'Lid', code: 'LID', cycleTime: 35, material: 'ABS-001' }
      ],
      processFlow: [
        { type: 'molding', operation: 'Injection Molding', dependencies: [] },
        { type: 'painting', operation: 'Spray Painting', dependencies: ['molding'] },
        { type: 'printing', operation: 'Logo Pad Printing', dependencies: ['painting'] },
        { type: 'assembly', operation: 'Insert Installation', dependencies: ['printing'] },
        { type: 'welding', operation: 'Hinge Welding', dependencies: ['assembly'] },
        { type: 'qc', operation: 'Fit Test', dependencies: ['welding'] },
        { type: 'packing', operation: 'Blister Pack', dependencies: ['qc'] }
      ]
    },
    {
      name: 'Key Organizer Compact',
      code: 'KOC-001',
      description: 'Compact key organizer',
      quantity: 110000,
      dailyTarget: 2750,
      skus: [
        { name: 'Frame Left', code: 'FR-L', cycleTime: 30, material: 'ABS-002' },
        { name: 'Frame Right', code: 'FR-R', cycleTime: 30, material: 'ABS-002' }
      ],
      processFlow: [
        { type: 'molding', operation: 'Injection Molding', dependencies: [] },
        { type: 'painting', operation: 'Spray Painting', dependencies: ['molding'] },
        { type: 'assembly', operation: 'Hardware Assembly', dependencies: ['painting'] },
        { type: 'screwing', operation: 'Frame Screwing', dependencies: ['assembly'] },
        { type: 'qc', operation: 'Assembly Check', dependencies: ['screwing'] },
        { type: 'packing', operation: 'Box Packing', dependencies: ['qc'] }
      ]
    },
    {
      name: 'Desk Organizer Multi-Section',
      code: 'DOM-001',
      description: 'Multi-section desk organizer',
      quantity: 95000,
      dailyTarget: 2375,
      skus: [
        { name: 'Main Tray', code: 'TRAY', cycleTime: 60, material: 'PP-001' },
        { name: 'Small Divider', code: 'DIV-S', cycleTime: 20, material: 'PP-001' },
        { name: 'Large Divider', code: 'DIV-L', cycleTime: 25, material: 'PP-001' }
      ],
      processFlow: [
        { type: 'molding', operation: 'Injection Molding', dependencies: [] },
        { type: 'painting', operation: 'Spray Painting', dependencies: ['molding'] },
        { type: 'assembly', operation: 'Divider Assembly', dependencies: ['painting'] },
        { type: 'welding', operation: 'Welding', dependencies: ['assembly'] },
        { type: 'qc', operation: 'Visual Inspection', dependencies: ['welding'] },
        { type: 'packing', operation: 'Carton Packing', dependencies: ['qc'] }
      ]
    }
  ];

  for (let i = 0; i < productionTemplates.length; i++) {
    const template = productionTemplates[i];
    
    const project = await prisma.project.create({
      data: {
        factoryId,
        name: template.name,
        code: template.code,
        description: template.description,
        status: 'IN_PROGRESS',
        priority: Math.ceil((i + 1) / 2),
        startDate: addDays(new Date(), -30 - i * 5),
        endDate: addDays(new Date(), 60 + i * 10),
        quantity: template.quantity,
        completedQuantity: Math.floor(template.quantity * (0.2 + Math.random() * 0.3)),
        createdBy: users[0].id,
        metadata: {
          dailyTarget: template.dailyTarget,
          shifts: 2,
          productionStatus: 'active'
        }
      }
    });

    // Create SKUs
    const skus = [];
    for (const skuData of template.skus) {
      const sku = await prisma.projectSku.create({
        data: {
          projectId: project.id,
          name: skuData.name,
          code: `${template.code}-${skuData.code}`,
          quantity: template.quantity,
          unit: 'pcs',
          metadata: {
            cycleTime: skuData.cycleTime,
            material: skuData.material
          }
        }
      });
      skus.push(sku);
    }

    // Create Molds
    const molds = [];
    for (let m = 0; m < template.skus.length; m++) {
      const skuData = template.skus[m];
      const mold = await prisma.mold.create({
        data: {
          projectId: project.id,
          moldNumber: `${template.code}-M${String(m + 1).padStart(2, '0')}`,
          cavities: [2, 4, 8][m % 3],
          cycleTime: skuData.cycleTime,
          status: 'ACTIVE',
          material: skuData.material,
          lastMaintenance: addDays(new Date(), -7),
          metadata: {
            component: skuData.name,
            weight: 50 + m * 20
          }
        }
      });
      molds.push(mold);
    }

    // Create Process Flow
    const processFlow = await prisma.processFlow.create({
      data: {
        projectId: project.id,
        name: `${template.name} - Production Flow`,
        description: 'Complete production process flow',
        isActive: true,
        version: 1,
        metadata: {
          totalSteps: template.processFlow.length,
          estimatedDuration: template.processFlow.length * 45
        }
      }
    });

    // Create Process Operations with proper dependencies
    const operations = [];
    for (let op = 0; op < template.processFlow.length; op++) {
      const flowStep = template.processFlow[op];
      
      // Get appropriate stations for this operation type
      const availableStations = stations.filter(s => s.category === flowStep.type);
      const assignedStation = availableStations[Math.floor(Math.random() * Math.min(5, availableStations.length))];

      const operation = await prisma.processOperation.create({
        data: {
          processFlowId: processFlow.id,
          name: flowStep.operation,
          sequenceOrder: op + 1,
          operationType: flowStep.type.toUpperCase(),
          stationId: assignedStation?.id,
          duration: 30 + op * 15,
          isQualityCheck: flowStep.type === 'qc',
          metadata: {
            cycleTime: 30 + Math.random() * 60,
            setupTime: 15 + Math.random() * 30,
            operatorsRequired: flowStep.type === 'assembly' ? 2 : 1,
            qualityCheckpoints: flowStep.type === 'qc' ? ['visual', 'dimensional', 'functional'] : []
          }
        }
      });
      operations.push(operation);

      // Create BOM items for this operation
      if (flowStep.type === 'molding') {
        const resinMaterial = materials.find(m => m.code === template.skus[0].material);
        if (resinMaterial) {
          await prisma.bOMItem.create({
            data: {
              projectId: project.id,
              materialId: resinMaterial.id,
              quantityPerUnit: 0.05 + Math.random() * 0.1,
              unit: 'kg',
              metadata: { operation: flowStep.operation }
            }
          });
        }
      } else if (flowStep.type === 'painting') {
        const paint = materials.find(m => m.category === 'paint');
        if (paint) {
          await prisma.bOMItem.create({
            data: {
              projectId: project.id,
              materialId: paint.id,
              quantityPerUnit: 0.01 + Math.random() * 0.02,
              unit: 'liter',
              metadata: { operation: flowStep.operation }
            }
          });
        }
      } else if (flowStep.type === 'screwing') {
        const screw = materials.find(m => m.code.startsWith('SCREW'));
        if (screw) {
          await prisma.bOMItem.create({
            data: {
              projectId: project.id,
              materialId: screw.id,
              quantityPerUnit: 2 + Math.floor(Math.random() * 4),
              unit: 'pcs',
              metadata: { operation: flowStep.operation }
            }
          });
        }
      } else if (flowStep.type === 'packing') {
        const box = materials.find(m => m.code === 'BOX-SMALL');
        if (box) {
          await prisma.bOMItem.create({
            data: {
              projectId: project.id,
              materialId: box.id,
              quantityPerUnit: 1,
              unit: 'pcs',
              metadata: { operation: flowStep.operation }
            }
          });
        }
      }
    }

    projects.push({ ...project, processFlow, operations, skus, molds });
  }

  return projects;
}

// ============================================================================
// CREATE SHIFT SCHEDULES (2 shifts x 12 hours each)
// ============================================================================

async function createShiftSchedules(users, productionProjects) {
  const shifts = [];
  const supervisors = users.filter(u => u.name.includes('Supervisor'));
  const operators = users.filter(u => u.name.includes('Operator'));

  for (let day = -10; day <= 30; day++) {
    const date = addDays(new Date(), day);
    
    // Day Shift (08:00 - 20:00)
    const dayShift = await prisma.shiftEntry.create({
      data: {
        date: date,
        shiftType: 'DAY',
        startTime: new Date(date.setHours(8, 0, 0)),
        endTime: new Date(date.setHours(20, 0, 0)),
        supervisorId: supervisors[day % supervisors.length].id,
        metadata: {
          shiftName: 'Day Shift',
          hours: 12,
          breakTimes: ['10:30-10:45', '13:00-13:30', '16:30-16:45'],
          activeProjects: productionProjects.slice(0, 4).map(p => p.code)
        }
      }
    });
    shifts.push(dayShift);

    // Night Shift (20:00 - 08:00)
    const nightShift = await prisma.shiftEntry.create({
      data: {
        date: date,
        shiftType: 'NIGHT',
        startTime: new Date(date.setHours(20, 0, 0)),
        endTime: new Date(addDays(date, 1).setHours(8, 0, 0)),
        supervisorId: supervisors[(day + 1) % supervisors.length].id,
        metadata: {
          shiftName: 'Night Shift',
          hours: 12,
          breakTimes: ['22:30-22:45', '01:00-01:30', '04:30-04:45'],
          activeProjects: productionProjects.slice(4, 8).map(p => p.code)
        }
      }
    });
    shifts.push(nightShift);
  }

  // Create shift transfer logs
  for (let i = 0; i < Math.min(shifts.length - 1, 40); i++) {
    const currentShift = shifts[i];
    const nextShift = shifts[i + 1];
    
    await prisma.shiftEntry.update({
      where: { id: currentShift.id },
      data: {
        metadata: {
          ...currentShift.metadata,
          transferLog: {
            transferredTo: nextShift.id,
            transferTime: currentShift.endTime,
            handoverNotes: `All machines running. ${Math.floor(Math.random() * 3)} minor issues reported.`,
            pendingTasks: Math.floor(Math.random() * 5),
            completedTasks: Math.floor(10 + Math.random() * 15)
          }
        }
      }
    });
  }

  console.log(`  ✓ Created ${shifts.length} shift entries with transfer logs`);
  return shifts;
}

// ============================================================================
// CREATE QUALITY CHECKPOINTS
// ============================================================================

async function createQualityCheckpoints(productionProjects) {
  const checkpoints = [];

  for (const project of productionProjects) {
    if (!project.operations) continue;

    for (const operation of project.operations) {
      // In-line QC checkpoints for each operation
      const inlineChecks = [
        {
          name: `${operation.name} - Visual Inspection`,
          type: 'VISUAL',
          frequency: 'EVERY_BATCH',
          parameters: ['Surface finish', 'Color consistency', 'No scratches', 'No flash'],
          acceptanceCriteria: 'Zero defects visible to naked eye',
          sampleSize: 5
        },
        {
          name: `${operation.name} - Dimensional Check`,
          type: 'DIMENSIONAL',
          frequency: 'HOURLY',
          parameters: ['Length ±0.1mm', 'Width ±0.1mm', 'Thickness ±0.05mm', 'Flatness'],
          acceptanceCriteria: 'All measurements within tolerance',
          sampleSize: 3
        }
      ];

      // Add operation-specific checks
      if (operation.operationType === 'MOLDING') {
        inlineChecks.push({
          name: `${operation.name} - Cavity Check`,
          type: 'PROCESS',
          frequency: 'START_OF_SHIFT',
          parameters: ['All cavities filling', 'Proper ejection', 'Gate appearance', 'Cycle time stable'],
          acceptanceCriteria: 'All cavities producing good parts',
          sampleSize: 10
        });
      } else if (operation.operationType === 'PAINTING') {
        inlineChecks.push({
          name: `${operation.name} - Paint Quality`,
          type: 'VISUAL',
          frequency: 'EVERY_30MIN',
          parameters: ['Even coating', 'No runs', 'No orange peel', 'Color match'],
          acceptanceCriteria: 'Paint finish meets standard',
          sampleSize: 5
        });
      } else if (operation.operationType === 'WELDING') {
        inlineChecks.push({
          name: `${operation.name} - Weld Strength`,
          type: 'FUNCTIONAL',
          frequency: 'EVERY_BATCH',
          parameters: ['Weld integrity', 'No gaps', 'Pull test', 'Visual seam check'],
          acceptanceCriteria: 'Weld strength > 50N',
          sampleSize: 3
        });
      } else if (operation.operationType === 'SCREWING') {
        inlineChecks.push({
          name: `${operation.name} - Torque Check`,
          type: 'FUNCTIONAL',
          frequency: 'HOURLY',
          parameters: ['Torque setting', 'Thread engagement', 'No cross-threading', 'Screw depth'],
          acceptanceCriteria: 'Torque within 10-15 N⋅cm',
          sampleSize: 5
        });
      } else if (operation.operationType === 'ASSEMBLY') {
        inlineChecks.push({
          name: `${operation.name} - Assembly Verification`,
          type: 'FUNCTIONAL',
          frequency: 'EVERY_BATCH',
          parameters: ['All parts present', 'Correct orientation', 'Proper fit', 'Function test'],
          acceptanceCriteria: 'Assembly complete and functional',
          sampleSize: 5
        });
      }

      // Create checkpoint records
      for (const check of inlineChecks) {
        const checkpoint = await prisma.qCSubmission.create({
          data: {
            projectId: project.id,
            operationId: operation.id,
            checkpointName: check.name,
            checkpointType: check.type,
            status: 'PENDING',
            metadata: {
              frequency: check.frequency,
              parameters: check.parameters,
              acceptanceCriteria: check.acceptanceCriteria,
              sampleSize: check.sampleSize,
              operationType: operation.operationType
            }
          }
        });
        checkpoints.push(checkpoint);
      }
    }

    // Final QC checkpoint at the end
    const finalQC = await prisma.qCSubmission.create({
      data: {
        projectId: project.id,
        checkpointName: `${project.name} - Final Quality Inspection`,
        checkpointType: 'FINAL',
        status: 'PENDING',
        metadata: {
          frequency: 'EVERY_UNIT',
          parameters: [
            'Complete assembly',
            'All functions working',
            'Packaging integrity',
            'Documentation included',
            'Label correct'
          ],
          acceptanceCriteria: '100% pass rate',
          sampleSize: 100,
          destructiveTesting: false
        }
      }
    });
    checkpoints.push(finalQC);
  }

  console.log(`  ✓ Created ${checkpoints.length} quality checkpoints`);
  return checkpoints;
}

// ============================================================================
// CREATE WORK ORDERS WITH DETAILED DOCUMENTATION
// ============================================================================

async function createWorkOrders(productionProjects, stations, users) {
  const workOrders = [];
  const operators = users.filter(u => u.name.includes('Operator'));
  let woCount = 0;

  for (const project of productionProjects) {
    if (!project.operations) continue;

    for (let day = -5; day <= 10; day++) {
      const date = addDays(new Date(), day);
      
      for (const operation of project.operations) {
        const assignedStation = operation.stationId 
          ? stations.find(s => s.id === operation.stationId)
          : stations.filter(s => s.category === operation.operationType.toLowerCase())[0];

        if (!assignedStation) continue;

        // Calculate quantities
        const dailyTarget = Math.floor(project.metadata.dailyTarget / project.operations.length);
        const actualProduced = day < 0 ? Math.floor(dailyTarget * (0.85 + Math.random() * 0.2)) : 0;
        const rejectedQty = day < 0 ? Math.floor(actualProduced * 0.02) : 0;

        // Day shift work order
        const dayWO = await createDetailedWorkOrder(
          project, operation, assignedStation, operators, date, 'DAY',
          dailyTarget / 2, actualProduced / 2, rejectedQty / 2, day
        );
        workOrders.push(dayWO);
        woCount++;

        // Night shift work order
        const nightWO = await createDetailedWorkOrder(
          project, operation, assignedStation, operators, date, 'NIGHT',
          dailyTarget / 2, actualProduced / 2, rejectedQty / 2, day
        );
        workOrders.push(nightWO);
        woCount++;

        // Create WIP Ledger entries for completed work orders
        if (day < 0) {
          await prisma.wIPLedger.create({
            data: {
              projectId: project.id,
              operationId: operation.id,
              date: date,
              shiftType: 'DAY',
              openingBalance: Math.floor(dailyTarget * 0.1),
              received: Math.floor(actualProduced / 2),
              consumed: Math.floor(actualProduced / 2 * 0.98),
              rejected: Math.floor(rejectedQty / 2),
              closingBalance: Math.floor(dailyTarget * 0.12),
              metadata: {
                workOrderNumber: dayWO.workOrderNumber,
                stationCode: assignedStation.code
              }
            }
          });

          await prisma.wIPLedger.create({
            data: {
              projectId: project.id,
              operationId: operation.id,
              date: date,
              shiftType: 'NIGHT',
              openingBalance: Math.floor(dailyTarget * 0.12),
              received: Math.floor(actualProduced / 2),
              consumed: Math.floor(actualProduced / 2 * 0.98),
              rejected: Math.floor(rejectedQty / 2),
              closingBalance: Math.floor(dailyTarget * 0.14),
              metadata: {
                workOrderNumber: nightWO.workOrderNumber,
                stationCode: assignedStation.code
              }
            }
          });
        }
      }
    }
  }

  console.log(`  ✓ Created ${woCount} work orders with WIP ledger entries`);
  return workOrders;
}

async function createDetailedWorkOrder(
  project, operation, station, operators, date, shiftType,
  targetQty, completedQty, rejectedQty, dayOffset
) {
  const isCompleted = dayOffset < 0;
  const shiftHours = shiftType === 'DAY' ? { start: '08:00', end: '20:00' } : { start: '20:00', end: '08:00' };
  
  return await prisma.workOrder.create({
    data: {
      projectId: project.id,
      operationId: operation.id,
      stationId: station.id,
      assignedTo: operators[Math.floor(Math.random() * operators.length)].id,
      workOrderNumber: `WO-${project.code}-${operation.sequenceOrder}-D${dayOffset}-${shiftType}`,
      scheduledDate: date,
      shiftType: shiftType,
      status: isCompleted ? 'COMPLETED' : 'PENDING',
      priority: project.priority,
      targetQuantity: targetQty,
      completedQuantity: isCompleted ? Math.floor(completedQty) : 0,
      rejectedQuantity: isCompleted ? Math.floor(rejectedQty) : 0,
      metadata: {
        operationName: operation.name,
        sequenceOrder: operation.sequenceOrder,
        cycleTime: operation.metadata.cycleTime,
        setupTime: operation.metadata.setupTime,
        operatorsRequired: operation.metadata.operatorsRequired,
        
        productionGuidelines: {
          setup: [
            'Verify machine settings match work order',
            'Check material availability',
            'Inspect tooling condition',
            'Run trial pieces and get approval'
          ],
          operation: [
            'Monitor cycle time continuously',
            'Perform in-line QC checks per schedule',
            'Record all rejections with reason codes',
            'Maintain 5S at workstation'
          ],
          qualityPoints: [
            'Check first piece from each batch',
            'Monitor dimensional accuracy',
            'Report any variation immediately',
            'Tag and segregate rejected parts'
          ],
          safety: [
            'Wear required PPE',
            'Follow machine safety protocols',
            'Keep emergency stops accessible',
            'Report any unsafe conditions'
          ]
        },

        materialMovement: {
          inputMaterial: {
            location: operation.sequenceOrder === 1 ? 'Raw Material Store' : `WIP-${operation.sequenceOrder - 1}`,
            requiredQuantity: targetQty,
            pickupTime: shiftType === 'DAY' ? '07:45' : '19:45',
            transportMethod: 'Material Cart',
            verification: 'Scan barcode and verify quantity'
          },
          outputMaterial: {
            location: `WIP-${operation.sequenceOrder + 1}`,
            expectedQuantity: Math.floor(targetQty * 0.95),
            deliveryTime: shiftType === 'DAY' ? '19:45' : '07:45',
            transportMethod: 'Pallet',
            documentation: 'Complete handover form'
          },
          rejectedParts: {
            location: 'Rejection Store',
            segregation: 'By defect type',
            documentation: 'Rejection tag with reason code'
          }
        },

        inlineQCSchedule: shiftType === 'DAY' 
          ? [
              { time: '08:30', type: 'First piece inspection', duration: 10 },
              { time: '10:00', type: 'Dimensional check', duration: 5 },
              { time: '12:00', type: 'Visual inspection', duration: 5 },
              { time: '14:00', type: 'Dimensional check', duration: 5 },
              { time: '16:00', type: 'Visual inspection', duration: 5 },
              { time: '18:00', type: 'End of shift verification', duration: 10 }
            ]
          : [
              { time: '20:30', type: 'First piece after handover', duration: 10 },
              { time: '22:00', type: 'Dimensional check', duration: 5 },
              { time: '00:00', type: 'Visual inspection', duration: 5 },
              { time: '02:00', type: 'Dimensional check', duration: 5 },
              { time: '04:00', type: 'Visual inspection', duration: 5 },
              { time: '07:00', type: 'End of shift verification', duration: 10 }
            ],

        stationWorkOrder: {
          stationCode: station.code,
          stationName: station.name,
          setupChecklistVerified: isCompleted,
          machineCondition: isCompleted ? 'Good' : 'Not checked',
          toolingCondition: isCompleted ? 'Good' : 'Not checked',
          materialVerified: isCompleted,
          firstPieceApproved: isCompleted,
          firstPieceApprovalBy: isCompleted ? 'QC Inspector' : null,
          firstPieceApprovalTime: isCompleted ? (shiftType === 'DAY' ? '08:25' : '20:25') : null
        },

        shiftTransfer: isCompleted ? {
          transferredTo: shiftType === 'DAY' ? 'Night Shift' : 'Day Shift',
          transferTime: shiftType === 'DAY' ? '20:00' : '08:00',
          machineStatus: 'Running',
          pendingQuantity: targetQty - Math.floor(completedQty),
          issuesReported: Math.random() > 0.8 ? ['Minor color variation in batch'] : [],
          actionRequired: Math.random() > 0.8 ? ['Monitor next batch closely'] : [],
          materialRemaining: Math.floor(targetQty * 0.1),
          notes: 'All normal, continue production'
        } : null,

        performance: isCompleted ? {
          efficiency: Math.floor(85 + Math.random() * 12),
          quality: Math.floor(96 + Math.random() * 3),
          downtime: Math.floor(Math.random() * 30),
          downtimeReasons: Math.random() > 0.7 ? ['Material shortage - 15min'] : [],
          cycleTimeVariance: Math.floor(-5 + Math.random() * 10),
          operatorEfficiency: Math.floor(88 + Math.random() * 10)
        } : null
      }
    }
  });
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
