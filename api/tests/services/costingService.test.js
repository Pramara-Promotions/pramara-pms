// tests/services/costingService.test.js
// Patch bomService dependency before requiring the service to ensure the mock is used
const bomService = require('../../services/bomService');
bomService.calculateMaterialRequirements = jest.fn().mockResolvedValue([
  { materialCode: 'MAT1', materialName: 'Resin', totalRequired: 100, unitCost: 2 }
]);
const costingService = require('../../services/costingService');
const prisma = costingService._prisma;

describe('costingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (!prisma.project) prisma.project = {};
    if (!prisma.projectCosting) prisma.projectCosting = {};
    if (!prisma.projectWorkflow) prisma.projectWorkflow = {};
  if (!prisma.costComponent) prisma.costComponent = { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() };
  prisma.costComponent.findFirst = jest.fn().mockResolvedValue(null);
  prisma.costComponent.update = jest.fn().mockResolvedValue({ id: 'cc1' });
  prisma.costComponent.create = jest.fn().mockResolvedValue({ id: 'cc1' });
    prisma.project.findUnique = jest.fn().mockResolvedValue({
      id: 1,
      code: 'P001',
      skus: [{ id: 10, orderQuantity: 100 }],
      customer: { id: 5, tier: 'gold' }
    });
    prisma.projectCosting.findFirst = jest.fn().mockResolvedValue(null);
    prisma.projectCosting.create = jest.fn().mockResolvedValue({ id: 'c1', version: 1 });
    prisma.projectCosting.update = jest.fn().mockResolvedValue({ id: 'c1', version: 1 });
    prisma.projectWorkflow.findFirst = jest.fn().mockResolvedValue({ stages: [] });
  });

  test('calculateProjectCost aggregates material + overhead', async () => {
    const result = await costingService.calculateProjectCost(1);
    expect(result.breakdown.materialCost).toBeGreaterThan(0);
    expect(result.breakdown.overheadCost).toBeGreaterThan(0);
    // Expect that at least one cost component was persisted via create/update
    expect(prisma.costComponent.create.mock.calls.length + prisma.costComponent.update.mock.calls.length).toBeGreaterThan(0);
  });
});
