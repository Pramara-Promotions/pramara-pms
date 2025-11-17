const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(requireAuth);

// Helpers to load numeric settings with defaults
async function loadNumberSetting(key, defVal) {
  try {
    const s = await prisma.systemSetting.findUnique({ where: { key } });
    const v = s?.value;
    if (v == null) return defVal;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const n = Number(v);
      return Number.isFinite(n) ? n : defVal;
    }
    if (typeof v === 'object' && v.value != null) {
      const n = Number(v.value);
      return Number.isFinite(n) ? n : defVal;
    }
    return defVal;
  } catch {
    return defVal;
  }
}

// Compute standard and actuals for a project from costingId
async function computePnl(costingId) {
  const costing = await prisma.projectCosting.findUnique({ where: { id: costingId }, include: { components: true } });
  if (!costing) return null;
  const projectId = costing.projectId;

  // Planned/standard from CostComponents
  const standardByCat = {};
  for (const c of costing.components || []) {
    const cat = c.category || 'other';
    const total = c.totalCost != null ? Number(c.totalCost) : (Number(c.quantity || 0) * Number(c.costPerUnit || 0));
    standardByCat[cat] = (standardByCat[cat] || 0) + (Number.isFinite(total) ? total : 0);
  }
  const standard = {
    material: Number(standardByCat['material'] || 0),
    labor: Number(standardByCat['labor'] || 0),
    overhead: Number(standardByCat['overhead'] || 0),
    logistics: Number(standardByCat['logistics'] || 0),
    tooling: Number(standardByCat['tooling'] || 0),
    other: Number(standardByCat['misc'] || standardByCat['other'] || 0),
  };
  standard.total = Object.values(standard).reduce((a, b) => a + b, 0);

  // Actuals
  const [consumptions, materials, shifts, maintenance] = await Promise.all([
    prisma.materialConsumption.findMany({ where: { projectId } }),
    prisma.material.findMany(),
    prisma.shiftEntry.findMany({ where: { projectId, status: { in: ['submitted', 'approved'] } } }),
    prisma.maintenanceLog.findMany({ where: { station: { projectId } } }).catch(() => []),
  ]);

  const materialPriceById = new Map(materials.map(m => [m.id, Number(m.costPerUnit || 0)]));
  let actualMaterial = 0;
  for (const c of consumptions) {
    const unitCost = materialPriceById.get(c.materialId) || 0;
    const qty = Number(c.actualQty ?? c.plannedQty ?? 0);
    actualMaterial += qty * unitCost;
  }

  // Labor: derive from shifts using workersPresent * hours * rate
  const laborRate = await loadNumberSetting('laborHourlyRate', 15);
  let actualLabor = 0;
  for (const s of shifts) {
    const durationHrs = Math.max(0, ((new Date(s.shiftEndTime) - new Date(s.shiftStartTime)) || 0) / 3600000);
    const workers = Number(s.workersPresent || 0);
    actualLabor += durationHrs * workers * laborRate;
  }

  // Overhead: maintenance cost + overheadRatePct * (material + labor)
  const overheadRate = (await loadNumberSetting('overheadRatePct', 25)) / 100;
  const maintenanceCost = maintenance.reduce((sum, m) => sum + Number(m.cost || 0), 0);
  const actualOverhead = maintenanceCost + overheadRate * (actualMaterial + actualLabor);

  const actual = {
    material: actualMaterial,
    labor: actualLabor,
    overhead: actualOverhead,
    logistics: 0,
    tooling: 0,
    other: 0,
  };
  actual.total = Object.values(actual).reduce((a, b) => a + b, 0);

  return { projectId, costing, standard, actual };
}

// GET /api/costing/:id/pnl - Standard vs Actual comparison for UI tile
router.get('/:id/pnl', async (req, res) => {
  try {
    const id = String(req.params.id);
    const data = await computePnl(id);
    if (!data) return res.status(404).json({ error: 'Costing not found' });

    const { costing, standard, actual } = data;
    const response = {
      costingId: costing.id,
      exFactory: Number(costing.exFactoryCost || standard.total || 0),
      materialCostStandard: standard.material,
      materialCostActual: actual.material,
      materialVariance: (actual.material - standard.material),
      laborCostStandard: standard.labor,
      laborCostActual: actual.labor,
      laborVariance: (actual.labor - standard.labor),
      totalVariance: (actual.total - standard.total),
    };
    res.json(response);
  } catch (e) {
    console.error('costing:pnl', e);
    res.status(500).json({ error: 'Failed to compute P&L' });
  }
});

// GET /api/costing/:id/variance - Explicit variance endpoint with category breakdown
router.get('/:id/variance', async (req, res) => {
  try {
    const id = String(req.params.id);
    const data = await computePnl(id);
    if (!data) return res.status(404).json({ error: 'Costing not found' });
    const { projectId, standard, actual } = data;

    const keys = ['material', 'labor', 'overhead', 'logistics', 'tooling', 'other'];
    const variance = Object.fromEntries(keys.map(k => [k, Number((actual[k] || 0) - (standard[k] || 0))]));
    variance.total = Number(actual.total - standard.total);

    const variancePct = Object.fromEntries(keys.map(k => [k, standard[k] ? ((variance[k] / standard[k]) * 100) : null]));

    res.json({ projectId, standard, actual, variance, variancePct });
  } catch (e) {
    console.error('costing:variance', e);
    res.status(500).json({ error: 'Failed to compute variance' });
  }
});

module.exports = router;
