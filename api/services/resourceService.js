// Resource Allocation Service
// Manages cross-project machine allocation, conflict detection, and availability checking

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Check machine availability for a date range
 * Returns machines with their allocation status
 * 
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} Machine availability details
 */
async function checkMachineAvailability(params) {
  const {
    stationId,
    machineType,
    startDate,
    endDate,
    material,
  } = params;

  const where = {
    ...(stationId && { stationId }),
    ...(machineType && { machineType }),
    status: { in: ['available', 'in_use'] },
  };

  const start = new Date(startDate);
  const end = new Date(endDate);
  const machines = await prisma.stationMachine.findMany({
    where,
    include: {
      Station: { select: { code: true, name: true } },
      allocations: {
        where: {
          status: { in: ['planned', 'active'] },
          OR: [
            {
              AND: [
                { startDate: { lte: end } },
                { endDate: { gte: start } },
              ],
            },
          ],
        },
        include: {
          Project: { select: { code: true, name: true } },
          ProjectSku: { select: { code: true, name: true } },
        },
      },
    },
  });

  // Calculate availability percentage for each machine
  const availability = machines.map((machine) => {
    const totalDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    
    let allocatedDays = 0;
    for (const allocation of machine.allocations) {
      const overlapStart = new Date(Math.max(new Date(startDate), new Date(allocation.startDate)));
      const overlapEnd = new Date(Math.min(new Date(endDate), new Date(allocation.endDate)));
      const days = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));
      allocatedDays += Math.max(0, days);
    }

    const availablePercent = Math.max(0, ((totalDays - allocatedDays) / totalDays) * 100);

    return {
      machineId: machine.id,
      machineCode: machine.code,
      machineName: machine.name,
      machineType: machine.machineType,
      status: machine.status,
      stationId: machine.stationId,
      stationCode: machine.Station.code,
      stationName: machine.Station.name,
      totalDays,
      allocatedDays,
      availableDays: totalDays - allocatedDays,
      availablePercent: Math.round(availablePercent),
      currentAllocations: machine.allocations.map((a) => ({
        allocationId: a.id,
        projectCode: a.Project.code,
        projectName: a.Project.name,
        skuCode: a.ProjectSku?.code,
        startDate: a.startDate,
        endDate: a.endDate,
        machines: a.machinesAllocated,
      })),
    };
  });

  return availability;
}

/**
 * Allocate machines to a project/SKU
 * Creates resource allocation record and updates machine status
 * 
 * @param {Object} data - Allocation data
 * @returns {Promise<Object>} Created allocation
 */
async function allocateMachines(data) {
  const {
    projectId,
    skuId,
    stationId,
    machineIds, // array of machine IDs
    startDate,
    endDate,
    createdBy,
    notes,
  } = data;

  // Check for conflicts
  const conflicts = await checkAllocationConflicts({
    machineIds,
    startDate,
    endDate,
  });

  if (conflicts.length > 0) {
    throw new Error(`Machine allocation conflicts detected: ${JSON.stringify(conflicts)}`);
  }

  // Create allocations
  const allocations = [];
  for (const machineId of machineIds) {
    const allocation = await prisma.resourceAllocation.create({
      data: {
        projectId,
        skuId,
        stationId,
        machineId,
        startDate,
        endDate,
        machinesAllocated: 1,
        status: 'planned',
        notes,
        createdBy,
      },
      include: {
        Project: { select: { code: true, name: true } },
        StationMachine: { select: { code: true, name: true } },
      },
    });

    // Update machine status
    await prisma.stationMachine.update({
      where: { id: machineId },
      data: {
        currentProjectId: projectId,
        currentSkuId: skuId,
      },
    });

    allocations.push(allocation);
  }

  return allocations;
}

/**
 * Check for allocation conflicts
 * Detects overlapping allocations for the same machines
 * 
 * @param {Object} params - Conflict check parameters
 * @returns {Promise<Array>} Array of conflicts
 */
async function checkAllocationConflicts(params) {
  const { machineIds, startDate, endDate } = params;

  const conflicts = [];

  for (const machineId of machineIds) {
    const overlapping = await prisma.resourceAllocation.findMany({
      where: {
        machineId,
        status: { in: ['planned', 'active'] },
        OR: [
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: startDate } },
            ],
          },
        ],
      },
      include: {
        Project: { select: { code: true, name: true } },
        ProjectSku: { select: { code: true } },
      },
    });

    if (overlapping.length > 0) {
      conflicts.push({
        machineId,
        conflictingAllocations: overlapping.map((a) => ({
          allocationId: a.id,
          projectCode: a.Project.code,
          skuCode: a.ProjectSku?.code,
          startDate: a.startDate,
          endDate: a.endDate,
        })),
      });
    }
  }

  return conflicts;
}

