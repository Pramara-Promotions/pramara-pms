const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authGuard } = require('../middleware/authGuard');
const { suggestWorkersForStation, generateAdaptationSuggestion, learnFromOverride } = require('../lib/learningEngine');
const { calculateProduction } = require('../lib/calculationEngine');
const router = express.Router();
const prisma = new PrismaClient();

// Generate 3 scenarios
router.post('/generate', authGuard, async (req, res) => {
  try {
    const { date, projectIds = [], factoryId = null, shiftHours = 8 } = req.body;
    if (!date) return res.status(400).json({ error: 'date is required' });
    const planDate = new Date(date);

    // Get stations relevant to projects or factory
    let stations = [];
    if (factoryId) {
      stations = await prisma.station.findMany({
        where: { Room: { Section: { Floor: { factoryId: parseInt(factoryId) } } } },
        include: { StationType: true },
      });
    } else if (projectIds.length > 0) {
      stations = await prisma.station.findMany({
        where: { projectId: { in: projectIds.map(p => parseInt(p)) } },
        include: { StationType: true },
      });
    } else {
      stations = await prisma.station.findMany({ include: { StationType: true } });
    }

    // Fetch configs
    const stationIds = stations.map(s => s.id);
    const configs = await prisma.processConfig.findMany({ where: { stationId: { in: stationIds } } });
    const cfgByStation = new Map(configs.map(c => [c.stationId, c]));

    // Helper to build scenario with a scoring strategy
    async function buildScenario(scenario) {
      const items = [];
      for (const st of stations) {
        const cfg = cfgByStation.get(st.id);
        if (!cfg) continue;
        const targetQty = 100; // baseline target; could be derived per project
        const calc = calculateProduction(cfg, targetQty, shiftHours);
        const suggestions = await suggestWorkersForStation(st.id, null, planDate, 3).catch(() => []);

        // Simple material requirements from calc
        const materialsRequired = calc.materialConsumption || {};

        // Check material availability (simple sum on Material table; no lots)
        const shortages = [];
        for (const [matKey, spec] of Object.entries(materialsRequired)) {
          // Attempt to map material name to a Material by name
          const mat = await prisma.material.findFirst({ where: { name: { contains: matKey, mode: 'insensitive' } } });
          if (!mat) continue;
          const available = mat.stockQty - mat.reservedQty;
          if (available < spec.quantity) {
            shortages.push({ materialId: mat.id, materialName: mat.name, requiredQty: spec.quantity, availableQty: available });
          }
        }

        items.push({
          stationId: st.id,
          stationName: st.name,
          stationType: st.StationType?.code,
          targetQty,
          expectedOutput: calc.outputPerShift,
          materialsRequired,
          shortages,
          workerSuggestions: suggestions,
        });
      }

      // Basic aggregates
      const totalTargetQty = items.reduce((s, i) => s + i.targetQty, 0);
      const totalExpectedOutput = items.reduce((s, i) => s + i.expectedOutput, 0);
      return {
        scenario,
        date: planDate,
        stations: items,
        totalTargetQty,
        totalExpectedOutput,
        estimatedCost: null,
        risks: items.flatMap(i => i.shortages.map(s => ({ stationId: i.stationId, ...s }))),
      };
    }

    const fastest = await buildScenario('fastest');
    const cheapest = await buildScenario('cheapest');
    const balanced = await buildScenario('balanced');

    res.json([fastest, cheapest, balanced]);
  } catch (e) {
    console.error('daily-plans:generate', e);
    res.status(500).json({ error: 'Failed to generate scenarios' });
  }
});

