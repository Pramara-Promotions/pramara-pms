const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');
const { permissionGuard } = require('../middleware/permissionGuard');

const router = express.Router();
const prisma = new PrismaClient();

router.use(requireAuth);

/**
 * GET /api/execution/auto-fill/:projectId
 * Auto-fill execution data from Daily Plan + Manpower Plan
 * Returns combined data that can be edited before submission
 */
router.get('/auto-fill/:projectId', permissionGuard({ resource: 'production', action: 'read' }), async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { date, stationId } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    const targetDate = new Date(date);
    
    // Get the daily plan for this date and project
    const dailyPlan = await prisma.dailyPlan.findFirst({
      where: {
        projectId,
        date: {
          gte: new Date(targetDate.setHours(0, 0, 0, 0)),
          lt: new Date(targetDate.setHours(23, 59, 59, 999))
        }
      },
      include: {
        DailyPlanStation: {
          where: stationId ? { stationId: parseInt(stationId) } : {},
          include: {
            Station: {
              select: {
                id: true,
                name: true,
                code: true
              }
            },
            ProjectSku: {
              select: {
                id: true,
                code: true,
                name: true
              }
            }
          }
        }
      }
    });
    
    if (!dailyPlan) {
      return res.json({
        hasData: false,
        message: 'No daily plan found for this date',
        stations: []
      });
    }
    
    // Get manpower assignments for these stations
    const stationIds = dailyPlan.DailyPlanStation.map(dps => dps.stationId);
    
    const shiftPlans = await prisma.shiftPlan.findMany({
      where: {
        dailyPlanId: dailyPlan.id,
        stationId: { in: stationIds }
      },
      include: {
        Worker: {
          select: {
            id: true,
            name: true,
            workerType: true,
            skills: true
          }
        },
        Shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true
          }
        },
        Station: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    // Group by station
    const stationMap = {};
    dailyPlan.DailyPlanStation.forEach(dps => {
      const stationWorkers = shiftPlans.filter(sp => sp.stationId === dps.stationId);
      
      stationMap[dps.stationId] = {
        stationId: dps.stationId,
        stationName: dps.Station.name,
        stationCode: dps.Station.code,
        skuId: dps.projectSkuId,
        skuCode: dps.ProjectSku?.code,
        skuName: dps.ProjectSku?.name,
        plannedQuantity: dps.targetQty,
        assignedWorkers: dps.assignedWorkers || [],
        workerDetails: stationWorkers.map(sp => ({
          workerId: sp.workerId,
          workerName: sp.Worker.name,
          workerType: sp.Worker.workerType,
          skills: sp.Worker.skills,
          shiftId: sp.shiftId,
          shiftName: sp.Shift.name,
          shiftStart: sp.Shift.startTime,
          shiftEnd: sp.Shift.endTime,
          assignedBy: sp.assignedBy,
          assignmentReason: sp.assignmentReason
        })),
        materialsRequired: dps.materialsRequired || {},
        materialsReserved: dps.materialsReserved,
        equipmentStatus: dps.equipmentStatus,
        dependencies: dps.dependencies || [],
        dependenciesMet: dps.dependenciesMet,
        status: dps.status,
        // Editable fields for execution
        actualQuantity: null, // User will fill this
        startTime: null,
        endTime: null,
        notes: ''
      };
    });
    
    const stations = Object.values(stationMap);
    
    // Get historical performance for comparison
    const historicalData = await Promise.all(
      stations.map(async (station) => {
        const recentEntries = await prisma.productionEntry.findMany({
          where: {
            projectId,
            stationId: station.stationId
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5,
          select: {
            actualQty: true,
            targetQty: true,
            rejectedQty: true,
            outputVariance: true
          }
        });
        
        if (recentEntries.length > 0) {
          const avgActual = recentEntries.reduce((sum, e) => sum + e.actualQty, 0) / recentEntries.length;
          const avgRejected = recentEntries.reduce((sum, e) => sum + e.rejectedQty, 0) / recentEntries.length;
          const avgVariance = recentEntries.reduce((sum, e) => sum + e.outputVariance, 0) / recentEntries.length;
          
          return {
            stationId: station.stationId,
            avgActual: Math.round(avgActual),
            avgRejected: Math.round(avgRejected),
            avgVariance: avgVariance.toFixed(2),
            sampleSize: recentEntries.length
          };
        }
        
        return null;
      })
    );
    
    const historicalMap = {};
    historicalData.filter(Boolean).forEach(h => {
      historicalMap[h.stationId] = h;
    });
    
    res.json({
      hasData: true,
      dailyPlanId: dailyPlan.id,
      projectId,
      date: dailyPlan.date,
      scenario: dailyPlan.scenario,
      totalTargetQty: dailyPlan.totalTargetQty,
      stations,
      historical: historicalMap,
      metadata: {
        generatedBy: dailyPlan.generatedBy,
        approvedBy: dailyPlan.approvedBy,
        approvedAt: dailyPlan.approvedAt,
        status: dailyPlan.status
      }
    });
    
  } catch (error) {
    console.error('[execution] Error fetching auto-fill data:', error);
    res.status(500).json({ error: 'Failed to fetch execution data' });
  }
});

