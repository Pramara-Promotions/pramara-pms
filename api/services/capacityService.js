// Capacity Calculation Service
// Calculates theoretical and effective production capacity based on cycle times, machines, and changeovers

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calculate daily capacity for a process configuration
 * Formula: (60 / cycleTimeSec) × cavities × shiftHours × shiftsPerDay × machines × utilizationRate
 * 
 * @param {Object} config - Capacity configuration
 * @returns {Object} Capacity breakdown
 */
function calculateDailyCapacity(config) {
  const {
    cycleTimeSec,
    cavities = 1,
    machines = 1,
    shiftHours = 8,
    shiftsPerDay = 2,
    utilizationRate = 0.85,
  } = config;

  // Validations
  if (!cycleTimeSec || cycleTimeSec <= 0) {
    throw new Error('Cycle time must be greater than 0');
  }

  // Parts per cycle
  const partsPerCycle = cavities;

  // Cycles per minute
  const cyclesPerMinute = 60 / cycleTimeSec;

  // Parts per minute
  const partsPerMinute = cyclesPerMinute * partsPerCycle * utilizationRate;

  // Parts per hour
  const partsPerHour = partsPerMinute * 60;

  // Parts per shift
  const partsPerShift = partsPerHour * shiftHours;

  // Parts per day (theoretical)
  const partsPerDay = partsPerShift * shiftsPerDay * machines;

  return {
    partsPerCycle,
    cyclesPerMinute: Math.round(cyclesPerMinute * 100) / 100,
    partsPerMinute: Math.round(partsPerMinute * 100) / 100,
    partsPerHour: Math.round(partsPerHour),
    partsPerShift: Math.round(partsPerShift),
    partsPerDay: Math.floor(partsPerDay),
    utilizationRate,
    machines,
    shiftsPerDay,
    shiftHours,
  };
}

/**
 * Deduct changeover time from daily capacity
 * Returns effective capacity after accounting for downtime
 * 
 * @param {number} baseCapacity - Theoretical daily capacity
 * @param {number} changeoverMinutes - Total changeover downtime
 * @param {number} shiftHours - Hours per shift
 * @param {number} shiftsPerDay - Number of shifts
 * @returns {number} Effective capacity
 */
function deductChangeoverTime(baseCapacity, changeoverMinutes, shiftHours = 8, shiftsPerDay = 2) {
  const totalMinutesAvailable = shiftHours * 60 * shiftsPerDay;
  const effectiveMinutes = totalMinutesAvailable - changeoverMinutes;
  
  if (effectiveMinutes <= 0) {
    return 0;
  }

  const effectiveCapacity = (baseCapacity * effectiveMinutes) / totalMinutesAvailable;
  return Math.floor(effectiveCapacity);
}

/**
 * Estimate changeover time based on historical data
 * Learns from ChangeoverHistory records
 * 
 * @param {string} machineId
 * @param {number} fromSkuId
 * @param {number} toSkuId
 * @param {string} changeType - material, color, sku, project
 * @returns {Promise<Object>} Estimated changeover details
 */
async function estimateChangeoverTime(machineId, fromSkuId, toSkuId, changeType) {
  // Query historical changeovers
  const history = await prisma.changeoverHistory.findMany({
    where: {
      machineId,
      fromSkuId,
      toSkuId,
      changeType,
      changeoverMinutes: { not: null },
    },
    orderBy: {
      changeoverStart: 'desc',
    },
    take: 5, // Last 5 similar changeovers
  });

  if (history.length === 0) {
    // No historical data, return default estimates
    const defaults = {
      material: 60, // 1 hour
      color: 45,    // 45 minutes
      sku: 30,      // 30 minutes
      project: 20,  // 20 minutes
    };

    return {
      estimatedChangeoverMinutes: defaults[changeType] || 30,
      estimatedRampUpMinutes: 15,
      confidence: 0,
      basedOnRecords: 0,
      source: 'default',
    };
  }

  // Calculate average
  const avgChangeover = Math.round(
    history.reduce((sum, h) => sum + (h.changeoverMinutes || 0), 0) / history.length
  );

  const avgRampUp = Math.round(
    history.reduce((sum, h) => sum + (h.rampUpMinutes || 0), 0) / history.length
  );

  // Confidence based on sample size
  const confidence = Math.min(history.length / 5, 1);

  return {
    estimatedChangeoverMinutes: avgChangeover,
    estimatedRampUpMinutes: avgRampUp,
    confidence,
    basedOnRecords: history.length,
    source: 'historical',
  };
}

/**
 * Calculate days required to complete an order
 * 
 * @param {number} orderQty - Total quantity to produce
 * @param {number} dailyCapacity - Daily production capacity
 * @returns {number} Days required (rounded up)
 */