// DailyPlan CRUD
router.get('/', authGuard, async (req, res) => {
  try {
    const { date, factoryId } = req.query;
    const where = {};
    if (date) {
      const d = new Date(String(date));
      const start = new Date(d); start.setHours(0,0,0,0);
      const end = new Date(d); end.setHours(23,59,59,999);
      where.date = { gte: start, lte: end };
    }
    if (factoryId) where.factoryId = parseInt(factoryId);
    const plans = await prisma.dailyPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { stations: true, shiftPlans: true, adaptations: true },
    });
    res.json(plans);
  } catch (e) {
    console.error('daily-plans:list', e);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

router.post('/', authGuard, async (req, res) => {
  try {
    const { date, factoryId, scenario = 'balanced', generatedBy = 'system', stations = [], totalTargetQty = 0, totalExpectedOutput = 0, estimatedCost = null, reasoning = null, riskFactors = [] } = req.body;
    if (!date) return res.status(400).json({ error: 'date required' });

    const created = await prisma.dailyPlan.create({
      data: {
        date: new Date(date),
        factoryId: factoryId ? parseInt(factoryId) : null,
        scenario,
        generatedBy,
        totalTargetQty: parseInt(totalTargetQty) || 0,
        totalExpectedOutput: parseInt(totalExpectedOutput) || 0,
        estimatedCost,
        reasoning,
        riskFactors,
        stations: stations.length ? {
          create: stations.map(st => ({
            stationId: parseInt(st.stationId),
            projectId: parseInt(st.projectId),
            projectSkuId: st.projectSkuId ? parseInt(st.projectSkuId) : null,
            targetQty: parseInt(st.targetQty),
            shiftId: st.shiftId || null,
            assignedWorkers: st.assignedWorkers || [],
            workerAssignmentReason: st.workerAssignmentReason || null,
            materialsRequired: st.materialsRequired || {},
          })),
        } : undefined,
      },
      include: { stations: true },
    });
    res.status(201).json(created);
  } catch (e) {
    console.error('daily-plans:create', e);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

router.put('/:id/approve', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    // Reserve materials and create shift plans
    const plan = await prisma.dailyPlan.update({
      where: { id: String(id) },
      data: { status: 'active', approvedAt: new Date(), approvedBy: req.auth?.user?.id || null },
      include: { stations: true },
    });

    // Reserve materials
    for (const st of plan.stations) {
      for (const [materialId, qty] of Object.entries(st.materialsRequired || {})) {
        await prisma.materialReservation.create({
          data: {
            materialId: String(materialId),
            dailyPlanId: plan.id,
            stationId: st.stationId,
            reservedQty: Number(qty),
            reservedBy: req.auth?.user?.id || 'system',
          },
        });
      }
    }

    // Create shift plans
    const createdShiftPlans = [];
    for (const st of plan.stations) {
      const date = plan.date;
      const shiftId = st.shiftId || (req.body.defaultShiftId || null);
      for (const workerId of st.assignedWorkers || []) {
        const sp = await prisma.shiftPlan.create({
          data: {
            dailyPlanId: plan.id,
            shiftId: String(shiftId),
            workerId: String(workerId),
            stationId: st.stationId,
            date,
            assignedBy: req.auth?.user?.id || null,
            assignmentReason: 'auto_suggested',
          },
        });
        createdShiftPlans.push(sp);
      }
    }

    res.json({ plan, shiftPlans: createdShiftPlans });
  } catch (e) {
    console.error('daily-plans:approve', e);
    res.status(500).json({ error: 'Failed to approve plan' });
  }
});

// DailyPlanStation CRUD
router.post('/:planId/stations', authGuard, async (req, res) => {
  try {
    const { planId } = req.params;
    const st = req.body;
    const created = await prisma.dailyPlanStation.create({
      data: {
        dailyPlanId: String(planId),
        stationId: parseInt(st.stationId),
        projectId: parseInt(st.projectId),
        projectSkuId: st.projectSkuId ? parseInt(st.projectSkuId) : null,
        targetQty: parseInt(st.targetQty),
        shiftId: st.shiftId || null,
        assignedWorkers: st.assignedWorkers || [],
        workerAssignmentReason: st.workerAssignmentReason || null,
        materialsRequired: st.materialsRequired || {},
      },
    });
    res.status(201).json(created);
  } catch (e) {
    console.error('daily-plans:stations:create', e);
    res.status(500).json({ error: 'Failed to add station to plan' });
  }
});

router.put('/stations/:id', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const before = await prisma.dailyPlanStation.findUnique({ where: { id: String(id) } });
    const updated = await prisma.dailyPlanStation.update({ where: { id: String(id) }, data: updates });

    // Learn from override if workers changed
    if (updates.assignedWorkers && before) {
      const beforeSet = new Set(before.assignedWorkers || []);
      const afterSet = new Set(updates.assignedWorkers || []);
      const added = [...afterSet].filter(w => !beforeSet.has(w));
      if (added.length > 0) {
        await learnFromOverride(req.auth?.user?.id || 'planner', 'worker_assignment', { stationId: before.stationId }, (before.assignedWorkers || [])[0] || null, added[0]);
      }
    }

    res.json(updated);
  } catch (e) {
    console.error('daily-plans:stations:update', e);
    res.status(500).json({ error: 'Failed to update station assignment' });
  }
});

