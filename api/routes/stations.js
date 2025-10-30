const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// GET /api/stations - List all stations with filters
router.get('/', async (req, res) => {
  try {
    const { projectId, status, stationTypeId, search } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (status) where.status = status;
    if (stationTypeId) where.stationTypeId = parseInt(stationTypeId);
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const stations = await prisma.station.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        StationType: { select: { id: true, name: true } },
        Room: { select: { id: true, name: true } },
        _count: {
          select: {
            ProductionEntry: true,
            QCSubmission: true,
            MaintenanceLog: true,
            shiftEntries: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });

    res.json(stations);
  } catch (error) {
    console.error('Error fetching stations:', error);
    res.status(500).json({ error: 'Failed to fetch stations' });
  }
});

// GET /api/stations/:id - Get single station details
router.get('/:id', async (req, res) => {
  try {
    const station = await prisma.station.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        project: { select: { id: true, name: true } },
        StationType: { select: { id: true, name: true, category: true } },
        Room: { select: { id: true, name: true, floor: true } },
        processOperations: {
          include: {
            processFlow: { select: { id: true, flowName: true } },
          },
          orderBy: { sequence: 'asc' },
        },
        _count: {
          select: {
            ProductionEntry: true,
            QCSubmission: true,
            MaintenanceLog: true,
            shiftEntries: true,
            wipLedgers: true,
          },
        },
      },
    });

    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    res.json(station);
  } catch (error) {
    console.error('Error fetching station:', error);
    res.status(500).json({ error: 'Failed to fetch station' });
  }
});

// POST /api/stations - Create new station
router.post('/', async (req, res) => {
  try {
    const {
      projectId,
      name,
      code,
      description,
      stationTypeId,
      roomId,
      capacity,
      status,
      active,
    } = req.body;

    const station = await prisma.station.create({
      data: {
        projectId: projectId ? parseInt(projectId) : null,
        name,
        code,
        description,
        stationTypeId: stationTypeId ? parseInt(stationTypeId) : null,
        roomId: roomId ? parseInt(roomId) : null,
        capacity: capacity ? parseInt(capacity) : 1,
        status: status || 'operational',
        active: active !== undefined ? active : true,
        updatedAt: new Date(),
      },
      include: {
        project: { select: { id: true, name: true } },
        StationType: { select: { id: true, name: true } },
        Room: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(station);
  } catch (error) {
    console.error('Error creating station:', error);
    res.status(500).json({ error: 'Failed to create station' });
  }
});

// PUT /api/stations/:id - Update station (enhanced fields)
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      stationTypeId,
      roomId,
      capacity,
      status,
      active,
      avgOutputRate,
      avgQualityRate,
      // Enhanced fields
      workstationType,
      isMultiAsset,
      baseCycleTime,
      actualCycleTime,
      cycleTimeUnit,
      targetUtilization,
      actualUtilization,
      requiresAssets,
      requiredAssetTypes,
      currentSKU,
      skuCycleTimeMap,
      performanceBaseline,
    } = req.body;

    const updateData = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (description !== undefined) updateData.description = description;
    if (stationTypeId !== undefined) updateData.stationTypeId = stationTypeId ? parseInt(stationTypeId) : null;
    if (roomId !== undefined) updateData.roomId = roomId ? parseInt(roomId) : null;
    if (capacity !== undefined) updateData.capacity = parseInt(capacity);
    if (status !== undefined) updateData.status = status;
    if (active !== undefined) updateData.active = active;
    if (avgOutputRate !== undefined) updateData.avgOutputRate = parseFloat(avgOutputRate);
    if (avgQualityRate !== undefined) updateData.avgQualityRate = parseFloat(avgQualityRate);
    // Enhanced fields
    if (workstationType !== undefined) updateData.workstationType = workstationType || null;
    if (isMultiAsset !== undefined) updateData.isMultiAsset = Boolean(isMultiAsset);
    if (baseCycleTime !== undefined) updateData.baseCycleTime = baseCycleTime != null ? Number(baseCycleTime) : null;
    if (actualCycleTime !== undefined) updateData.actualCycleTime = actualCycleTime != null ? Number(actualCycleTime) : null;
    if (cycleTimeUnit !== undefined) updateData.cycleTimeUnit = cycleTimeUnit || null;
    if (targetUtilization !== undefined) updateData.targetUtilization = targetUtilization != null ? Number(targetUtilization) : null;
    if (actualUtilization !== undefined) updateData.actualUtilization = actualUtilization != null ? Number(actualUtilization) : null;
    if (requiresAssets !== undefined) updateData.requiresAssets = Boolean(requiresAssets);
    if (requiredAssetTypes !== undefined) updateData.requiredAssetTypes = Array.isArray(requiredAssetTypes) ? requiredAssetTypes : [];
    if (currentSKU !== undefined) updateData.currentSKU = currentSKU || null;
    if (skuCycleTimeMap !== undefined) updateData.skuCycleTimeMap = skuCycleTimeMap || null;
    if (performanceBaseline !== undefined) updateData.performanceBaseline = performanceBaseline || null;

    const station = await prisma.station.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        StationType: { select: { id: true, name: true } },
        Room: { select: { id: true, name: true } },
      },
    });

    res.json(station);
  } catch (error) {
    console.error('Error updating station:', error);
    res.status(500).json({ error: 'Failed to update station' });
  }
});