function calculateDaysRequired(orderQty, dailyCapacity) {
  if (dailyCapacity <= 0) {
    throw new Error('Daily capacity must be greater than 0');
  }
  return Math.ceil(orderQty / dailyCapacity);
}

/**
 * Get capacity for a specific station and process
 * Combines ProcessConfig with StationMachine data
 * 
 * @param {number} stationId
 * @param {string} processName
 * @param {string} material - Optional material filter
 * @returns {Promise<Object>} Capacity configuration
 */
async function getStationCapacity(stationId, processName, material = null) {
  // Get process config
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    include: {
      machines: {
        where: {
          status: 'available',
        },
      },
    },
  });

  if (!station) {
    throw new Error(`Station ${stationId} not found`);
  }

  // Get process config
  let processConfig = await prisma.processConfig.findFirst({
    where: {
      stationId: stationId,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!processConfig) {
    // Fallback try by provided processName if stationType was intended to match
    processConfig = await prisma.processConfig.findFirst({
      where: { stationId: stationId, stationType: processName },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (!processConfig) {
    throw new Error(`No active process config found for station ${stationId}`);
  }

  // Count available machines
  const availableMachines = station.machines.filter((m) => m.status === 'available').length;

  // Calculate capacity
  const capacity = calculateDailyCapacity({
    cycleTimeSec: (processConfig.cycleTimeSec || (station.baseCycleTime ? station.baseCycleTime * 60 : null) || 60), // default 60s when missing
    cavities: processConfig.cavities || 1,
    machines: availableMachines || 1,
    shiftHours: 8,
    shiftsPerDay: 2,
    utilizationRate: station.targetUtilization || 0.85,
  });

  return {
    stationId,
    stationCode: station.code,
    stationName: station.name,
    processName,
    material,
    availableMachines,
    ...capacity,
  };
}

/**
 * Calculate multi-SKU capacity allocation
 * Distributes machines optimally across multiple SKUs
 * 
 * @param {Array<Object>} skuRequirements - Array of {skuId, orderQty, priority}
 * @param {number} totalMachines - Available machines
 * @param {number} dailyCapacityPerMachine - Capacity per machine per day
 * @returns {Array<Object>} Allocation recommendations
 */
function allocateMachinesAcrossSKUs(skuRequirements, totalMachines, dailyCapacityPerMachine) {
  // Sort by priority (highest first)
  const sorted = [...skuRequirements].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  // Calculate total workload (in machine-days)
  const totalMachineDays = sorted.reduce(
    (sum, sku) => sum + sku.orderQty / dailyCapacityPerMachine,
    0
  );

  // Allocate machines proportionally
  const allocations = sorted.map((sku) => {
    const skuMachineDays = sku.orderQty / dailyCapacityPerMachine;
    const proportionalMachines = (skuMachineDays / totalMachineDays) * totalMachines;
    const allocatedMachines = Math.max(1, Math.round(proportionalMachines)); // At least 1 machine

    const dailyCapacity = allocatedMachines * dailyCapacityPerMachine;
    const daysRequired = Math.ceil(sku.orderQty / dailyCapacity);

    return {
      skuId: sku.skuId,
      orderQty: sku.orderQty,
      allocatedMachines,
      dailyCapacity,
      daysRequired,
      priority: sku.priority || 0,
    };
  });

  return allocations;
}

/**
 * Record actual changeover for learning
 * 
 * @param {Object} data - Changeover record data
 * @returns {Promise<Object>} Created record
 */
async function recordChangeover(data) {
  const {
    machineId,
    fromProjectId,
    fromSkuId,
    toProjectId,
    toSkuId,
    changeoverStart,
    changeoverEnd,
    rampUpEnd,
    changeType,
    notes,
    recordedBy,
  } = data;

  const changeoverMinutes = changeoverEnd
    ? Math.round((new Date(changeoverEnd) - new Date(changeoverStart)) / 60000)
    : null;

  const rampUpMinutes = rampUpEnd && changeoverEnd
    ? Math.round((new Date(rampUpEnd) - new Date(changeoverEnd)) / 60000)
    : null;

  return await prisma.changeoverHistory.create({
    data: {
      machineId,
      fromProjectId,
      fromSkuId,
      toProjectId,
      toSkuId,
      changeoverStart,
      changeoverEnd,
      changeoverMinutes,
      rampUpEnd,
      rampUpMinutes,
      changeType,
      notes,
      recordedBy,
    },
  });
}

module.exports = {
  calculateDailyCapacity,
  deductChangeoverTime,
  estimateChangeoverTime,
  calculateDaysRequired,
  getStationCapacity,
  allocateMachinesAcrossSKUs,
  recordChangeover,
};
