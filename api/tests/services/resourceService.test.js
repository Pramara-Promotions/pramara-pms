// tests/services/resourceService.test.js
const service = require('../../services/resourceService');
const prisma = service._prisma;

describe('resourceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('checkMachineAvailability aggregates allocation overlap', async () => {
    // Mock machines with one overlapping allocation for half the range
  jest.spyOn(prisma.stationMachine, 'findMany').mockResolvedValue([
      {
        id: 1,
        code: 'M1',
        name: 'Machine 1',
        machineType: 'injection',
        status: 'available',
        stationId: 10,
        Station: { code: 'ST10', name: 'Injection Station' },
        allocations: [
          {
            id: 'alloc1',
            startDate: '2025-11-10',
            endDate: '2025-11-12',
            Project: { code: 'P001', name: 'Proj' },
            ProjectSku: { code: 'SKU1' },
            machinesAllocated: 1,
          }
        ],
      }
    ]);

    const result = await service.checkMachineAvailability({
      stationId: 10,
      startDate: '2025-11-10',
      endDate: '2025-11-13'
    });

    expect(result).toHaveLength(1);
    const m = result[0];
    expect(m.totalDays).toBe(3); // 10->13 diff ceil
    expect(m.allocatedDays).toBeGreaterThan(0);
    expect(m.availablePercent).toBeLessThan(100);
  });

  test('checkAllocationConflicts detects overlap', async () => {
  jest.spyOn(prisma.resourceAllocation, 'findMany').mockResolvedValueOnce([
      { id: 'a1', projectId: 1, skuId: 2, startDate: '2025-11-10', endDate: '2025-11-15', Project: { code: 'P001' }, ProjectSku: { code: 'SKU1' } }
    ]);
    const conflicts = await service.checkAllocationConflicts({
      machineIds: [1],
      startDate: '2025-11-12',
      endDate: '2025-11-14'
    });
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflictingAllocations[0].allocationId).toBe('a1');
  });
});
