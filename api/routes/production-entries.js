const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// GET /api/production-entries - List all production entries
router.get('/', async (req, res) => {
  try {
    const { projectId, stationId, batchCode, startDate, endDate } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (stationId) where.stationId = parseInt(stationId);
    if (batchCode) where.batchCode = { contains: batchCode, mode: 'insensitive' };
    
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    if (Object.keys(dateFilter).length > 0) where.startTime = dateFilter;

    const entries = await prisma.productionEntry.findMany({
      where,
      include: {
        Project: { select: { id: true, name: true } },
        Station: { select: { id: true, name: true, code: true } },
        Shift: { select: { id: true, name: true } },
        MaterialConsumption: {
          select: {
            materialName: true,
            quantityUsed: true,
            unit: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    res.json(entries);
  } catch (error) {
    console.error('Error fetching production entries:', error);
    res.status(500).json({ error: 'Failed to fetch production entries' });
  }
});

// GET /api/production-entries/:id - Get single production entry
router.get('/:id', async (req, res) => {
  try {
    const entry = await prisma.productionEntry.findUnique({
      where: { id: req.params.id },
      include: {
        Project: { select: { id: true, name: true } },
        Station: { select: { id: true, name: true, code: true } },
        Shift: { select: { id: true, name: true, startTime: true, endTime: true } },
        MaterialConsumption: true,
      },
    });

    if (!entry) {
      return res.status(404).json({ error: 'Production entry not found' });
    }

    res.json(entry);
  } catch (error) {
    console.error('Error fetching production entry:', error);
    res.status(500).json({ error: 'Failed to fetch production entry' });
  }
});

// POST /api/production-entries - Create new production entry
router.post('/', async (req, res) => {
  try {
    const {
      projectId,
      stationId,
      shiftId,
      batchCode,
      batchId,
      workerId,
      quantityProduced,
      defectQuantity,
      stage,
      startTime,
      endTime,
      targetQty,
      actualQty,
      rejectedQty,
      materialUsed,
      notes,
      operatorId,
    } = req.body;

    const resolvedProjectId = Number(projectId);
    const resolvedStationId = Number(stationId);
    const resolvedBatchCode = batchCode || batchId || `BATCH-${Date.now()}`;
    const resolvedTargetQty = Number(targetQty ?? quantityProduced ?? 0);
    const resolvedActualQty = Number(actualQty ?? quantityProduced ?? 0);
    const resolvedRejectedQty = Number(rejectedQty ?? defectQuantity ?? 0);
    const resolvedOperatorId = operatorId || workerId || req.user.id;

    // Ensure a shift exists - create default if none provided
    let resolvedShiftId = shiftId;
    if (!resolvedShiftId) {
      const existingShift = await prisma.shift.findFirst({ where: { active: true } });
      if (existingShift) {
        resolvedShiftId = existingShift.id;
      } else {
        const defaultShift = await prisma.shift.create({
          data: {
            id: `SHIFT-${Date.now()}`,
            name: 'Default Shift',
            startTime: '08:00',
            endTime: '16:00',
            breakDuration: 30,
            active: true,
            updatedAt: new Date(),
          },
        });
        resolvedShiftId = defaultShift.id;
      }
    }

    const outputVariance = resolvedTargetQty > 0 
      ? ((resolvedActualQty - resolvedTargetQty) / resolvedTargetQty) * 100 
      : 0;

    const entry = await prisma.productionEntry.create({
      data: {
        id: `PE-${Date.now()}`,
        projectId: resolvedProjectId,
        stationId: resolvedStationId,
        shiftId: resolvedShiftId,
        batchCode: resolvedBatchCode,
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : null,
        targetQty: resolvedTargetQty,
        actualQty: resolvedActualQty,
        rejectedQty: resolvedRejectedQty,
        materialUsed: materialUsed || {},
        outputVariance,
        notes: notes || (stage ? `Stage: ${stage}` : null),
        operatorId: resolvedOperatorId,
      },
      include: {
        Project: { select: { id: true, name: true } },
        Station: { select: { id: true, name: true } },
        Shift: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error('Error creating production entry:', error);
    res.status(500).json({ error: 'Failed to create production entry' });
  }
});

// PUT /api/production-entries/:id - Update production entry
router.put('/:id', async (req, res) => {
  try {
    const {
      endTime,
      targetQty,
      actualQty,
      rejectedQty,
      materialUsed,
      notes,
    } = req.body;

    const updateData = {};
    if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null;
    if (targetQty !== undefined) updateData.targetQty = parseInt(targetQty);
    if (actualQty !== undefined) updateData.actualQty = parseInt(actualQty);
    if (rejectedQty !== undefined) updateData.rejectedQty = parseInt(rejectedQty);
    if (materialUsed !== undefined) updateData.materialUsed = materialUsed;
    if (notes !== undefined) updateData.notes = notes;

    if (targetQty !== undefined && actualQty !== undefined) {
      const target = parseInt(targetQty);
      const actual = parseInt(actualQty);
      updateData.outputVariance = target > 0 ? ((actual - target) / target) * 100 : 0;
    }

    const entry = await prisma.productionEntry.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        Project: { select: { id: true, name: true } },
        Station: { select: { id: true, name: true } },
        Shift: { select: { id: true, name: true } },
      },
    });

    res.json(entry);
  } catch (error) {
    console.error('Error updating production entry:', error);
    res.status(500).json({ error: 'Failed to update production entry' });
  }
});

// DELETE /api/production-entries/:id - Delete production entry
router.delete('/:id', async (req, res) => {
  try {
    await prisma.productionEntry.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Production entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting production entry:', error);
    res.status(500).json({ error: 'Failed to delete production entry' });
  }
});

// GET /api/production-entries/analytics/summary - Production analytics
router.get('/analytics/summary', async (req, res) => {
  try {
    const { projectId, stationId, startDate, endDate } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (stationId) where.stationId = parseInt(stationId);
    
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    if (Object.keys(dateFilter).length > 0) where.startTime = dateFilter;

    const [totalEntries, productionStats] = await Promise.all([
      prisma.productionEntry.count({ where }),
      prisma.productionEntry.aggregate({
        where,
        _sum: {
          targetQty: true,
          actualQty: true,
          rejectedQty: true,
        },
        _avg: {
          outputVariance: true,
        },
      }),
    ]);

    const totalTarget = productionStats._sum.targetQty || 0;
    const totalProduced = productionStats._sum.actualQty || 0;
    const totalRejected = productionStats._sum.rejectedQty || 0;
    const approvedQty = totalProduced - totalRejected;
    const efficiency = totalTarget > 0 ? (totalProduced / totalTarget) * 100 : 0;
    const qualityRate = totalProduced > 0 ? (approvedQty / totalProduced) * 100 : 0;

    res.json({
      totalEntries,
      totalTarget,
      totalProduced,
      totalRejected,
      approvedQty,
      efficiency,
      qualityRate,
      avgVariance: productionStats._avg.outputVariance || 0,
    });
  } catch (error) {
    console.error('Error fetching production analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
