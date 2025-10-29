// api/tests/api/mrp.test.js
const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');

// Mock the auth middleware BEFORE requiring the router
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user-id', email: 'test@test.com', roles: ['admin'] };
    req.auth = {
      user: req.user,
      roles: [{ name: 'admin' }],
      perms: new Set(['*'])
    };
    next();
  }
}));

const mrpRouter = require('../../routes/mrp');
const {
  generateTestToken,
  createTestProject,
  createTestMaterial,
  createTestStation,
  cleanupTestData
} = require('../helpers/test-helpers');

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use('/api/mrp', mrpRouter);

describe('MRP API Tests', () => {
  let testProject;
  let testMaterial;
  let testStation;
  let testToken;
  const createdIds = {
    projects: [],
    materials: [],
    stations: [],
    materialRequirements: [],
    bomItems: [],
    mrpLearning: []
  };

  beforeAll(async () => {
    testToken = generateTestToken();
    
    // Create test project
    testProject = await createTestProject(prisma, {
      name: 'MRP Test Project'
    });
    createdIds.projects.push(testProject.id);

    // Create test material
    testMaterial = await createTestMaterial(prisma, {
      name: 'Test Plastic Resin',
      type: 'raw_material',
      stockQuantity: 500,
      unitCost: 50
    });
    createdIds.materials.push(testMaterial.id);

    // Create test station
    testStation = await createTestStation(prisma, {
      name: 'Test Molding Station',
      type: 'molding'
    });
    createdIds.stations.push(testStation.id);

    // Create test SKU
    await prisma.sKU.create({
      data: {
        projectId: testProject.id,
        name: 'Test SKU-001',
        targetQuantity: 1000
      }
    });
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    await cleanupTestData(prisma, 'materialRequirements', createdIds.materialRequirements);
    await cleanupTestData(prisma, 'materials', createdIds.materials);
    await cleanupTestData(prisma, 'stations', createdIds.stations);
    await cleanupTestData(prisma, 'projects', createdIds.projects);
    await prisma.$disconnect();
  });

  describe('POST /api/mrp/calculate - MRP Calculation', () => {
    it('should calculate MRP with estimated loss (first time)', async () => {
      const response = await request(app)
        .post('/api/mrp/calculate')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          projectId: testProject.id,
          skuId: testProject.id, // Using project ID as SKU for test
          targetQuantity: 1000,
          lossType: 'project_wide',
          projectWideLoss: 10
        })
        .expect(200);

      expect(response.body).toHaveProperty('requirements');
      expect(Array.isArray(response.body.requirements)).toBe(true);
      expect(response.body).toHaveProperty('totalCost');
      expect(response.body).toHaveProperty('confidence');
      expect(response.body.confidence).toBeGreaterThanOrEqual(50);
    });

    it('should use learned loss percentage if available', async () => {
      // First calculation with estimated loss
      const firstCalc = await request(app)
        .post('/api/mrp/calculate')
        .send({
          projectId: testProject.id,
          skuId: testProject.id,
          targetQuantity: 1000,
          lossType: 'project_wide',
          projectWideLoss: 10
        })
        .expect(200);

      // Record actual consumption (12% actual loss)
      await request(app)
        .post('/api/mrp/learning/record')
        .send({
          materialId: testMaterial.id,
          stationId: testStation.id,
          projectId: testProject.id,
          estimatedQty: 1000,
          actualQty: 1120, // 12% loss
          costImpact: (1120 - 1000) * 50 // 120 units * $50
        })
        .expect(200);

      // Second calculation should use learned 12%
      const secondCalc = await request(app)
        .post('/api/mrp/calculate')
        .send({
          projectId: testProject.id,
          skuId: testProject.id,
          targetQuantity: 1000,
          lossType: 'project_wide',
          projectWideLoss: 10 // Will be ignored, uses learned 12%
        })
        .expect(200);

      expect(secondCalc.body.confidence).toBeGreaterThan(firstCalc.body.confidence);
    });

    it('should fail with invalid project ID', async () => {
      await request(app)
        .post('/api/mrp/calculate')
        .send({
          projectId: 'invalid-id',
          skuId: 'invalid-id',
          targetQuantity: 1000,
          lossType: 'project_wide',
          projectWideLoss: 10
        })
        .expect(404);
    });

    it('should require valid loss type', async () => {
      await request(app)
        .post('/api/mrp/calculate')
        .send({
          projectId: testProject.id,
          skuId: testProject.id,
          targetQuantity: 1000,
          lossType: 'invalid_type',
          projectWideLoss: 10
        })
        .expect(400);
    });
  });

  describe('GET /api/mrp/:projectId - Get Project MRPs', () => {
    it('should return MRPs for a project', async () => {
      // First create an MRP
      await request(app)
        .post('/api/mrp/calculate')
        .send({
          projectId: testProject.id,
          skuId: testProject.id,
          targetQuantity: 1000,
          lossType: 'project_wide',
          projectWideLoss: 10
        });

      const response = await request(app)
        .get(`/api/mrp/${testProject.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('projectId', testProject.id);
        expect(response.body[0]).toHaveProperty('material');
      }
    });
  });

  describe('POST /api/mrp/bom - Create BOM Item', () => {
    it('should create a BOM item', async () => {
      const response = await request(app)
        .post('/api/mrp/bom')
        .send({
          skuId: testProject.id,
          materialId: testMaterial.id,
          quantityPerUnit: 0.5,
          stage: 'molding'
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.quantityPerUnit).toBe(0.5);
      expect(response.body.stage).toBe('molding');
      createdIds.bomItems.push(response.body.id);
    });

    it('should fail with invalid material ID', async () => {
      await request(app)
        .post('/api/mrp/bom')
        .send({
          skuId: testProject.id,
          materialId: 'invalid-id',
          quantityPerUnit: 0.5,
          stage: 'molding'
        })
        .expect(404);
    });
  });

  describe('GET /api/mrp/learning/accuracy - Learning Accuracy', () => {
    it('should return accuracy metrics', async () => {
      const response = await request(app)
        .get('/api/mrp/learning/accuracy?days=90')
        .expect(200);

      expect(response.body).toHaveProperty('overallAccuracy');
      expect(response.body).toHaveProperty('dataPoints');
      expect(response.body).toHaveProperty('byType');
      expect(typeof response.body.overallAccuracy).toBe('number');
    });
  });

  describe('GET /api/mrp/learning/recommendations - System Recommendations', () => {
    it('should return pending recommendations', async () => {
      const response = await request(app)
        .get('/api/mrp/learning/recommendations?status=pending')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/mrp/learning/record - Record Actual Consumption', () => {
    it('should record actual consumption and update avgLossPercent', async () => {
      const initialMaterial = await prisma.material.findUnique({
        where: { id: testMaterial.id }
      });

      const response = await request(app)
        .post('/api/mrp/learning/record')
        .send({
          materialId: testMaterial.id,
          stationId: testStation.id,
          projectId: testProject.id,
          estimatedQty: 1000,
          actualQty: 1100, // 10% loss
          costImpact: (1100 - 1000) * 50
        })
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.lossPercent).toBe(10);
      expect(response.body.accuracy).toBeGreaterThan(0);

      // Verify material avgLossPercent updated
      const updatedMaterial = await prisma.material.findUnique({
        where: { id: testMaterial.id }
      });

      expect(updatedMaterial.avgLossPercent).toBeGreaterThan(0);
    });
  });

  describe('POST /api/mrp/what-if - What-If Scenario Analysis', () => {
    it('should run multiple what-if scenarios', async () => {
      const response = await request(app)
        .post('/api/mrp/what-if')
        .send({
          projectId: testProject.id,
          skuId: testProject.id,
          scenarios: [
            { targetQuantity: 1000, lossPercent: 10 },
            { targetQuantity: 1000, lossPercent: 15 },
            { targetQuantity: 1500, lossPercent: 10 }
          ]
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
      
      response.body.forEach(scenario => {
        expect(scenario).toHaveProperty('requirements');
        expect(scenario).toHaveProperty('totalCost');
      });
    });
  });

  describe('GET /api/mrp/availability-check - Check Material Availability', () => {
    it('should check if materials are available for project', async () => {
      const response = await request(app)
        .get(`/api/mrp/availability-check?projectId=${testProject.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('available');
      expect(response.body).toHaveProperty('shortages');
      expect(Array.isArray(response.body.shortages)).toBe(true);
    });
  });

  describe('MRP Self-Learning Algorithm E2E', () => {
    it('should demonstrate learning improvement over time', async () => {
      // Initial calculation with estimate
      const calc1 = await request(app)
        .post('/api/mrp/calculate')
        .send({
          projectId: testProject.id,
          skuId: testProject.id,
          targetQuantity: 1000,
          lossType: 'project_wide',
          projectWideLoss: 10
        });

      const initialConfidence = calc1.body.confidence;

      // Simulate 5 learning cycles
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/mrp/learning/record')
          .send({
            materialId: testMaterial.id,
            stationId: testStation.id,
            projectId: testProject.id,
            estimatedQty: 1000 + i * 100,
            actualQty: 1100 + i * 110,
            costImpact: 50 * (100 + i * 10)
          });
      }

      // Calculate again after learning
      const calc2 = await request(app)
        .post('/api/mrp/calculate')
        .send({
          projectId: testProject.id,
          skuId: testProject.id,
          targetQuantity: 1000,
          lossType: 'project_wide',
          projectWideLoss: 10
        });

      const finalConfidence = calc2.body.confidence;

      // Confidence should improve
      expect(finalConfidence).toBeGreaterThan(initialConfidence);
      
      // Get accuracy metrics
      const accuracy = await request(app)
        .get('/api/mrp/learning/accuracy?days=90');

      expect(accuracy.body.dataPoints).toBeGreaterThanOrEqual(5);
    }, 30000); // Longer timeout for this test
  });
});