// Material Validation
router.post('/:planId/validate-materials', authGuard, async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await prisma.dailyPlan.findUnique({ where: { id: String(planId) }, include: { stations: true } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const shortages = [];
    for (const st of plan.stations) {
      for (const [materialId, qty] of Object.entries(st.materialsRequired || {})) {
        const mat = await prisma.material.findUnique({ where: { id: String(materialId) } });
        if (!mat) continue;
        const available = mat.stockQty - mat.reservedQty;
        if (available < Number(qty)) {
          shortages.push({ stationId: st.stationId, materialId, requiredQty: Number(qty), availableQty: available });
        }
      }
    }
    if (shortages.length === 0) return res.json({ ok: true });
    res.json({ shortages });
  } catch (e) {
    console.error('daily-plans:validate-materials', e);
    res.status(500).json({ error: 'Failed to validate materials' });
  }
});

// Worker Suggestions
router.get('/suggest-workers', authGuard, async (req, res) => {
  try {
    const { stationId, shiftId, date } = req.query;
    if (!stationId) return res.status(400).json({ error: 'stationId required' });
    const suggestions = await suggestWorkersForStation(parseInt(stationId), shiftId ? String(shiftId) : null, date ? new Date(String(date)) : new Date());
    res.json(suggestions);
  } catch (e) {
    console.error('daily-plans:suggest-workers', e);
    res.status(500).json({ error: 'Failed to get worker suggestions' });
  }
});

// Adaptations
router.post('/:planId/adapt', authGuard, async (req, res) => {
  try {
    const { planId } = req.params;
    const { stationId, targetQty, actualQty } = req.body;
    const variance = parseInt(actualQty) - parseInt(targetQty);
    const suggestion = await generateAdaptationSuggestion(String(planId), { stationId: parseInt(stationId), targetQty: parseInt(targetQty), actualQty: parseInt(actualQty), variance });
    if (!suggestion) return res.json({ message: 'No adaptation needed' });
    const created = await prisma.planAdaptation.create({
      data: {
        dailyPlanId: String(planId),
        trigger: suggestion.trigger,
        affectedStationId: suggestion.affectedStationId || null,
        systemSuggestion: suggestion.systemSuggestion,
      },
    });
    res.status(201).json(created);
  } catch (e) {
    console.error('daily-plans:adapt', e);
    res.status(500).json({ error: 'Failed to create adaptation' });
  }
});

router.get('/:planId/adaptations', authGuard, async (req, res) => {
  try {
    const { planId } = req.params;
    const items = await prisma.planAdaptation.findMany({ where: { dailyPlanId: String(planId) }, orderBy: { createdAt: 'desc' } });
    res.json(items);
  } catch (e) {
    console.error('daily-plans:adaptations:list', e);
    res.status(500).json({ error: 'Failed to fetch adaptations' });
  }
});

router.post('/adaptations/:id/resolve', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, reason } = req.body;
    const updated = await prisma.planAdaptation.update({
      where: { id: String(id) },
      data: { plannerDecision: decision, plannerReason: reason || null, resolvedAt: new Date() },
    });

    // Learn from decision
    await learnFromOverride(req.auth?.user?.id || 'planner', 'scenario_choice', { type: 'adaptation' }, 'system_suggested', decision);

    res.json(updated);
  } catch (e) {
    console.error('daily-plans:adaptations:resolve', e);
    res.status(500).json({ error: 'Failed to resolve adaptation' });
  }
});

module.exports = router;
