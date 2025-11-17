// tests/services/bottleneckService.test.js
const bottleneckService = require('../../services/bottleneckService');
const prisma = bottleneckService._prisma;

describe('bottleneckService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('detectBottlenecks identifies gap severity', async () => {
    if (!prisma.project) prisma.project = {};
    if (!prisma.dailyPlanGeneration) prisma.dailyPlanGeneration = {};
    prisma.project.findUnique = jest.fn().mockResolvedValue({ id: 1, code: 'PRJ', cutoffDate: new Date(Date.now() + 5 * 86400000).toISOString() });

    // Mock a minimal plan where actual is behind planned
    const today = new Date();
    const start = new Date(today.getTime() - 10*86400000);
    const end = new Date(today.getTime() + 10*86400000);
    prisma.dailyPlanGeneration.findFirst = jest.fn().mockResolvedValue({
      startDate: start, endDate: end, stationPlans: [
        { stationId: 10, skuId: 100, date: new Date(start), targetQty: 100, actualQty: 20, Station: { code: 'ST10', name: 'Station 10' }, ProjectSku: { code: 'SKU' } },
        { stationId: 10, skuId: 100, date: new Date(start.getTime()+86400000), targetQty: 100, actualQty: 20, Station: { code: 'ST10', name: 'Station 10' }, ProjectSku: { code: 'SKU' } }
      ]
    });

    const result = await bottleneckService.detectBottlenecks(1);
    expect(result.bottlenecksDetected).toBe(1);
    expect(result.bottlenecks[0].severity).toBeTruthy();
  });
});
