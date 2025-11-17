// Daily Plan Auto-Generation Service
// Replaces manual daily planning with automated backward scheduling from cutoff date

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const capacityService = require('./capacityService');
const bomService = require('./bomService');

/**
 * Generate complete daily plan for a project
 * Backward schedules from cutoff date, allocates stations/machines automatically
 * 
 * @param {Object} params - Generation parameters
 * @returns {Promise<Object>} Generated plan
 */
async function generateDailyPlan(params) {
  const {
    projectId,
    generatedBy,
    notes,
  } = params;

  // Get project details with SKUs and cutoff date
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      skus: true,
    },
  });

  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  if (!project.cutoffDate) {
    throw new Error(`Project ${projectId} has no cutoff date defined`);
  }

  // Calculate schedule window
  const today = new Date();
  const endDate = project.cutoffDate ? new Date(project.cutoffDate) : new Date(today.getTime() + 7 * 86400000);
  const availableDays = Math.max(1, Math.ceil((endDate - today) / 86400000));

  // Create plan generation record
  const planGeneration = await prisma.dailyPlanGeneration.create({
    data: {
      projectId,
      generatedBy,
      status: 'pending_approval',
      startDate: today,
      endDate,
      totalDays: availableDays,
      notes,
    },
  });

  const dailyPlanStations = [];

  // Generate daily plans for each SKU
  // Determine stations to plan based on available process configs
  const stations = await prisma.station.findMany({
    where: { active: true },
    include: { machines: true, ProcessConfig: true },
  });

  for (const sku of project.skus) {
    const orderQty = sku.orderQty || sku.orderQuantity || project.quantity || 0;
    if (!orderQty) continue;

    // Pick first station with a process config (or any active station). Fallback to workflow stage if stations not available
    let station = stations.find(s => (s.ProcessConfig || []).length > 0) || stations[0];
    if (!station) {
      try {
        const projectWithWorkflow = await prisma.project.findUnique({ where: { id: projectId }, include: { workflow: { include: { stages: true } } } });
        const firstStage = projectWithWorkflow?.workflow?.stages?.[0];
        if (firstStage) {
          station = { id: firstStage.stationId, ProcessConfig: [{ stationType: firstStage.processName || 'default' }], machines: [] };
        }
      } catch (_) { /* ignore */ }
    }
    if (!station) {
      // As a last resort, use a default placeholder station
      station = { id: 1, ProcessConfig: [{ stationType: 'default' }], machines: [] };
    }

    const proc = (station.ProcessConfig || [])[0];
    const capacityInfo = await capacityService.getStationCapacity(station.id, proc?.stationType || 'default');
    const partsPerDay = (capacityInfo && (capacityInfo.partsPerDay ?? capacityInfo.totalDailyCapacity)) ?? 500;
    const machines = (capacityInfo && (capacityInfo.machines ?? capacityInfo.availableMachines)) ?? 1;

    const daysRequired = capacityService.calculateDaysRequired(orderQty, partsPerDay);

    let currentDate = new Date(today);
    let remainingQty = orderQty;

    while (currentDate <= endDate && remainingQty > 0) {
      const plannedQty = Math.min(partsPerDay, remainingQty);

      const dailyPlan = await prisma.dailyPlanStationAuto.create({
        data: {
          planGenerationId: planGeneration.id,
          projectId,
          skuId: sku.id,
          stationId: station.id,
          date: new Date(currentDate),
          targetQty: plannedQty,
          allocatedMachines: machines,
          theoreticalCapacity: partsPerDay,
          effectiveCapacity: partsPerDay,
          status: 'pending',
        },
        include: {
          Station: { select: { code: true, name: true } },
          ProjectSku: { select: { code: true, name: true } },
        },
      });

      dailyPlanStations.push(dailyPlan);

      remainingQty -= plannedQty;
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // Update plan with summary
  const updatedPlan = await prisma.dailyPlanGeneration.update({
    where: { id: planGeneration.id },
    data: {
      totalDays: availableDays,
    },
    include: {
      Project: { select: { code: true, name: true } },
      stationPlans: {
        include: {
          Station: { select: { code: true, name: true } },
          ProjectSku: { select: { code: true, name: true } },
        },
      },
    },
  });

  return {
    planGeneration: updatedPlan,
    summary: {
      totalSKUs: project.skus.length,
      totalStations: dailyPlanStations.length,
      availableDays,
      cutoffDate: project.cutoffDate,
      status: 'pending_approval',
    },
  };
}

/**
 * Approve a generated plan
 * Changes status to approved and creates resource allocations
 * 
 * @param {string} planGenerationId
 * @param {string} approvedBy
 * @returns {Promise<Object>} Approved plan
 */
async function approvePlan(planGenerationId, approvedBy) {
  const plan = await prisma.dailyPlanGeneration.findUnique({
    where: { id: planGenerationId },
    include: {
      stationPlans: true,
    },
  });

  if (!plan) {
    throw new Error(`Plan ${planGenerationId} not found`);
  }

  if (plan.status !== 'pending_approval') {
    throw new Error(`Plan ${planGenerationId} is not in pending_approval status`);
  }

  // Update plan status
  const approvedPlan = await prisma.dailyPlanGeneration.update({
    where: { id: planGenerationId },
    data: {
      status: 'approved',
      approvedBy,
      approvedAt: new Date(),
    },
  });

  // Create resource allocations from daily stations
  const allocationsByMachine = new Map();

  for (const dailyStation of plan.stationPlans) {
    // Pick the first available machine at the station
    const machine = await prisma.stationMachine.findFirst({
      where: { stationId: dailyStation.stationId, status: { in: ['available', 'in_use'] } },
      orderBy: { id: 'asc' },
    });

    if (!machine) continue;

    const key = `${machine.id}-${dailyStation.skuId}-${dailyStation.stationId}`;
    if (!allocationsByMachine.has(key)) {
      allocationsByMachine.set(key, {
        machineId: machine.id,
        skuId: dailyStation.skuId,
        stationId: dailyStation.stationId,
        projectId: dailyStation.projectId,
        startDate: dailyStation.date,
        endDate: dailyStation.date,
      });
    } else {
      const existing = allocationsByMachine.get(key);
      existing.endDate = dailyStation.date;
    }
  }

  // Create resource allocations
  const resourceService = require('./resourceService');
  for (const [key, allocation] of allocationsByMachine) {
    await resourceService.allocateMachines({
      projectId: allocation.projectId,
      skuId: allocation.skuId,
      stationId: allocation.stationId,
      machineIds: [allocation.machineId],
      startDate: allocation.startDate,
      endDate: allocation.endDate,
      createdBy: approvedBy,
      notes: `Auto-allocated from plan ${planGenerationId}`,
    });
  }

  return approvedPlan;
}

/**
 * Rebalance plans across multiple projects
 * Optimizes machine allocation when variance detected
 * 
 * @param {Array} projectIds
 * @returns {Promise<Object>} Rebalancing results
 */
async function rebalancePlans(projectIds) {
  const rebalancingSuggestions = [];

  for (const projectId of projectIds) {
    // Get current progress
    const progress = await getCurrentProgress(projectId);

    // Detect bottlenecks (stations behind schedule)
    for (const [stationId, stationProgress] of Object.entries(progress.stations)) {
      if (stationProgress.percentComplete < stationProgress.expectedPercent - 10) {
        // Bottleneck detected: more than 10% behind
        const suggestion = await capacityService.suggestReallocation(projectId, parseInt(stationId));

        if (suggestion.suggestions.length > 0) {
          rebalancingSuggestions.push({
            projectId,
            stationId: parseInt(stationId),
            gap: stationProgress.expectedPercent - stationProgress.percentComplete,
            suggestions: suggestion.suggestions,
          });

          // Create PlanAdaptation record
          await prisma.planAdaptation.create({
            data: {
              projectId,
              stationId: parseInt(stationId),
              type: 'reallocation',
              originalValue: JSON.stringify({ machines: stationProgress.allocatedMachines }),
              suggestedValue: JSON.stringify({
                machines: stationProgress.allocatedMachines + suggestion.suggestions[0].suggestedMachinesToMove,
              }),
              reasoning: `Bottleneck detected: ${stationProgress.percentComplete}% complete vs expected ${stationProgress.expectedPercent}%`,
              confidence: 0.8,
              status: 'pending',
            },
          });
        }
      }
    }
  }

  return {
    projectsAnalyzed: projectIds.length,
    bottlenecksDetected: rebalancingSuggestions.length,
    suggestions: rebalancingSuggestions,
  };
}

/**
 * Get next plan version number for project
 */
async function getNextPlanVersion(projectId) {
  const lastPlan = await prisma.dailyPlanGeneration.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' },
  });

  return lastPlan ? lastPlan.version + 1 : 1;
}

