// Part 2: Project Creation Functions
// This will be merged into the main comprehensive-seed.js

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
        { type: 'ultrasonic', operation: 'Ultrasonic Welding', dependencies: ['assembly'] },
        { type: 'qc', operation: 'Connection Test', dependencies: ['ultrasonic'] },
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
        { type: 'ultrasonic', operation: 'Hinge Welding', dependencies: ['assembly'] },
        { type: 'qc', operation: 'Fit Test', dependencies: ['ultrasonic'] },
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
        { type: 'ultrasonic', operation: 'Welding', dependencies: ['assembly'] },
        { type: 'qc', operation: 'Visual Inspection', dependencies: ['ultrasonic'] },
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

// Export functions (to be merged with main file)
module.exports = {
  createPlanningProjects,
  createProductionProjects,
  generateRandomDate,
  addDays
};
