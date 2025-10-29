// api/tests/api/daily-planning.test.js
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

const dailyPlanningRouter = require('../../routes/daily-planning');
const {
  generateTestToken,
  createTestProject,
  cleanupTestData
} = require('../helpers/test-helpers');

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use('/api/daily-plans', dailyPlanningRouter);

describe('Daily Planning API Tests', () => {
  let testProject;
  let testToken;
  const createdIds = { projects: [], dailyPlans: [] };

  beforeAll(async () => {
    testToken = generateTestToken();
    testProject = await createTestProject(prisma);
    createdIds.projects.push(testProject.id);
  });

  afterAll(async () => {
    await cleanupTestData(prisma, 'dailyPlans', createdIds.dailyPlans);
    await cleanupTestData(prisma, 'projects', createdIds.projects);
    await prisma.$disconnect();
  });

  describe('POST /api/daily-plans/generate - Generate 3 Scenarios', () => {
    it('should generate 3 scenarios (fastest, cheapest, balanced)', async () => {
      const response = await request(app)
        .post('/api/daily-plans/generate')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          projectId: testProject.id,
          date: new Date().toISOString().split('T')[0],
          targetQuantity: 1000
        })
        .expect(200);

      expect(response.body).toHaveProperty('scenarios');
      expect(Array.isArray(response.body.scenarios)).toBe(true);
      expect(response.body.scenarios.length).toBe(3);

      const types = response.body.scenarios.map(s => s.type);
      expect(types).toContain('fastest');
      expect(types).toContain('cheapest');
      expect(types).toContain('balanced');

      response.body.scenarios.forEach(scenario => {
        expect(scenario).toHaveProperty('estimatedCost');
        expect(scenario).toHaveProperty('estimatedDuration');
        expect(scenario).toHaveProperty('workerSuggestions');
      });
    });

    it('should fail with invalid project ID', async () => {
      await request(app)
        .post('/api/daily-plans/generate')
        .send({
          projectId: 'invalid-id',
          date: new Date().toISOString().split('T')[0],
          targetQuantity: 1000
        })
        .expect(404);
    });

    it('should validate material availability', async () => {
      const response = await request(app)
        .post('/api/daily-plans/generate')
        .send({
          projectId: testProject.id,
          date: new Date().toISOString().split('T')[0],
          targetQuantity: 1000000 // Unrealistic quantity
        })
        .expect(200);

      // Should still generate scenarios but may include warnings
      expect(response.body.scenarios).toBeDefined();
    });
  });

  describe('POST /api/daily-plans - Create Daily Plan', () => {
    it('should create a daily plan from selected scenario', async () => {
      const response = await request(app)
        .post('/api/daily-plans')
        .send({
          projectId: testProject.id,
          date: new Date().toISOString().split('T')[0],
          targetQuantity: 1000,
          scenarioType: 'balanced',
          stations: []
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.scenarioType).toBe('balanced');
      expect(response.body.status).toBe('draft');
      createdIds.dailyPlans.push(response.body.id);
    });
  });

  describe('PUT /api/daily-plans/:id/approve - Approve Plan', () => {
    it('should approve a draft plan', async () => {
      // Create a plan first
      const createResponse = await request(app)
        .post('/api/daily-plans')
        .send({
          projectId: testProject.id,
          date: new Date().toISOString().split('T')[0],
          targetQuantity: 1000,
          scenarioType: 'fastest',
          stations: []
        });

      const planId = createResponse.body.id;
      createdIds.dailyPlans.push(planId);

      const response = await request(app)
        .put(`/api/daily-plans/${planId}/approve`)
        .expect(200);

      expect(response.body.status).toBe('approved');
    });
  });

  describe('POST /api/daily-plans/:id/adapt - Adapt Plan', () => {
    it('should adapt plan with worker change', async () => {
      // Create and approve a plan
      const createResponse = await request(app)
        .post('/api/daily-plans')
        .send({
          projectId: testProject.id,
          date: new Date().toISOString().split('T')[0],
          targetQuantity: 1000,
          scenarioType: 'balanced',
          stations: []
        });

      const planId = createResponse.body.id;
      createdIds.dailyPlans.push(planId);

      await request(app).put(`/api/daily-plans/${planId}/approve`);

      const response = await request(app)
        .post(`/api/daily-plans/${planId}/adapt`)
        .send({
          type: 'worker_change',
          reason: 'Worker unavailable',
          changes: { oldWorkerId: 'worker-1', newWorkerId: 'worker-2' }
        })
        .expect(200);

      expect(response.body).toHaveProperty('adaptation');
      expect(response.body.adaptation.type).toBe('worker_change');
    });

    it('should adapt plan with quantity change', async () => {
      const createResponse = await request(app)
        .post('/api/daily-plans')
        .send({
          projectId: testProject.id,
          date: new Date().toISOString().split('T')[0],
          targetQuantity: 1000,
          scenarioType: 'balanced',
          stations: []
        });

      const planId = createResponse.body.id;
      createdIds.dailyPlans.push(planId);

      const response = await request(app)
        .post(`/api/daily-plans/${planId}/adapt`)
        .send({
          type: 'qty_change',
          reason: 'Customer requested more',
          changes: { oldQty: 1000, newQty: 1200 }
        })
        .expect(200);

      expect(response.body.adaptation.type).toBe('qty_change');
    });
  });

  describe('GET /api/daily-plans - List Daily Plans', () => {
    it('should list all daily plans', async () => {
      const response = await request(app)
        .get('/api/daily-plans')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by project', async () => {
      const response = await request(app)
        .get(`/api/daily-plans?projectId=${testProject.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(plan => {
        expect(plan.projectId).toBe(testProject.id);
      });
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/daily-plans?status=approved')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(plan => {
        expect(plan.status).toBe('approved');
      });
    });
  });
});