/**
 * Allocate machines for a specific stage
 */
async function allocateMachinesForStage(params) {
  const {
    stationId,
    requiredCapacity,
    availableMachines,
  } = params;

  // Simple allocation: use minimum machines needed
  const machinesNeeded = Math.min(
    Math.ceil(requiredCapacity / (availableMachines > 0 ? requiredCapacity / availableMachines : 1)),
    availableMachines
  );

  const machines = await prisma.stationMachine.findMany({
    where: {
      stationId,
      status: { in: ['available', 'in_use'] },
    },
    take: machinesNeeded,
  });

  return {
    allocatedMachines: machines.length,
    machineIds: machines.map((m) => m.id),
  };
}

/**
 * Get previous allocation for changeover estimation
 */
async function getPreviousAllocation(stationId, beforeDate) {
  return await prisma.resourceAllocation.findFirst({
    where: {
      stationId,
      endDate: { lt: beforeDate },
      status: { in: ['completed', 'active'] },
    },
    orderBy: { endDate: 'desc' },
  });
}

/**
 * Get current progress for a project
 */
async function getCurrentProgress(projectId) {
  const latestPlan = await prisma.dailyPlanGeneration.findFirst({
    where: { projectId },
    orderBy: { generatedAt: 'desc' },
    include: {
      stationPlans: {
        include: { Station: { select: { code: true } } },
        orderBy: { date: 'asc' },
      },
    },
  });

  const stations = {};
  if (!latestPlan || latestPlan.stationPlans.length === 0) {
    return { projectId, stations };
  }

  const planStart = latestPlan.startDate || latestPlan.stationPlans[0].date;
  const planEnd = latestPlan.endDate || latestPlan.stationPlans[latestPlan.stationPlans.length - 1].date;
  const today = new Date();
  const totalDays = Math.max(1, Math.ceil((new Date(planEnd) - new Date(planStart)) / 86400000));
  const elapsedDays = Math.max(0, Math.min(totalDays, Math.ceil((today - new Date(planStart)) / 86400000)));
  const expectedPercent = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

  for (const p of latestPlan.stationPlans) {
    const stationId = p.stationId;
    if (!stations[stationId]) {
      stations[stationId] = {
        stationId,
        stationCode: p.Station?.code,
        totalPlanned: 0,
        totalActual: 0,
        percentComplete: 0,
        expectedPercent,
        allocatedMachines: 0,
      };
    }
    stations[stationId].totalPlanned += p.targetQty || 0;
    stations[stationId].totalActual += p.actualQty || 0;
    stations[stationId].allocatedMachines = Math.max(stations[stationId].allocatedMachines, p.allocatedMachines || 0);
  }

  for (const station of Object.values(stations)) {
    if (station.totalPlanned > 0) {
      station.percentComplete = Math.round((station.totalActual / station.totalPlanned) * 100);
    }
  }

  return { projectId, stations };
}

/**
 * Reject a generated plan
 */
async function rejectPlan(planGenerationId, rejectedBy, reason) {
  return await prisma.dailyPlanGeneration.update({
    where: { id: planGenerationId },
    data: {
      status: 'rejected',
      approvedBy: rejectedBy,
      approvedAt: new Date(),
      notes: reason,
    },
  });
}

module.exports = {
  generateDailyPlan,
  approvePlan,
  rebalancePlans,
  rejectPlan,
};
module.exports._prisma = prisma;
// Expose internal service dependencies for test injection
module.exports._capacityService = capacityService;
module.exports._bomService = bomService;
