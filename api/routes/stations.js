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
        Room: { 
          select: { 
            id: true, 
            name: true,
            section: {
              select: {
                id: true,
                name: true,
                floor: {
                  select: {
                    id: true,
                    name: true,
                    factory: {
                      select: {
                        id: true,
                        name: true,
                      }
                    }
                  }
                }
              }
            }
          } 
        },
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
        Room: { 
          select: { 
            id: true, 
            name: true,
            section: {
              select: {
                id: true,
                name: true,
                floor: {
                  select: {
                    id: true,
                    name: true,
                    factory: {
                      select: {
                        id: true,
                        name: true,
                      }
                    }
                  }
                }
              }
            }
          } 
        },
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
    const { startDate, endDate, days } = req.query;

    // Default to last 30 days if not specified
    const daysToAnalyze = days ? parseInt(days) : 30;
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    } else {
      dateFilter.gte = new Date(Date.now() - daysToAnalyze * 24 * 60 * 60 * 1000);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const [station, productionStats, qcStats, shiftStats, wipStats, topOperators] = await Promise.all([
      // Get station details
      prisma.station.findUnique({
        where: { id: stationId },
        select: { capacity: true, targetUtilization: true, actualUtilization: true },
      }),
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
        _sum: { totalProduced: true, targetProduction: true, workersPresent: true, downtimeMinutes: true },
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
      // Top operators by output
      prisma.wIPLedger.groupBy({
        by: ['operatorId'],
        where: {
          stationId,
          transactionType: 'output',
          status: 'active',
          operatorId: { not: null },
          ...(Object.keys(dateFilter).length > 0 && { transactionDate: dateFilter }),
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    const wipSummary = wipStats.reduce((acc, item) => {
      acc[item.transactionType] = item._sum.quantity || 0;
      return acc;
    }, {});

    // Calculate utilization %
    const totalDowntimeHours = (shiftStats._sum.downtimeMinutes || 0) / 60;
    const totalShiftHours = shiftStats._count * 8; // Assuming 8-hour shifts
    const utilizationPercent = totalShiftHours > 0 
      ? ((totalShiftHours - totalDowntimeHours) / totalShiftHours) * 100 
      : 0;

    // Calculate output vs target
    const totalOutput = shiftStats._sum.totalProduced || 0;
    const totalTarget = shiftStats._sum.targetProduction || 0;
    const outputVsTargetPercent = totalTarget > 0 
      ? (totalOutput / totalTarget) * 100 
      : 0;

    // Calculate efficiency (actual vs theoretical)
    const avgEfficiency = shiftStats._avg.efficiency || 0;
    const downtimeHours = totalDowntimeHours;

    // Fetch operator details for top performers
    const operatorIds = topOperators.map(op => op.operatorId).filter(Boolean);
    const operators = operatorIds.length > 0 
      ? await prisma.user.findMany({
          where: { id: { in: operatorIds } },
          select: { id: true, name: true, firstName: true, lastName: true },
        })
      : [];

    const topOperatorsWithNames = topOperators.map(op => {
      const operator = operators.find(u => u.id === op.operatorId);
      return {
        operatorId: op.operatorId,
        operatorName: operator 
          ? (operator.name || `${operator.firstName || ''} ${operator.lastName || ''}`.trim() || 'Unknown')
          : 'Unknown',
        totalOutput: op._sum.quantity || 0,
      };
    });

    res.json({
      stationId,
      period: {
        startDate: dateFilter.gte,
        endDate: dateFilter.lte || new Date(),
        days: daysToAnalyze,
      },
      utilization: {
        percent: Math.round(utilizationPercent * 100) / 100,
        totalShiftHours: Math.round(totalShiftHours * 100) / 100,
        downtimeHours: Math.round(downtimeHours * 100) / 100,
        activeHours: Math.round((totalShiftHours - downtimeHours) * 100) / 100,
        targetUtilization: station?.targetUtilization || null,
        actualUtilization: station?.actualUtilization || null,
      },
      output: {
        total: totalOutput,
        target: totalTarget,
        vsTargetPercent: Math.round(outputVsTargetPercent * 100) / 100,
        approved: productionStats._sum.approvedQty || 0,
        rejected: productionStats._sum.rejectedQty || 0,
      },
      efficiency: {
        avgPercent: Math.round(avgEfficiency * 100) / 100,
        totalShifts: shiftStats._count,
      },
      downtime: {
        totalMinutes: shiftStats._sum.downtimeMinutes || 0,
        totalHours: Math.round(downtimeHours * 100) / 100,
        avgMinutesPerShift: shiftStats._count > 0 
          ? Math.round((shiftStats._sum.downtimeMinutes || 0) / shiftStats._count * 100) / 100 
          : 0,
      },
      topOperators: topOperatorsWithNames,
      production: {
        totalEntries: productionStats._count,
        totalProduced: productionStats._sum.totalProduced || 0,
        totalApproved: productionStats._sum.approvedQty || 0,
        totalRejected: productionStats._sum.rejectedQty || 0,
        qualityRate: productionStats._sum.totalProduced
          ? Math.round(((productionStats._sum.approvedQty || 0) / productionStats._sum.totalProduced) * 10000) / 100
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
        avgEfficiency: Math.round(avgEfficiency * 100) / 100,
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
