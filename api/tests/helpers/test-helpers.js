// api/tests/helpers/test-helpers.js
const jwt = require('jsonwebtoken');

/**
 * Generate a test JWT token for authentication
 */
function generateTestToken(user = {}) {
  const testUser = {
    id: user.id || 'test-user-id',
    email: user.email || 'test@pramara.com',
    role: user.role || 'admin',
    ...user
  };

  return jwt.sign(testUser, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '1h'
  });
}

/**
 * Create test user in database
 */
async function createTestUser(prisma, userData = {}) {
  const defaultUser = {
    email: `test-${Date.now()}@pramara.com`,
    password: 'hashed-test-password',
    role: 'admin',
    ...userData
  };

  return await prisma.user.create({
    data: defaultUser
  });
}

/**
 * Create test project in database
 */
async function createTestProject(prisma, projectData = {}) {
  const defaultProject = {
    code: projectData.code || `TEST-${Date.now()}`,
    name: `Test Project ${Date.now()}`,
    quantity: projectData.quantity || 1000,
    ...projectData
  };

  return await prisma.project.create({
    data: defaultProject
  });
}

/**
 * Create test station in database
 */
async function createTestStation(prisma, stationData = {}) {
  // Filter out fields that don't exist in Station schema
  const { type, ...validStationData } = stationData;
  
  const defaultStation = {
    name: `Test Station ${Date.now()}`,
    capacity: 8,
    updatedAt: new Date(),
    ...validStationData
  };

  return await prisma.station.create({
    data: defaultStation
  });
}

/**
 * Create test material in database
 */
async function createTestMaterial(prisma, materialData = {}) {
  const { randomUUID } = require('crypto');
  
  // Map old field names to new ones
  const stockQty = materialData.stockQty || materialData.stockQuantity || 100;
  const reservedQty = materialData.reservedQty || materialData.reservedQuantity || 0;
  const minStock = materialData.minStock || materialData.minStockLevel || 50;
  const costPerUnit = materialData.costPerUnit || materialData.unitCost || 10;
  
  const defaultMaterial = {
    id: materialData.id || randomUUID(),
    name: materialData.name || `Test Material ${Date.now()}`,
    type: materialData.type || 'raw_material',
    unit: materialData.unit || 'kg',
    stockQty,
    reservedQty,
    minStock,
    costPerUnit,
    updatedAt: new Date()
  };

  return await prisma.material.create({
    data: defaultMaterial
  });
}

/**
 * Create test worker in database
 */
async function createTestWorker(prisma, workerData = {}) {
  const { randomUUID } = require('crypto');
  const defaultWorker = {
    id: workerData.id || randomUUID(),
    name: workerData.name || `Test Worker ${Date.now()}`,
    workerType: workerData.workerType || workerData.type || 'company',
    skills: workerData.skills || ['molding'],
    updatedAt: new Date()
  };

  return await prisma.worker.create({
    data: defaultWorker
  });
}

/**
 * Clean up test data
 */
async function cleanupTestData(prisma, resourceType, ids) {
  // Filter out undefined/null IDs
  const validIds = ids.filter(id => id != null);
  if (validIds.length === 0) return;
  
  const deleteOperations = {
    users: () => prisma.user.deleteMany({ where: { id: { in: validIds } } }),
    projects: () => prisma.project.deleteMany({ where: { id: { in: validIds } } }),
    stations: () => prisma.station.deleteMany({ where: { id: { in: validIds } } }),
    materials: () => prisma.material.deleteMany({ where: { id: { in: validIds } } }),
    workers: () => prisma.worker.deleteMany({ where: { id: { in: validIds } } }),
    processConfigs: () => prisma.processConfig.deleteMany({ where: { id: { in: validIds } } }),
    workflowStages: () => prisma.workflowStage.deleteMany({ where: { id: { in: validIds } } }),
    dailyPlans: () => prisma.dailyPlan.deleteMany({ where: { id: { in: validIds } } }),
    approvalRequests: () => prisma.approvalRequest.deleteMany({ where: { id: { in: validIds } } })
  };

  const operation = deleteOperations[resourceType];
  if (operation) {
    await operation();
  }
}

/**
 * Wait for a condition to be true (polling)
 */
async function waitFor(conditionFn, timeout = 5000, interval = 100) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await conditionFn()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

module.exports = {
  generateTestToken,
  createTestUser,
  createTestProject,
  createTestStation,
  createTestMaterial,
  createTestWorker,
  cleanupTestData,
  waitFor
};
