const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(requireAuth);

function toInt(v, def = null) {
  if (v === undefined || v === null || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

// Helper: generate asset code AST-YYYYMMDD-XXX
async function generateAssetCode() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${y}${m}${day}`;
  const count = await prisma.asset.count({ where: { createdAt: { gte: new Date(`${y}-${m}-${day}T00:00:00Z`) } } });
  const seq = String(count + 1).padStart(3, '0');
  return `AST-${dateStr}-${seq}`;
}

// GET /api/assets
router.get('/', async (req, res) => {
  try {
    const { status, type, mobility, search, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (status) where.status = String(status);
    if (type) where.assetType = String(type);
    if (mobility) where.mobility = String(mobility);
    if (search) {
      where.OR = [
        { assetCode: { contains: String(search), mode: 'insensitive' } },
        { assetName: { contains: String(search), mode: 'insensitive' } },
        { category: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const skip = (toInt(page, 1) - 1) * toInt(pageSize, 20);
    const take = toInt(pageSize, 20);

    const [items, total] = await Promise.all([
      prisma.asset.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.asset.count({ where }),
    ]);

    res.json({ items, total, page: toInt(page, 1), pageSize: take });
  } catch (e) {
    console.error('assets:list', e);
    res.status(500).json({ error: 'Failed to list assets' });
  }
});

// GET /api/assets/:id
router.get('/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const item = await prisma.asset.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Asset not found' });
    res.json(item);
  } catch (e) {
    console.error('assets:get', e);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

// POST /api/assets
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const assetCode = b.assetCode || (await generateAssetCode());
    const item = await prisma.asset.create({
      data: {
        assetCode,
        assetName: String(b.assetName || 'Asset'),
        assetType: String(b.assetType || 'machine'),
        category: b.category || null,
        manufacturer: b.manufacturer || null,
        model: b.model || null,
        specifications: b.specifications || null,
        mobility: String(b.mobility || 'fixed'),
        currentLocation: b.currentLocation || null,
        assignedToStation: b.assignedToStation || null,
        status: String(b.status || 'available'),
        condition: String(b.condition || 'good'),
        lastMaintenanceDate: b.lastMaintenanceDate ? new Date(b.lastMaintenanceDate) : null,
        nextMaintenanceDate: b.nextMaintenanceDate ? new Date(b.nextMaintenanceDate) : null,
        maintenanceHistory: b.maintenanceHistory || null,
        maintenanceIntervalDays: toInt(b.maintenanceIntervalDays, null),
        totalRunHours: Number(b.totalRunHours || 0),
        totalCycles: toInt(b.totalCycles || 0, 0),
        lastUsedDate: b.lastUsedDate ? new Date(b.lastUsedDate) : null,
        utilizationRate: b.utilizationRate != null ? Number(b.utilizationRate) : null,
        purchaseDate: b.purchaseDate ? new Date(b.purchaseDate) : null,
        purchaseCost: b.purchaseCost != null ? Number(b.purchaseCost) : null,
        depreciationRate: b.depreciationRate != null ? Number(b.depreciationRate) : null,
        manualUrl: b.manualUrl || null,
        images: Array.isArray(b.images) ? b.images : [],
        notes: b.notes || null,
        createdBy: req.user?.id || null,
      },
    });
    res.status(201).json(item);
  } catch (e) {
    console.error('assets:create', e);
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

// PUT /api/assets/:id
router.put('/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const b = req.body || {};
    const item = await prisma.asset.update({
      where: { id },
      data: {
        ...(b.assetCode !== undefined ? { assetCode: String(b.assetCode) } : {}),
        ...(b.assetName !== undefined ? { assetName: String(b.assetName) } : {}),
        ...(b.assetType !== undefined ? { assetType: String(b.assetType) } : {}),
        ...(b.category !== undefined ? { category: b.category || null } : {}),
        ...(b.manufacturer !== undefined ? { manufacturer: b.manufacturer || null } : {}),
        ...(b.model !== undefined ? { model: b.model || null } : {}),
        ...(b.specifications !== undefined ? { specifications: b.specifications } : {}),
        ...(b.mobility !== undefined ? { mobility: String(b.mobility) } : {}),
        ...(b.currentLocation !== undefined ? { currentLocation: b.currentLocation || null } : {}),
        ...(b.assignedToStation !== undefined ? { assignedToStation: b.assignedToStation || null } : {}),
        ...(b.status !== undefined ? { status: String(b.status) } : {}),
        ...(b.condition !== undefined ? { condition: String(b.condition) } : {}),
        ...(b.lastMaintenanceDate !== undefined ? { lastMaintenanceDate: b.lastMaintenanceDate ? new Date(b.lastMaintenanceDate) : null } : {}),
        ...(b.nextMaintenanceDate !== undefined ? { nextMaintenanceDate: b.nextMaintenanceDate ? new Date(b.nextMaintenanceDate) : null } : {}),
        ...(b.maintenanceHistory !== undefined ? { maintenanceHistory: b.maintenanceHistory } : {}),
        ...(b.maintenanceIntervalDays !== undefined ? { maintenanceIntervalDays: toInt(b.maintenanceIntervalDays, null) } : {}),
        ...(b.totalRunHours !== undefined ? { totalRunHours: Number(b.totalRunHours) } : {}),
        ...(b.totalCycles !== undefined ? { totalCycles: toInt(b.totalCycles, 0) } : {}),
        ...(b.lastUsedDate !== undefined ? { lastUsedDate: b.lastUsedDate ? new Date(b.lastUsedDate) : null } : {}),
        ...(b.utilizationRate !== undefined ? { utilizationRate: b.utilizationRate != null ? Number(b.utilizationRate) : null } : {}),
        ...(b.purchaseDate !== undefined ? { purchaseDate: b.purchaseDate ? new Date(b.purchaseDate) : null } : {}),
        ...(b.purchaseCost !== undefined ? { purchaseCost: b.purchaseCost != null ? Number(b.purchaseCost) : null } : {}),
        ...(b.depreciationRate !== undefined ? { depreciationRate: b.depreciationRate != null ? Number(b.depreciationRate) : null } : {}),
        ...(b.manualUrl !== undefined ? { manualUrl: b.manualUrl || null } : {}),
        ...(b.images !== undefined ? { images: Array.isArray(b.images) ? b.images : [] } : {}),
        ...(b.notes !== undefined ? { notes: b.notes || null } : {}),
      },
    });
    res.json(item);
  } catch (e) {
    console.error('assets:update', e);
    if (e.code === 'P2025') return res.status(404).json({ error: 'Asset not found' });
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// DELETE /api/assets/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    await prisma.asset.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('assets:delete', e);
    if (e.code === 'P2025') return res.status(404).json({ error: 'Asset not found' });
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

module.exports = router;
