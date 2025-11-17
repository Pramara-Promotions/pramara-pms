// Bottleneck Detection and Resolution Service
// Analyzes production progress and suggests optimizations

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Detect bottlenecks in a project
 * Identifies stations/SKUs falling behind schedule
 * 
 * @param {number} projectId
 * @returns {Promise<Object>} Bottleneck analysis
 */
async function detectBottlenecks(projectId) {
  // Use latest auto-generated plan and its station plans to infer progress vs expected
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, code: true, cutoffDate: true },
  });

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  const latestPlan = await prisma.dailyPlanGeneration.findFirst({
    where: { projectId },
    orderBy: { generatedAt: 'desc' },
    include: {
      stationPlans: {
        include: {
          Station: { select: { code: true, name: true } },
          ProjectSku: { select: { code: true, name: true } },
        },
        orderBy: { date: 'asc' },
      },
    },
  });

  if (!latestPlan || latestPlan.stationPlans.length === 0) {
    return {
      projectId,
      projectCode: project.code,
      totalDays: 0,
      elapsedDays: 0,
      daysRemaining: 0,
      expectedProgressPercent: 0,
      bottlenecksDetected: 0,
      bottlenecks: [],
    };
  }

  const planStart = latestPlan.startDate || latestPlan.stationPlans[0].date;
  const planEnd = latestPlan.endDate || latestPlan.stationPlans[latestPlan.stationPlans.length - 1].date;
  const today = new Date();

  const totalDays = Math.max(1, Math.ceil((new Date(planEnd) - new Date(planStart)) / 86400000));
  const elapsedDays = Math.max(0, Math.min(
    totalDays,
    Math.ceil((today - new Date(planStart)) / 86400000)
  ));
  const expectedProgressPercent = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

  // Group by station+sku
  const byKey = new Map();
  for (const p of latestPlan.stationPlans) {
    const key = `${p.stationId}-${p.skuId}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        stationId: p.stationId,
        stationCode: p.Station?.code,
        stationName: p.Station?.name,
        skuId: p.skuId,
        skuCode: p.ProjectSku?.code,
        skuName: p.ProjectSku?.name,
        totalPlanned: 0,
        totalActual: 0,
      });
    }
    const entry = byKey.get(key);
    entry.totalPlanned += p.targetQty || 0;
    entry.totalActual += p.actualQty || 0;
  }

  const bottlenecks = [];
  for (const entry of byKey.values()) {
    const actualPercent = entry.totalPlanned > 0 ? Math.round((entry.totalActual / entry.totalPlanned) * 100) : 0;
    const gap = expectedProgressPercent - actualPercent;
    const severity = gap > 20 ? 'critical' : gap > 10 ? 'high' : gap > 5 ? 'medium' : 'low';
    if (gap > 5) {
      bottlenecks.push({
        ...entry,
        expectedPercent: expectedProgressPercent,
        actualPercent,
        gap,
        severity,
        daysRemaining: Math.max(0, totalDays - elapsedDays),
      });
    }
  }

  bottlenecks.sort((a, b) => b.gap - a.gap);

  return {
    projectId,
    projectCode: project.code,
    totalDays,
    elapsedDays,
    daysRemaining: Math.max(0, totalDays - elapsedDays),
    expectedProgressPercent,
    bottlenecksDetected: bottlenecks.length,
    bottlenecks,
  };
}

/**
 * Suggest reallocation to resolve bottleneck
 * Analyzes available resources and proposes machine moves
 * 
 * @param {Object} bottleneckData - Output from detectBottlenecks
 * @returns {Promise<Array>} Reallocation suggestions
 */
async function suggestReallocation(bottleneckData) {
  const suggestions = [];

  for (const bottleneck of bottleneckData.bottlenecks) {
    if (bottleneck.severity === 'critical' || bottleneck.severity === 'high') {
      // Find machines at this station
      const currentMachines = await prisma.stationMachine.findMany({
        where: {
          stationId: bottleneck.stationId,
          status: { in: ['available', 'in_use'] },
        },
      });

      // Find similar stations with available capacity
      const station = await prisma.station.findUnique({
        where: { id: bottleneck.stationId },
      });

      const similarStations = await prisma.station.findMany({
        where: {
          workstationType: station.workstationType,
          id: { not: bottleneck.stationId },
          active: true,
        },
        include: {
          machines: {
            where: { status: 'available' },
          },
        },
      });

      // Calculate machines needed to close gap
      const machinesNeeded = Math.ceil(bottleneck.gap / 20); // Rough estimate

      for (const similarStation of similarStations) {
        if (similarStation.machines.length > 0) {
          const machinesToMove = Math.min(machinesNeeded, similarStation.machines.length);

          suggestions.push({
            bottleneckStationId: bottleneck.stationId,
            bottleneckStationCode: bottleneck.stationCode,
            fromStationId: similarStation.id,
            fromStationCode: similarStation.code,
            machinesToMove,
            machineIds: similarStation.machines.slice(0, machinesToMove).map((m) => m.id),
            currentMachines: currentMachines.length,
            projectedMachines: currentMachines.length + machinesToMove,
            estimatedImpact: `${Math.round(bottleneck.gap / 2)}% gap reduction`,
            reasoning: `Move ${machinesToMove} machines from ${similarStation.code} (${similarStation.machines.length} available) to resolve ${bottleneck.severity} bottleneck`,
          });
        }
      }

      // If no similar stations, suggest overtime or shift changes
      if (suggestions.length === 0) {
        suggestions.push({
          bottleneckStationId: bottleneck.stationId,
          bottleneckStationCode: bottleneck.stationCode,
          type: 'operational_change',
          options: [
            {
              option: 'Add overtime shift',
              estimatedImpact: '25% capacity increase',
              cost: 'overtime_rate',
            },
            {
              option: 'Increase shift hours',
              estimatedImpact: '15% capacity increase',
              cost: 'overtime_rate',
            },
            {
              option: 'Weekend production',
              estimatedImpact: '30% capacity increase',
              cost: 'weekend_rate',
            },
          ],
          reasoning: `No available machines to reallocate. Consider operational changes.`,
        });
      }
    }
  }

  return suggestions;
}

/**
 * Simulate impact of reallocation
 * Predicts finish date and capacity changes
 * 
 * @param {Object} reallocation - Reallocation action
 * @returns {Promise<Object>} Impact simulation
 */
async function simulateImpact(reallocation) {
  const {
    bottleneckStationId,
    machinesToMove,
    bottleneckData,
  } = reallocation;

  const bottleneck = bottleneckData.bottlenecks.find(
    (b) => b.stationId === bottleneckStationId
  );

  if (!bottleneck) {
    throw new Error(`Bottleneck not found for station ${bottleneckStationId}`);
  }

  // Get current capacity
  const currentMachines = await prisma.stationMachine.count({
    where: {
      stationId: bottleneckStationId,
      status: { in: ['available', 'in_use'] },
    },
  });

  const projectedMachines = currentMachines + machinesToMove;
  const capacityIncrease = (machinesToMove / currentMachines) * 100;

  // Calculate new timeline
  const remainingQty = bottleneck.totalPlanned - bottleneck.totalActual;
  const currentDailyCapacity = await estimateDailyCapacity(bottleneckStationId, currentMachines);
  const projectedDailyCapacity = await estimateDailyCapacity(bottleneckStationId, projectedMachines);

  const currentDaysNeeded = Math.ceil(remainingQty / currentDailyCapacity);
  const projectedDaysNeeded = Math.ceil(remainingQty / projectedDailyCapacity);
  const daysSaved = currentDaysNeeded - projectedDaysNeeded;

  return {
    bottleneckStationId,
    bottleneckStationCode: bottleneck.stationCode,
    currentMachines,
    projectedMachines,
    capacityIncrease: Math.round(capacityIncrease),
    remainingQuantity: remainingQty,
    currentDailyCapacity,
    projectedDailyCapacity,
    currentDaysNeeded,
    projectedDaysNeeded,
    daysSaved,
    projectedFinishDate: new Date(Date.now() + projectedDaysNeeded * 24 * 60 * 60 * 1000),
    recommendation: daysSaved >= 2 ? 'Recommended' : 'Not significant',
  };
}

/**
 * Create PlanAdaptation record for suggestion
 * 
 * @param {Object} suggestion
 * @param {Object} simulation
 * @returns {Promise<Object>} Created adaptation
 */
async function createAdaptationSuggestion(suggestion, simulation) {
  return await prisma.planAdaptation.create({
    data: {
      projectId: simulation.projectId || suggestion.projectId,
      stationId: suggestion.bottleneckStationId,
      type: 'reallocation',
      originalValue: JSON.stringify({
        machines: simulation.currentMachines,
        dailyCapacity: simulation.currentDailyCapacity,
      }),
      suggestedValue: JSON.stringify({
        machines: simulation.projectedMachines,
        dailyCapacity: simulation.projectedDailyCapacity,
        machinesToMove: suggestion.machinesToMove,
        fromStationId: suggestion.fromStationId,
      }),
      reasoning: suggestion.reasoning,
      confidence: simulation.daysSaved >= 3 ? 0.9 : simulation.daysSaved >= 2 ? 0.7 : 0.5,
      status: 'pending',
      impactScore: simulation.daysSaved,
    },
  });
}

/**
 * Get bottleneck history for learning
 * 
 * @param {number} projectId
 * @returns {Promise<Array>} Historical bottlenecks
 */
async function getBottleneckHistory(projectId) {
  const adaptations = await prisma.planAdaptation.findMany({
    where: {
      projectId,
      type: 'reallocation',
    },
    orderBy: { createdAt: 'desc' },
    include: {
      Station: { select: { code: true, name: true } },
    },
  });

  return adaptations.map((a) => ({
    adaptationId: a.id,
    stationId: a.stationId,
    stationCode: a.Station.code,
    status: a.status,
    confidence: a.confidence,
    impactScore: a.impactScore,
    reasoning: a.reasoning,
    createdAt: a.createdAt,
    approvedAt: a.approvedAt,
  }));
}

/**
 * Estimate daily capacity for a station
 */
async function estimateDailyCapacity(stationId, machineCount) {
  // Get latest process config for station
  const config = await prisma.processConfig.findFirst({
    where: { stationId },
    orderBy: { createdAt: 'desc' },
  });

  if (!config) {
    // Reasonable default
    const defaultPiecesPerHour = (3600 / 60) * 0.8; // 60 sec cycle, 80% utilization
    return Math.round(defaultPiecesPerHour * 8 * 2 * machineCount); // 2 shifts x 8 hours
  }

  const cycleTimeSec = config.cycleTimeSec ?? 60;
  const cavities = config.cavities ?? 1;
  const utilizationFactor = 0.8; // default assumption
  const shiftHours = 8;
  const shiftsPerDay = 2;

  const piecesPerHour = (3600 / cycleTimeSec) * cavities * utilizationFactor;
  const dailyCapacity = piecesPerHour * shiftHours * shiftsPerDay * machineCount;

  return Math.round(dailyCapacity);
}

module.exports = {
  detectBottlenecks,
  suggestReallocation,
  simulateImpact,
  createAdaptationSuggestion,
  getBottleneckHistory,
};
module.exports._prisma = prisma;
