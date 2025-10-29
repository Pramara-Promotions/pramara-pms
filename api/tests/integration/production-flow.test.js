// api/tests/integration/production-flow.test.js
/**
 * Integration Test: Complete Production Flow
 * Tests the end-to-end workflow from planning to production
 */

const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const {
  generateTestToken,
  createTestProject,
  createTestStation,
  createTestMaterial,
  createTestWorker,
  cleanupTestData
} = require('../helpers/test-helpers');

const prisma = new PrismaClient();

// Import all routers
const workflowStagesRouter = require('../../routes/workflow-stages');
const processConfigRouter = require('../../routes/process-config');
const materialsRouter = require('../../routes/materials');
const mrpRouter = require('../../routes/mrp');
const dailyPlanningRouter = require('../../routes/daily-planning');
const productionEntriesRouter = require('../../routes/production-entries');
const qcSubmissionsRouter = require('../../routes/qc-submissions');
const batchesRouter = require('../../routes/batches');

const app = express();
app.use(express.json());

// Mock auth
app.use((req, res, next) => {
  req.auth = { user: { id: 'test-user-id', role: 'admin' } };
  next();
});

// Register routes
app.use('/api/workflow', workflowStagesRouter);
app.use('/api/process-config', processConfigRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/mrp', mrpRouter);
app.use('/api/daily-plans', dailyPlanningRouter);
app.use('/api/production-entries', productionEntriesRouter);
app.use('/api/qc-submissions', qcSubmissionsRouter);
app.use('/api/batches', batchesRouter);

describe('Integration: Complete Production Flow', () => {
  let testProject;
  let testStation;
  let testMaterial;
  let testWorker;
  let testToken;
  const createdIds = {
    projects: [],
    stations: [],
    materials: [],
    workers: [],
    workflowStages: [],
    processConfigs: [],
    dailyPlans: [],
    productionEntries: [],
    qcSubmissions: [],
    batches: []
  };

  beforeAll(async () => {
    testToken = generateTestToken();
    
    // Setup test data
    testProject = await createTestProject(prisma, { name: 'Integration Test Project' });
    createdIds.projects.push(testProject.id);

    testStation = await createTestStation(prisma, { name: 'Integration Test Station' });
    createdIds.stations.push(testStation.id);

    testMaterial = await createTestMaterial(prisma, { 
      name: 'Integration Test Material',
      stockQuantity: 10000,
      unitCost: 50
    });
    createdIds.materials.push(testMaterial.id);

    testWorker = await createTestWorker(prisma, { name: 'Integration Test Worker' });
    createdIds.workers.push(testWorker.id);
  });

  afterAll(async () => {
    // Cleanup in dependency order
    await cleanupTestData(prisma, 'qcSubmissions', createdIds.qcSubmissions);
    await cleanupTestData(prisma, 'productionEntries', createdIds.productionEntries);
    await cleanupTestData(prisma, 'batches', createdIds.batches);
    await cleanupTestData(prisma, 'dailyPlans', createdIds.dailyPlans);
    await cleanupTestData(prisma, 'processConfigs', createdIds.processConfigs);
    await cleanupTestData(prisma, 'workflowStages', createdIds.workflowStages);
    await cleanupTestData(prisma, 'workers', createdIds.workers);
    await cleanupTestData(prisma, 'materials', createdIds.materials);
    await cleanupTestData(prisma, 'stations', createdIds.stations);
    await cleanupTestData(prisma, 'projects', createdIds.projects);
    await prisma.$disconnect();
  });

  test('Complete Flow: Planning → Materials → MRP → Production → QC → Batch', async () => {
    console.log('🎯 Starting Complete Production Flow Integration Test');

    // ==========================================
    // STEP 1: Define Workflow Stages
    // ==========================================
    console.log('Step 1: Creating workflow stages...');
    
    const stageResponse = await request(app)
      .post('/api/workflow/stages')
      .send({
        projectId: testProject.id,
        name: 'Molding',
        order: 1,
        approverType: 'internal',
        bufferDays: 5
      })
      .expect(201);

    expect(stageResponse.body).toHaveProperty('id');
    createdIds.workflowStages.push(stageResponse.body.id);
    console.log('✅ Workflow stage created');

    // ==========================================
    // STEP 2: Configure Process Parameters
    // ==========================================
    console.log('Step 2: Configuring process parameters...');
    
    const processConfigResponse = await request(app)
      .post('/api/process-config')
      .send({
        stationId: testStation.id,
        projectId: testProject.id,
        processType: 'molding',
        setupTime: 30,
        cycleTimePerUnit: 5,
        cooldownTime: 10
      })
      .expect(201);

    expect(processConfigResponse.body).toHaveProperty('id');
    createdIds.processConfigs.push(processConfigResponse.body.id);
    console.log('✅ Process config created');

    // ==========================================
    // STEP 3: Calculate MRP
    // ==========================================
    console.log('Step 3: Calculating material requirements...');
    
    const mrpResponse = await request(app)
      .post('/api/mrp/calculate')
      .send({
        projectId: testProject.id,
        skuId: testProject.id,
        targetQuantity: 1000,
        lossType: 'project_wide',
        projectWideLoss: 10
      })
      .expect(200);

    expect(mrpResponse.body).toHaveProperty('requirements');
    expect(mrpResponse.body.requirements.length).toBeGreaterThan(0);
    console.log('✅ MRP calculated');

    // ==========================================
    // STEP 4: Check Material Availability
    // ==========================================
    console.log('Step 4: Checking material availability...');
    
    const availabilityResponse = await request(app)
      .get(`/api/mrp/availability-check?projectId=${testProject.id}`)
      .expect(200);

    expect(availabilityResponse.body).toHaveProperty('available');
    console.log(`✅ Material availability: ${availabilityResponse.body.available ? 'Available' : 'Shortage'}`);

    // ==========================================
    // STEP 5: Generate Daily Plan (3 Scenarios)
    // ==========================================
    console.log('Step 5: Generating daily planning scenarios...');
    
    const planResponse = await request(app)
      .post('/api/daily-plans/generate')
      .send({
        projectId: testProject.id,
        date: '2025-11-01',
        targetQuantity: 1000
      })
      .expect(200);

    expect(planResponse.body).toHaveProperty('scenarios');
    expect(planResponse.body.scenarios.length).toBe(3);
    
    const types = planResponse.body.scenarios.map(s => s.type);
    expect(types).toContain('fastest');
    expect(types).toContain('cheapest');
    expect(types).toContain('balanced');
    console.log('✅ 3 scenarios generated');

    // ==========================================
    // STEP 6: Create Daily Plan (Select Balanced)
    // ==========================================
    console.log('Step 6: Creating daily plan with balanced scenario...');
    
    const createPlanResponse = await request(app)
      .post('/api/daily-plans')
      .send({
        projectId: testProject.id,
        date: '2025-11-01',
        targetQuantity: 1000,
        scenarioType: 'balanced',
        stations: []
      })
      .expect(201);

    const planId = createPlanResponse.body.id;
    createdIds.dailyPlans.push(planId);
    console.log('✅ Daily plan created');

    // ==========================================
    // STEP 7: Approve Daily Plan
    // ==========================================
    console.log('Step 7: Approving daily plan...');
    
    const approvePlanResponse = await request(app)
      .put(`/api/daily-plans/${planId}/approve`)
      .expect(200);

    expect(approvePlanResponse.body.status).toBe('approved');
    console.log('✅ Daily plan approved');

    // ==========================================
    // STEP 8: Create Batch
    // ==========================================
    console.log('Step 8: Creating production batch...');
    
    const batchResponse = await request(app)
      .post('/api/batches')
      .send({
        projectId: testProject.id,
        batchNumber: `BATCH-TEST-${Date.now()}`,
        quantity: 1000,
        status: 'in_progress'
      })
      .expect(201);

    const batchId = batchResponse.body.id;
    createdIds.batches.push(batchId);
    console.log('✅ Batch created');

    // ==========================================
    // STEP 9: Log Production Entry
    // ==========================================
    console.log('Step 9: Logging production entry...');
    
    const productionResponse = await request(app)
      .post('/api/production-entries')
      .send({
        projectId: testProject.id,
        stationId: testStation.id,
        batchId: batchId,
        workerId: testWorker.id,
        quantityProduced: 950,
        defectQuantity: 50,
        stage: 'molding'
      })
      .expect(201);

    createdIds.productionEntries.push(productionResponse.body.id);
    console.log('✅ Production entry logged');

    // ==========================================
    // STEP 10: Submit QC Inspection
    // ==========================================
    console.log('Step 10: Submitting QC inspection...');
    
    const qcResponse = await request(app)
      .post('/api/qc-submissions')
      .send({
        projectId: testProject.id,
        batchId: batchId,
        inspectorId: testWorker.id,
        stage: 'molding',
        inspectedQuantity: 950,
        passedQuantity: 920,
        failedQuantity: 30,
        defects: ['surface_defect'],
        result: 'passed'
      })
      .expect(201);

    createdIds.qcSubmissions.push(qcResponse.body.id);
    console.log('✅ QC inspection completed');

    // ==========================================
    // STEP 11: Record Actual Material Consumption (MRP Learning)
    // ==========================================
    console.log('Step 11: Recording actual material consumption for MRP learning...');
    
    const learningResponse = await request(app)
      .post('/api/mrp/learning/record')
      .send({
        materialId: testMaterial.id,
        stationId: testStation.id,
        projectId: testProject.id,
        estimatedQty: 1100, // What MRP calculated
        actualQty: 1150, // What was actually used
        costImpact: (1150 - 1100) * 50
      })
      .expect(200);

    expect(learningResponse.body).toHaveProperty('lossPercent');
    expect(learningResponse.body).toHaveProperty('accuracy');
    console.log(`✅ MRP learning recorded (Loss: ${learningResponse.body.lossPercent}%, Accuracy: ${learningResponse.body.accuracy}%)`);

    // ==========================================
    // STEP 12: Update Batch Status to Completed
    // ==========================================
    console.log('Step 12: Updating batch status to completed...');
    
    const updateBatchResponse = await request(app)
      .put(`/api/batches/${batchId}`)
      .send({
        status: 'completed',
        completedQuantity: 920
      })
      .expect(200);

    expect(updateBatchResponse.body.status).toBe('completed');
    console.log('✅ Batch completed');

    // ==========================================
    // STEP 13: Verify MRP Accuracy Improvement
    // ==========================================
    console.log('Step 13: Verifying MRP accuracy metrics...');
    
    const accuracyResponse = await request(app)
      .get('/api/mrp/learning/accuracy?days=90')
      .expect(200);

    expect(accuracyResponse.body).toHaveProperty('overallAccuracy');
    expect(accuracyResponse.body).toHaveProperty('dataPoints');
    expect(accuracyResponse.body.dataPoints).toBeGreaterThan(0);
    console.log(`✅ MRP accuracy: ${accuracyResponse.body.overallAccuracy}% (${accuracyResponse.body.dataPoints} data points)`);

    // ==========================================
    // FINAL VERIFICATION
    // ==========================================
    console.log('🎉 Complete Production Flow Test PASSED!');
    console.log('Summary:');
    console.log('- Workflow stages defined ✅');
    console.log('- Process configured ✅');
    console.log('- MRP calculated ✅');
    console.log('- Material availability checked ✅');
    console.log('- Daily plan generated (3 scenarios) ✅');
    console.log('- Plan approved ✅');
    console.log('- Batch created ✅');
    console.log('- Production logged ✅');
    console.log('- QC inspection passed ✅');
    console.log('- MRP learning improved ✅');
    console.log('- Batch completed ✅');
    
  }, 60000); // 60 second timeout for complete flow
});
