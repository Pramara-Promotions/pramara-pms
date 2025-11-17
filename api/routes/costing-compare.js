const express = require('express');
const { authenticate: requireAuth } = require('../middleware/auth');
const costingService = require('../services/costingService');

const router = express.Router();

router.use(requireAuth);

// GET /api/costing/compare?ids=a,b,c
router.get('/compare', async (req, res) => {
  try {
    const idsParam = req.query.ids || '';
    const ids = String(idsParam).split(',').map(s => s.trim()).filter(Boolean);
    if (!ids.length) return res.status(400).json({ error: 'ids query param required' });
    const report = await costingService.compareScenarios(ids);
    res.json(report);
  } catch (e) {
    console.error('costing:compare', e);
    res.status(500).json({ error: 'Failed to compare scenarios' });
  }
});

// POST /api/costing/:id/what-if { deltas: [{componentId?, add?:component, update?:fields, remove?:id}], volume?:number }
router.post('/:id/what-if', async (req, res) => {
  try {
    const { deltas = [], volume } = req.body || {};
    const costingId = String(req.params.id);

    // Simulate in-memory changes by cloning current costing components
    const prisma = costingService._prisma;
    const costing = await prisma.projectCosting.findUnique({ where: { id: costingId }, include: { components: true } });
    if (!costing) return res.status(404).json({ error: 'Costing not found' });

    let components = JSON.parse(JSON.stringify(costing.components));

    for (const d of deltas) {
      if (d.add) {
        components.push({ ...d.add, totalCost: (d.add.quantity || 0) * (d.add.unitCost || 0) });
      } else if (d.update && d.componentId) {
        components = components.map(c => {
          if (c.id !== d.componentId) return c;
          const newQty = (d.update.quantity ?? c.quantity) ?? 0;
          const newUnit = (d.update.unitCost ?? c.unitCost) ?? 0;
          return { ...c, ...d.update, totalCost: newQty * newUnit };
        });
      } else if (d.remove && d.componentId) {
        components = components.filter(c => c.id !== d.componentId);
      }
    }

    const exFactory = components.reduce((sum, c) => sum + (c.totalCost || 0), 0);
    const qty = volume != null ? Number(volume) : (await prisma.project.findUnique({ where: { id: costing.projectId }, select: { quantity: true } }))?.quantity || 0;
    const unitCost = qty > 0 ? exFactory / qty : 0;
    res.json({ simulated: true, exFactory, unitCost, componentCount: components.length, volume: qty });
  } catch (e) {
    console.error('costing:what-if', e);
    res.status(500).json({ error: 'Failed to simulate what-if' });
  }
});

module.exports = router;
 
// --- Advisory Extensions ---
// GET /api/costing/:id/sensitivity?range=10
// Varies material and labor costs by +/- range% and returns unit cost sensitivity
router.get('/:id/sensitivity', async (req, res) => {
  try {
    const prisma = costingService._prisma;
    const id = String(req.params.id);
    const range = Number(req.query.range ?? 10);
    const costing = await prisma.projectCosting.findUnique({ where: { id } });
    if (!costing) return res.status(404).json({ error: 'Costing not found' });
    const components = await prisma.costComponent.findMany({ where: { projectCostingId: id } });

    const material = components.filter(c => (c.category || '').toLowerCase() === 'material').reduce((s,c)=>s+(c.totalCost||0),0);
    const labor = components.filter(c => (c.category || '').toLowerCase() === 'labor').reduce((s,c)=>s+(c.totalCost||0),0);
    const other = components.filter(c => !['material','labor'].includes((c.category||'').toLowerCase())).reduce((s,c)=>s+(c.totalCost||0),0);
    const qty = (await prisma.project.findUnique({ where: { id: costing.projectId }, select: { quantity: true } }))?.quantity || 0;

    function unit(materialDeltaPct, laborDeltaPct){
      const m = material * (1 + materialDeltaPct/100);
      const l = labor * (1 + laborDeltaPct/100);
      const total = m + l + other;
      return qty>0 ? total/qty : 0;
    }

    const baseline = unit(0,0);
    const plus = unit(range, range);
    const minus = unit(-range, -range);

    res.json({ rangePct: range, baselineUnitCost: baseline, unitCostMinus: minus, unitCostPlus: plus, deltas: { up: plus - baseline, down: minus - baseline } });
  } catch (e) {
    console.error('costing:sensitivity', e);
    res.status(500).json({ error: 'Failed to compute sensitivity' });
  }
});

// GET /api/costing/:id/roi?amortUnits=10000
// Computes ROI and amortization impact using tooling cost over amortUnits
router.get('/:id/roi', async (req, res) => {
  try {
    const prisma = costingService._prisma;
    const id = String(req.params.id);
    const amortUnits = Number(req.query.amortUnits ?? 10000);
    const costing = await prisma.projectCosting.findUnique({ where: { id } });
    if (!costing) return res.status(404).json({ error: 'Costing not found' });
    const components = await prisma.costComponent.findMany({ where: { projectCostingId: id } });
    const tooling = components.filter(c => (c.category || '').toLowerCase() === 'tooling').reduce((s,c)=>s+(c.totalCost||0),0);
    const exFactory = components.reduce((s,c)=>s+(c.totalCost||0),0);
    const qty = (await prisma.project.findUnique({ where: { id: costing.projectId }, select: { quantity: true } }))?.quantity || 0;
    const unitCost = qty>0 ? exFactory/qty : 0;
    const amortPerUnit = amortUnits>0 ? tooling / amortUnits : 0;
    const unitCostWithAmort = unitCost + amortPerUnit;
    const marginPercent = costing.sellingPrice && unitCostWithAmort>0 ? ((costing.sellingPrice - unitCostWithAmort)/unitCostWithAmort)*100 : null;
    res.json({ amortUnits, tooling, amortPerUnit, unitCost, unitCostWithAmort, sellingPrice: costing.sellingPrice, impliedMarginPercent: marginPercent });
  } catch (e) {
    console.error('costing:roi', e);
    res.status(500).json({ error: 'Failed to compute ROI' });
  }
});

// POST /api/costing/:id/convert-currency { fxRate, currency }
router.post('/:id/convert-currency', async (req, res) => {
  try {
    const prisma = costingService._prisma;
    const id = String(req.params.id);
    const { fxRate, currency } = req.body || {};
    const rate = Number(fxRate);
    if (!rate || !currency) return res.status(400).json({ error: 'fxRate and currency required' });
    const costing = await prisma.projectCosting.findUnique({ where: { id }, include: { pricingTiers: true } });
    if (!costing) return res.status(404).json({ error: 'Costing not found' });

    const exFactory = (costing.exFactoryCost || 0) * rate;
    const selling = (costing.sellingPrice || 0) * rate;
    const tiers = (costing.pricingTiers || []).map(t => ({ id: t.id, minQty: t.minQty, pricePerUnit: (t.pricePerUnit || 0) * rate, currency }));
    res.json({ currency, fxRate: rate, exFactory, sellingPrice: selling, tiers });
  } catch (e) {
    console.error('costing:convert-currency', e);
    res.status(500).json({ error: 'Failed to convert currency' });
  }
});
