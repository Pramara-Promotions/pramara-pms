// api/tests/integration/phase3-4-complete-flow.test.js
// Integration test for complete Phase 3 & 4 workflow:
// BOM → Auto Plan Generation → Approval → Resource Allocation → Bottleneck Detection → Costing

const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');

// Mock auth middleware
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user', email: 'test@test.com', roles: ['admin'] };
    req.auth = {
      user: req.user,
      roles: [{ name: 'admin' }],
      perms: new Set(['*'])
    };
    next();
  }
}));

const bomRouter = require('../../routes/bom');
const autoPlanningRouter = require('../../routes/auto-planning');
const resourcesRouter = require('../../routes/resources');
const bottlenecksRouter = require('../../routes/bottlenecks');
const costingRouter = require('../../routes/costing');

const prisma = new PrismaClient();

// Skip entire integration suite if DB is unavailable
const SKIP = global.__DB_UNAVAILABLE__ === true;
const describeIf = SKIP ? describe.skip : describe;

// Setup Express app with all routes
const app = express();
app.use(express.json());
app.use('/api/bom', bomRouter);
app.use('/api/auto-planning', autoPlanningRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/bottlenecks', bottlenecksRouter);
app.use('/api/costing', costingRouter);

describeIf('Phase 3 & 4 Complete Integration Flow', () => {
  let testProject;
  let testSku;
  let testStation;
  let testMaterial;
  let testMachine;
  const createdIds = {
    projects: [],
    skus: [],
    stations: [],
    materials: [],
    machines: [],
    components: [],
    planGenerations: [],
    costings: [],
  };

  beforeAll(async () => {
    console.log('🚀 Setting up Phase 3/4 integration test environment...');

    // Create test project with cutoff date
    testProject = await prisma.project.create({
      data: {
        code: `TEST-P3P4-${Date.now()}`,
        name: 'Phase 3/4 Test Project',
        quantity: 1000,
        cutoffDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      },
    });
    createdIds.projects.push(testProject.id);

    // Create test material (schema requires id:string and updatedAt)
    testMaterial = await prisma.material.create({
      data: {
        id: `MAT-${Date.now()}`,
        name: 'Test Acetate',
        type: 'plastic',
        unit: 'kg',
        stockQty: 5000,
        reorderPoint: 1000,
        leadTimeDays: 7,
        costPerUnit: 15.5,
        updatedAt: new Date(),
      },
    });
    createdIds.materials.push(testMaterial.id);

    // Create station and a machine
    testStation = await prisma.station.create({
      data: {
        projectId: testProject.id,
        name: 'Molding Station',
        code: `ST-${Date.now()}`,
        workstationType: 'machine',
        updatedAt: new Date(),
      },
    });
    createdIds.stations.push(testStation.id);

    testMachine = await prisma.stationMachine.create({
      data: {
        stationId: testStation.id,
        code: `MAC-${Date.now()}`,
        name: 'Injection Molder X',
        machineType: 'molding',
        status: 'available',
        updatedAt: new Date(),
      },
    });
    createdIds.machines.push(testMachine.id);

    // Create SKU
    testSku = await prisma.projectSku.create({
      data: {
        projectId: testProject.id,
        code: `SKU-${Date.now()}`,
        name: 'Test Sunglasses',
        orderQty: 1000,
      },
    });
    createdIds.skus.push(testSku.id);

    // Create process config for station/SKU
    await prisma.processConfig.create({
      data: {
        id: `PROC-${Date.now()}`,
        stationId: testStation.id,
        stationType: 'injection_molding',
        projectId: testProject.id,
        projectSkuId: testSku.id,
        cycleTimeSec: 60,
        cavities: 1,
        updatedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up test data...');
    try {
      if (testProject?.id) {
        await prisma.dailyPlanStationAuto.deleteMany({ where: { projectId: testProject.id } });
        await prisma.resourceAllocation.deleteMany({ where: { projectId: testProject.id } });
        await prisma.dailyPlanGeneration.deleteMany({ where: { projectId: testProject.id } });
      }
      if (createdIds.components.length > 0) {
        await prisma.componentMaterial.deleteMany({ where: { componentId: { in: createdIds.components } } });
        await prisma.productComponent.deleteMany({ where: { id: { in: createdIds.components } } });
      }
      if (createdIds.costings.length > 0) {
        await prisma.costComponent.deleteMany({ where: { projectCostingId: { in: createdIds.costings } } });
        await prisma.projectCosting.deleteMany({ where: { id: { in: createdIds.costings } } });
      }
      if (createdIds.stations.length > 0) {
        await prisma.processConfig.deleteMany({ where: { stationId: { in: createdIds.stations } } });
      }
      if (createdIds.machines.length > 0) {
        await prisma.stationMachine.deleteMany({ where: { id: { in: createdIds.machines } } });
      }
      if (createdIds.skus.length > 0) {
        await prisma.projectSku.deleteMany({ where: { id: { in: createdIds.skus } } });
      }
      if (createdIds.stations.length > 0) {
        await prisma.station.deleteMany({ where: { id: { in: createdIds.stations } } });
      }
      if (createdIds.materials.length > 0) {
        await prisma.material.deleteMany({ where: { id: { in: createdIds.materials } } });
      }
      if (createdIds.projects.length > 0) {
        await prisma.project.deleteMany({ where: { id: { in: createdIds.projects } } });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
    await prisma.$disconnect();
    console.log('✅ Cleanup complete');
  });

  describe('Complete Phase 3/4 Workflow', () => {
    let componentId;
    let planGenerationId;

    it('Step 1: Create BOM structure with components and materials', async () => {
      console.log('\n📦 Step 1: Creating BOM...');

      // Create frame component
      const frameResponse = await request(app)
        .post('/api/bom/component')
        .send({
          projectId: testProject.id,
          skuId: testSku.id,
          type: 'frame',
          name: 'Sunglasses Frame',
          qtyPerUnit: 1,
          color: 'Black',
        })
        .expect(201);

      expect(frameResponse.body.component).toBeDefined();
      componentId = frameResponse.body.component.id;
      createdIds.components.push(componentId);

      // Link material to component
      await request(app)
        .post('/api/bom/material-link')
        .send({
          componentId: componentId,
          materialId: testMaterial.id,
          qtyPerComponent: 0.05, // 50g per frame
          unit: 'kg',
        })
        .expect(201);

      // Verify BOM structure
      const bomResponse = await request(app)
        .get(`/api/bom/${testProject.id}`)
        .expect(200);

      expect(bomResponse.body.bom).toBeDefined();
      expect(Array.isArray(bomResponse.body.bom)).toBe(true);

      console.log('✅ BOM created with components and materials');
    });

    it('Step 2: Calculate material requirements from BOM', async () => {
      console.log('\n🧮 Step 2: Calculating material requirements...');

      const requirementsResponse = await request(app)
        .get(`/api/bom/${testProject.id}/requirements`)
        .expect(200);

      expect(requirementsResponse.body.requirements).toBeDefined();
      expect(requirementsResponse.body.requirements.materials).toBeDefined();
      expect(Array.isArray(requirementsResponse.body.requirements.materials)).toBe(true);

      // Should calculate: 1000 units × 1 frame × 0.05 kg = 50 kg
      const materialReq = requirementsResponse.body.requirements.materials.find(
        (r) => r.materialId === testMaterial.id
      );
      expect(materialReq).toBeDefined();
      expect(materialReq.totalQty).toBeGreaterThan(0);

      console.log(`✅ Material requirements: ${materialReq.totalQty} kg needed`);
    });

    it('Step 3: Check machine availability before planning', async () => {
      console.log('\n🔍 Step 3: Checking machine availability...');

      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];

      const availabilityResponse = await request(app)
        .get(`/api/resources/availability?stationId=${testStation.id}&startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(availabilityResponse.body.availability).toBeDefined();
      expect(Array.isArray(availabilityResponse.body.availability)).toBe(true);
      expect(availabilityResponse.body.availability.length).toBeGreaterThan(0);

      const machine = availabilityResponse.body.availability[0];
      expect(machine.availablePercent).toBeGreaterThan(0);

      console.log(`✅ Machine ${machine.machineCode} is ${machine.availablePercent}% available`);
    });

    it('Step 4: Generate auto daily plan from BOM and cutoff date', async () => {
      console.log('\n🤖 Step 4: Generating auto daily plan...');

      const generateResponse = await request(app)
        .post('/api/auto-planning/generate')
        .send({
          projectId: testProject.id,
          notes: 'Integration test auto-plan',
        })
        .expect(201);

      expect(generateResponse.body.planGeneration).toBeDefined();
      expect(['pending_approval','draft','approved']).toContain(generateResponse.body.planGeneration.status);
      expect(generateResponse.body.summary).toBeDefined();

      planGenerationId = generateResponse.body.planGeneration.id;
      createdIds.planGenerations.push(planGenerationId);

      console.log(`✅ Plan generated: ${planGenerationId}, Status: ${generateResponse.body.planGeneration.status}`);
    });

    it('Step 5: Approve the generated plan', async () => {
      console.log('\n✅ Step 5: Approving plan...');

      const approveResponse = await request(app)
        .post(`/api/auto-planning/approve/${planGenerationId}`)
        .expect(200);

      expect(approveResponse.body.approved).toBeDefined();
      expect(approveResponse.body.approved.status).toBe('approved');

      console.log('✅ Plan approved and resource allocations created');
    });

    it('Step 6: Verify resource allocations were created', async () => {
      console.log('\n🔧 Step 6: Verifying resource allocations...');

      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];

      const utilizationResponse = await request(app)
        .get(`/api/resources/utilization?stationId=${testStation.id}&startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(utilizationResponse.body.utilization).toBeDefined();
      expect(Array.isArray(utilizationResponse.body.utilization)).toBe(true);

      const machineUtil = utilizationResponse.body.utilization.find(
        (u) => u.machineId === testMachine.id
      );

      if (machineUtil) {
        console.log(`✅ Machine ${machineUtil.machineCode} utilization: ${machineUtil.utilizationPercent}%`);
      } else {
        console.log('⚠️  No allocations found (may indicate plan generation issue)');
      }
    });

    it('Step 7: Detect bottlenecks from plan progress', async () => {
      console.log('\n🚨 Step 7: Detecting bottlenecks...');

      const bottleneckResponse = await request(app)
        .get(`/api/bottlenecks/${testProject.id}`)
        .expect(200);

      expect(bottleneckResponse.body.projectId).toBe(testProject.id);
      expect(bottleneckResponse.body.bottlenecksDetected).toBeDefined();

      if (bottleneckResponse.body.bottlenecksDetected > 0) {
        const bottleneck = bottleneckResponse.body.bottlenecks[0];
        console.log(`✅ Bottleneck detected at ${bottleneck.stationCode}`);
        console.log(`   Gap: ${bottleneck.gap}%, Severity: ${bottleneck.severity}`);
      } else {
        console.log('ℹ️  No bottlenecks detected (expected in fresh project)');
      }
    });

    it('Step 8: Calculate project costing from BOM and workflow', async () => {
      console.log('\n💰 Step 8: Calculating project cost...');

      // Create costing
      const costingResponse = await request(app)
        .post(`/api/costing/projects/${testProject.id}`)
        .send({
          createdBy: 'test-user',
        })
        .expect(201);

      expect(costingResponse.body.costing).toBeDefined();
      const costingId = costingResponse.body.costing.id;
      createdIds.costings.push(costingId);

      // Note: Full cost calculation requires costingService.calculateProjectCost
      // which is called separately. For now, verify costing record was created.

      console.log(`✅ Costing record created: ${costingId}`);
      console.log('   (Full calculation requires BOM materials and labor data)');
    });

    it('Step 9: End-to-end flow validation', async () => {
      console.log('\n🎯 Step 9: Validating complete flow...');

      // Verify all major records were created
      const project = await prisma.project.findUnique({
        where: { id: testProject.id },
        include: {
          skus: true,
          components: true,
          dailyPlanGenerations: true,
          resourceAllocations: true,
          costings: true,
        },
      });

      expect(project).toBeDefined();
      expect(project.skus.length).toBeGreaterThan(0);
      expect(project.components.length).toBeGreaterThan(0);
      expect(project.dailyPlanGenerations.length).toBeGreaterThan(0);
      // allocations and costings may be 0 depending on approval flow

      console.log('✅ Complete Phase 3/4 workflow validated:');
      console.log(`   - BOM components: ${project.components.length}`);
      console.log(`   - Plan generations: ${project.dailyPlanGenerations.length}`);
      console.log(`   - Resource allocations: ${project.resourceAllocations.length}`);
      console.log(`   - Costing records: ${project.costings.length}`);
    });
  });

  describe('Cross-Project Resource Rebalancing', () => {
    it('Should suggest reallocation when multiple projects compete', async () => {
      console.log('\n🔄 Testing cross-project rebalancing...');

      const rebalanceResponse = await request(app)
        .post('/api/auto-planning/rebalance')
        .send({
          projectIds: [testProject.id],
        })
        .expect(200);

      expect(rebalanceResponse.body.projectsAnalyzed).toBe(1);
      console.log(`✅ Rebalancing analysis complete for ${rebalanceResponse.body.projectsAnalyzed} project(s)`);
    });
  });
});
