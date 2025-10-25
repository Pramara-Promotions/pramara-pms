const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authGuard } = require('../middleware/authGuard');
const { calculateProduction, calculateOutputVariance } = require('../lib/calculationEngine');
const router = express.Router();
const prisma = new PrismaClient();

// ProcessConfig CRUD
router.get('/configs', authGuard, async (req, res) => {
  try {
    const { stationId, projectId, projectSkuId } = req.query;
    const where = {};
    if (stationId) where.stationId = parseInt(stationId);
    if (projectId) where.projectId = parseInt(projectId);
    if (projectSkuId) where.projectSkuId = parseInt(projectSkuId);

    const configs = await prisma.processConfig.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(configs);
  } catch (e) {
    console.error('production:configs:list', e);
    res.status(500).json({ error: 'Failed to fetch process configs' });
  }
});

router.post('/configs', authGuard, async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.stationId || !data.stationType) return res.status(400).json({ error: 'stationId and stationType required' });
    data.stationId = parseInt(data.stationId);
    if (data.projectId) data.projectId = parseInt(data.projectId);
    if (data.projectSkuId) data.projectSkuId = parseInt(data.projectSkuId);

    const config = await prisma.processConfig.create({ data });
    res.status(201).json(config);
  } catch (e) {
    console.error('production:configs:create', e);
    res.status(500).json({ error: 'Failed to create process config' });
  }
});

router.put('/configs/:id', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body || {};
    if (data.stationId) data.stationId = parseInt(data.stationId);
    if (data.projectId) data.projectId = parseInt(data.projectId);
    if (data.projectSkuId) data.projectSkuId = parseInt(data.projectSkuId);

    const config = await prisma.processConfig.update({ where: { id: String(id) }, data });
    res.json(config);
  } catch (e) {
    console.error('production:configs:update', e);
    res.status(500).json({ error: 'Failed to update process config' });
  }
});

// Production Calculation (uses calculationEngine)
router.post('/calculate', authGuard, async (req, res) => {
  try {
    const { processConfigId, targetQty, shiftHours = 8 } = req.body;
    if (!processConfigId || !targetQty) return res.status(400).json({ error: 'processConfigId and targetQty required' });

    const config = await prisma.processConfig.findUnique({ where: { id: String(processConfigId) } });
    if (!config) return res.status(404).json({ error: 'Process config not found' });

    const calc = calculateProduction(config, parseInt(targetQty), parseFloat(shiftHours));

    const created = await prisma.productionCalculation.create({
      data: {
        projectId: config.projectId || 0,
        stationId: config.stationId,
        processConfigId: config.id,
        targetQty: parseInt(targetQty),
        outputPerHour: calc.outputPerHour,
        outputPerShift: calc.outputPerShift,
        outputPerDay: calc.outputPerDay,
        totalTimeRequired: calc.hoursRequired,
        machinesRequired: calc.machinesRequired,
        shiftsRequired: calc.shiftsRequired,
        materialConsumption: calc.materialConsumption,
      },
    });
    res.status(201).json({ ...created, calc });
  } catch (e) {
    console.error('production:calculate', e);
    res.status(500).json({ error: 'Failed to calculate production' });
  }
});

// Production Entry (log actual output)
router.post('/entries', authGuard, async (req, res) => {
  try {
    const { projectId, stationId, shiftId, startTime, endTime, targetQty, actualQty, rejectedQty = 0, batchCode = null, materialUsed = {} } = req.body;
    if (!projectId || !stationId || !shiftId || !startTime || targetQty === undefined || actualQty === undefined) {
      return res.status(400).json({ error: 'projectId, stationId, shiftId, startTime, targetQty, actualQty are required' });
    }

    const variance = calculateOutputVariance(parseInt(actualQty), parseInt(targetQty), parseInt(rejectedQty || 0));

    const entry = await prisma.productionEntry.create({
      data: {
        projectId: parseInt(projectId),
        stationId: parseInt(stationId),
        shiftId: String(shiftId),
        batchCode: batchCode || null,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        targetQty: parseInt(targetQty),
        actualQty: parseInt(actualQty),
        rejectedQty: parseInt(rejectedQty || 0),
        materialUsed,
        materialVariance: null,
        outputVariance: variance.outputVariance,
        operatorId: req.auth?.user?.id || null,
        notes: req.body.notes || null,
      },
    });

    res.status(201).json({ entry, variance });
  } catch (e) {
    console.error('production:entries:create', e);
    res.status(500).json({ error: 'Failed to create production entry' });
  }
});

router.get('/entries', authGuard, async (req, res) => {
  try {
    const { projectId, stationId, date } = req.query;
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (stationId) where.stationId = parseInt(stationId);
    if (date) {
      const d = new Date(String(date));
      const start = new Date(d); start.setHours(0,0,0,0);
      const end = new Date(d); end.setHours(23,59,59,999);
      where.startTime = { gte: start, lte: end };
    }
    const entries = await prisma.productionEntry.findMany({ where, orderBy: { startTime: 'desc' } });
    res.json(entries);
  } catch (e) {
    console.error('production:entries:list', e);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Variance Report
router.get('/variance', authGuard, async (req, res) => {
  try {
    const { projectId, stationId, from, to } = req.query;
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (stationId) where.stationId = parseInt(stationId);
    if (from || to) {
      where.startTime = {};
      if (from) where.startTime.gte = new Date(String(from));
      if (to) where.startTime.lte = new Date(String(to));
    }
    const entries = await prisma.productionEntry.findMany({ where });
    const summary = entries.reduce((acc, e) => {
      acc.entries++;
      acc.targetQty += e.targetQty;
      acc.actualQty += e.actualQty;
      acc.rejectedQty += e.rejectedQty;
      acc.outputVariance += e.outputVariance;
      return acc;
    }, { entries: 0, targetQty: 0, actualQty: 0, rejectedQty: 0, outputVariance: 0 });
    res.json({ summary, efficiency: summary.targetQty ? Math.round((summary.actualQty / summary.targetQty) * 1000)/10 : 0 });
  } catch (e) {
    console.error('production:variance', e);
    res.status(500).json({ error: 'Failed to compute variance' });
  }
});

// Capacity Planning
router.get('/capacity', authGuard, async (req, res) => {
  try {
    const { stationId, date, shiftHours = 8 } = req.query;
    if (!stationId) return res.status(400).json({ error: 'stationId required' });
    const configs = await prisma.processConfig.findMany({ where: { stationId: parseInt(stationId) } });
    const capacity = configs.map(cfg => ({
      processConfigId: cfg.id,
      stationType: cfg.stationType,
      metrics: calculateProduction(cfg, 1, parseFloat(shiftHours)),
    }));
    res.json({ date: date || new Date(), capacity });
  } catch (e) {
    console.error('production:capacity', e);
    res.status(500).json({ error: 'Failed to compute capacity' });
  }
});

module.exports = router;