/**
 * POST /api/execution/submit
 * Submit execution data with planned vs actual tracking
 */
router.post('/submit', permissionGuard({ resource: 'production', action: 'create' }), async (req, res) => {
  try {
    const {
      projectId,
      stationId,
      dailyPlanId,
      plannedQty,
      actualQty,
      rejectedQty = 0,
      startTime,
      endTime,
      operatorId,
      notes,
      materialUsed,
      batchCode,
      shiftId
    } = req.body;
    
    // Validation
    if (!projectId || !stationId || !shiftId || !startTime) {
      return res.status(400).json({ 
        error: 'Missing required fields: projectId, stationId, shiftId, startTime' 
      });
    }
    
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;
    
    // Calculate variance
    const outputVariance = plannedQty ? ((actualQty - plannedQty) / plannedQty) * 100 : 0;
    
    // Create production entry
    const entry = await prisma.productionEntry.create({
      data: {
        projectId: parseInt(projectId),
        stationId: parseInt(stationId),
        shiftId,
        batchCode,
        startTime: start,
        endTime: end,
        targetQty: plannedQty || actualQty,
        actualQty: actualQty || 0,
        rejectedQty: rejectedQty || 0,
        materialUsed: materialUsed || {},
        outputVariance,
        operatorId,
        notes
      },
      include: {
        Station: {
          select: { id: true, name: true, code: true }
        },
        Project: {
          select: { id: true, code: true, name: true }
        }
      }
    });
    
    // If linked to daily plan, update completion status
    if (dailyPlanId) {
      const dailyPlanStation = await prisma.dailyPlanStation.findFirst({
        where: {
          dailyPlanId,
          stationId: parseInt(stationId)
        }
      });
      
      if (dailyPlanStation) {
        await prisma.dailyPlanStation.update({
          where: { id: dailyPlanStation.id },
          data: {
            actualQty: actualQty,
            completedAt: end || new Date(),
            status: 'completed'
          }
        });
      }
    }
    
    // Record variance tracking (planned vs actual)
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'execution.submit',
        entity: 'ProductionEntry',
        entityId: entry.id,
        meta: {
          plannedQty,
          actualQty,
          variance: outputVariance,
          rejectedQty,
          dailyPlanId
        },
        result: 'success'
      }
    });
    
    res.status(201).json({
      success: true,
      entry,
      variance: {
        planned: plannedQty,
        actual: actualQty,
        difference: actualQty - (plannedQty || 0),
        percentVariance: outputVariance.toFixed(2)
      }
    });
    
  } catch (error) {
    console.error('[execution] Error submitting execution:', error);
    res.status(500).json({ error: 'Failed to submit execution data' });
  }
});

/**
 * GET /api/execution/planned-vs-actual/:projectId
 * Compare planned vs actual performance
 */
router.get('/planned-vs-actual/:projectId', permissionGuard({ resource: 'production', action: 'read' }), async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { startDate, endDate, stationId } = req.query;
    
    const where = {
      projectId
    };
    
    if (stationId) {
      where.stationId = parseInt(stationId);
    }
    
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }
    
    const entries = await prisma.productionEntry.findMany({
      where,
      include: {
        Station: {
          select: { id: true, name: true }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });
    
    // Aggregate by station
    const stationStats = {};
    
    entries.forEach(entry => {
      const stationId = entry.stationId;
      if (!stationStats[stationId]) {
        stationStats[stationId] = {
          stationId,
          stationName: entry.Station.name,
          totalPlanned: 0,
          totalActual: 0,
          totalRejected: 0,
          entries: 0,
          variances: []
        };
      }
      
      stationStats[stationId].totalPlanned += entry.targetQty;
      stationStats[stationId].totalActual += entry.actualQty;
      stationStats[stationId].totalRejected += entry.rejectedQty;
      stationStats[stationId].entries += 1;
      stationStats[stationId].variances.push(entry.outputVariance);
    });
    
    // Calculate averages
    Object.values(stationStats).forEach(stats => {
      stats.avgVariance = stats.variances.reduce((sum, v) => sum + v, 0) / stats.variances.length;
      stats.accuracy = ((stats.totalActual / stats.totalPlanned) * 100).toFixed(2);
      stats.qualityRate = ((stats.totalActual - stats.totalRejected) / stats.totalActual * 100).toFixed(2);
      delete stats.variances; // Remove raw data
    });
    
    res.json({
      projectId,
      dateRange: { startDate, endDate },
      stationStats: Object.values(stationStats),
      overall: {
        totalEntries: entries.length,
        totalPlanned: entries.reduce((sum, e) => sum + e.targetQty, 0),
        totalActual: entries.reduce((sum, e) => sum + e.actualQty, 0),
        totalRejected: entries.reduce((sum, e) => sum + e.rejectedQty, 0)
      }
    });
    
  } catch (error) {
    console.error('[execution] Error fetching planned vs actual:', error);
    res.status(500).json({ error: 'Failed to fetch comparison data' });
  }
});

module.exports = router;