/**
 * Release machine allocation
 * Marks allocation as completed and frees machine
 * 
 * @param {string} allocationId
 * @returns {Promise<Object>} Updated allocation
 */
async function releaseAllocation(allocationId) {
  const allocation = await prisma.resourceAllocation.update({
    where: { id: allocationId },
    data: { status: 'completed' },
    include: {
      StationMachine: true,
    },
  });

  // Update machine status if no other active allocations
  const activeAllocations = await prisma.resourceAllocation.count({
    where: {
      machineId: allocation.machineId,
      status: 'active',
    },
  });

  if (activeAllocations === 0) {
    await prisma.stationMachine.update({
      where: { id: allocation.machineId },
      data: {
        status: 'available',
        currentProjectId: null,
        currentSkuId: null,
      },
    });
  }

  return allocation;
}

/**
 * Get machine utilization report
 * Shows usage metrics across projects
 * 
 * @param {Object} params - Report parameters
 * @returns {Promise<Object>} Utilization report
 */
async function getMachineUtilization(params) {
  const { stationId, startDate, endDate } = params;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const machines = await prisma.stationMachine.findMany({
    where: {
      ...(stationId && { stationId }),
    },
    include: {
      Station: { select: { code: true, name: true } },
      allocations: {
        where: {
          OR: [
            {
              AND: [
                { startDate: { lte: end } },
                { endDate: { gte: start } },
              ],
            },
          ],
        },
        include: {
          Project: { select: { code: true, name: true } },
        },
      },
    },
  });

  const totalDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));

  const utilization = machines.map((machine) => {
    let allocatedDays = 0;
    const projectBreakdown = {};

    for (const allocation of machine.allocations) {
      const overlapStart = new Date(Math.max(new Date(startDate), new Date(allocation.startDate)));
      const overlapEnd = new Date(Math.min(new Date(endDate), new Date(allocation.endDate)));
      const days = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));
      
      if (days > 0) {
        allocatedDays += days;
        const projectKey = allocation.Project.code;
        projectBreakdown[projectKey] = (projectBreakdown[projectKey] || 0) + days;
      }
    }

    const utilizationPercent = (allocatedDays / totalDays) * 100;

    return {
      machineId: machine.id,
      machineCode: machine.code,
      machineName: machine.name,
      stationCode: machine.Station.code,
      totalDays,
      allocatedDays,
      idleDays: totalDays - allocatedDays,
      utilizationPercent: Math.round(utilizationPercent * 10) / 10,
      projectBreakdown,
    };
  });

  return {
    startDate,
    endDate,
    totalMachines: machines.length,
    utilization,
    averageUtilization: Math.round(
      utilization.reduce((sum, m) => sum + m.utilizationPercent, 0) / machines.length
    ),
  };
}

/**
 * Suggest machine reallocation to resolve bottleneck
 * Analyzes overcapacity stations and suggests moves
 * 
 * @param {number} bottleneckProjectId
 * @param {number} bottleneckStationId
 * @returns {Promise<Object>} Reallocation suggestion
 */
async function suggestReallocation(bottleneckProjectId, bottleneckStationId) {
  // Get bottleneck station details
  const bottleneckStation = await prisma.station.findUnique({
    where: { id: bottleneckStationId },
    include: {
      machines: {
        where: { status: { in: ['available', 'in_use'] } },
      },
    },
  });

  // Find similar stations (same type) with excess capacity
  const similarStations = await prisma.station.findMany({
    where: {
      workstationType: bottleneckStation.workstationType,
      id: { not: bottleneckStationId },
      active: true,
    },
    include: {
      machines: {
        where: { status: 'available' },
      },
    },
  });

  const suggestions = [];

  for (const station of similarStations) {
    if (station.machines.length > 0) {
      suggestions.push({
        fromStationId: station.id,
        fromStationCode: station.code,
        toStationId: bottleneckStationId,
        toStationCode: bottleneckStation.code,
        availableMachines: station.machines.length,
        suggestedMachinesToMove: Math.min(2, station.machines.length), // Move up to 2 machines
        machineIds: station.machines.slice(0, 2).map((m) => m.id),
        reasoning: `Station ${station.code} has ${station.machines.length} available machines of the same type`,
      });
    }
  }

  return {
    bottleneckProjectId,
    bottleneckStationId,
    bottleneckStationCode: bottleneckStation.code,
    suggestions,
  };
}

module.exports = {
  checkMachineAvailability,
  allocateMachines,
  checkAllocationConflicts,
  releaseAllocation,
  getMachineUtilization,
  suggestReallocation,
};
// Export prisma for testing/mocking
module.exports._prisma = prisma;