// GET /api/stations/:id/capacity - capacity summary leveraging process-config
router.get('/:id/capacity', async (req, res) => {
  try {
    const stationId = parseInt(req.params.id);
    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station) return res.status(404).json({ error: 'Station not found' });

    const configs = await prisma.processConfig.findMany({
      where: { stationId },
      include: { calculations: { orderBy: { calculatedAt: 'desc' }, take: 1 } }
    });

    const dailyHours = 24;
    const machineCount = station.capacity || 1;
    const totalCapacityHours = dailyHours * machineCount;

    res.json({
      stationId,
      stationCode: station.code,
      stationName: station.name,
      machineCount,
      dailyHours,
      totalCapacityHours,
      configurations: configs.length,
      recentCalculations: configs.map(c => c.calculations[0]).filter(Boolean),
    });
  } catch (e) {
    console.error('stations:capacity', e);
    res.status(500).json({ error: 'Failed to fetch station capacity' });
  }
});

// DELETE /api/stations/:id - Delete station
router.delete('/:id', async (req, res) => {
  try {
    await prisma.station.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: 'Station deleted successfully' });
  } catch (error) {
    console.error('Error deleting station:', error);
    res.status(500).json({ error: 'Failed to delete station' });
  }
});

// GET /api/stations/:id/analytics - Station performance analytics
router.get('/:id/analytics', async (req, res) => {
  try {
    const stationId = parseInt(req.params.id);
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const [productionStats, qcStats, shiftStats, wipStats] = await Promise.all([
      // Production statistics
      prisma.productionEntry.aggregate({
        where: {
          stationId,
          ...(Object.keys(dateFilter).length > 0 && { entryDate: dateFilter }),
        },
        _sum: { totalProduced: true, approvedQty: true, rejectedQty: true },
        _count: true,
      }),
      // QC statistics
      prisma.qCSubmission.aggregate({
        where: {
          stationId,
          ...(Object.keys(dateFilter).length > 0 && { submissionDate: dateFilter }),
        },
        _count: { _all: true },
      }),
      // Shift statistics
      prisma.shiftEntry.aggregate({
        where: {
          stationId,
          ...(Object.keys(dateFilter).length > 0 && { shiftDate: dateFilter }),
        },
        _sum: { totalProduced: true, workersPresent: true, downtimeMinutes: true },
        _avg: { efficiency: true },
        _count: true,
      }),
      // WIP statistics
      prisma.wIPLedger.groupBy({
        by: ['transactionType'],
        where: {
          stationId,
          status: 'active',
          ...(Object.keys(dateFilter).length > 0 && { transactionDate: dateFilter }),
        },
        _sum: { quantity: true },
      }),
    ]);

    const wipSummary = wipStats.reduce((acc, item) => {
      acc[item.transactionType] = item._sum.quantity || 0;
      return acc;
    }, {});

    res.json({
      production: {
        totalEntries: productionStats._count,
        totalProduced: productionStats._sum.totalProduced || 0,
        totalApproved: productionStats._sum.approvedQty || 0,
        totalRejected: productionStats._sum.rejectedQty || 0,
        qualityRate: productionStats._sum.totalProduced
          ? ((productionStats._sum.approvedQty || 0) / productionStats._sum.totalProduced) * 100
          : 0,
      },
      qc: {
        totalSubmissions: qcStats._count._all,
      },
      shifts: {
        totalShifts: shiftStats._count,
        totalProduced: shiftStats._sum.totalProduced || 0,
        totalWorkers: shiftStats._sum.workersPresent || 0,
        totalDowntime: shiftStats._sum.downtimeMinutes || 0,
        avgEfficiency: shiftStats._avg.efficiency || 0,
      },
      wip: {
        input: wipSummary.input || 0,
        output: wipSummary.output || 0,
        transfer: wipSummary.transfer || 0,
        scrap: wipSummary.scrap || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching station analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/stations/types - Get all station types
router.get('/meta/types', async (req, res) => {
  try {
    const types = await prisma.stationType.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(types);
  } catch (error) {
    console.error('Error fetching station types:', error);
    res.status(500).json({ error: 'Failed to fetch station types' });
  }
});

module.exports = router;
