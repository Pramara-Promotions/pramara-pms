// tests/services/bomService.test.js
const bomService = require('../../services/bomService');
const prisma = bomService._prisma;

describe('bomService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('createComponent passes correct data', async () => {
  jest.spyOn(prisma.productComponent, 'create').mockResolvedValue({ id: 99, name: 'Frame', type: 'frame' });
    const comp = await bomService.createComponent({ projectId: 1, skuId: 2, type: 'frame', name: 'Frame' });
    expect(comp.id).toBe(99);
    expect(prisma.productComponent.create).toHaveBeenCalled();
  });

  test('linkMaterialToComponent stores quantityPerComponent', async () => {
  jest.spyOn(prisma.componentMaterial, 'create').mockResolvedValue({ id: 'cm1', componentId: 99, materialId: 5, quantityPerComponent: 2 });
    const link = await bomService.linkMaterialToComponent({ componentId: 99, materialId: 5, quantityPerComponent: 2 });
    expect(link.quantityPerComponent).toBe(2);
  });
});
