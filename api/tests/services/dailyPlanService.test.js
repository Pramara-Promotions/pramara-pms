// tests/services/dailyPlanService.test.js
const dailyPlanService = require('../../services/dailyPlanService');
const prisma = dailyPlanService._prisma;
// Inject mocks directly into exported internal dependencies
dailyPlanService._capacityService.getStationCapacity = jest.fn(async () => ({ totalDailyCapacity: 500, cycleTime: 60, availableMachines: 2 }));
dailyPlanService._capacityService.calculateDaysRequired = (qty, dailyCap) => Math.ceil(qty / dailyCap);
dailyPlanService._capacityService.recordChangeover = jest.fn();
dailyPlanService._capacityService.suggestReallocation = jest.fn().mockResolvedValue({ suggestions: [] });
dailyPlanService._bomService.getProjectBOM = jest.fn().mockResolvedValue([]);
// Mock resource allocation path used during approval (not part of this test but safe)
jest.mock('../../services/resourceService', () => ({ allocateMachines: jest.fn().mockResolvedValue([{ id: 'alloc1' }]) }));

describe('dailyPlanService.generateDailyPlan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure required model stubs exist
    if (!prisma.project) prisma.project = {};
    if (!prisma.dailyPlanGeneration) prisma.dailyPlanGeneration = {};
    if (!prisma.dailyPlanStationAuto) prisma.dailyPlanStationAuto = {};
    // Define mockable functions if missing
    prisma.project.findUnique = jest.fn().mockResolvedValue({
      id: 1,
      cutoffDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      skus: [{ id: 10, orderQuantity: 1000, Material: { code: 'MAT' } }],
      workflow: { stages: [{ stationId: 20, stageOrder: 1, processName: 'molding', Station: { code: 'ST20', name: 'Molding' } }] },
    });
    prisma.dailyPlanGeneration.findFirst = jest.fn().mockResolvedValue(null);
    prisma.dailyPlanGeneration.create = jest.fn().mockResolvedValue({ id: 'pg1' });
    prisma.dailyPlanStationAuto.create = jest.fn().mockResolvedValue({ id: 'dps1', stationId: 20, skuId: 10, plannedQuantity: 500 });
    prisma.dailyPlanGeneration.update = jest.fn().mockResolvedValue({ id: 'pg1', totalStations: 1, totalPlannedDays: 5 });
  });

  test('creates planGeneration and station records', async () => {
    const result = await dailyPlanService.generateDailyPlan({ projectId: 1, generatedBy: 'tester' });
    expect(result.planGeneration.id).toBe('pg1');
    expect(result.summary.status).toBe('pending_approval');
    expect(prisma.dailyPlanStationAuto.create).toHaveBeenCalled();
  });
});
