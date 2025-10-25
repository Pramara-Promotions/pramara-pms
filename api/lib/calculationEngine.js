// api/lib/calculationEngine.js
/**
 * Calculation Engine for Production Output, Material Consumption, and Capacity Planning
 * Used by Daily Planning and Production modules
 */

/**
 * Calculate output metrics for molding operations
 * @param {Object} config - Process configuration
 * @param {number} config.cycleTimeSec - Cycle time in seconds
 * @param {number} config.cavities - Number of cavities
 * @param {number} config.scrapRate - Scrap rate (0-1)
 * @param {number} config.setupTimeMins - Setup time in minutes
 * @param {number} shiftHours - Shift duration in hours
 * @returns {Object} Output metrics
 */
function calculateMoldingOutput(config, shiftHours = 8) {
  const { cycleTimeSec, cavities, scrapRate = 0.02, setupTimeMins = 0 } = config;
  
  const partsPerCycle = cavities;
  const cyclesPerHour = 3600 / cycleTimeSec;
  const outputPerHour = cyclesPerHour * partsPerCycle * (1 - scrapRate);
  
  const productionHours = shiftHours - (setupTimeMins / 60);
  const outputPerShift = outputPerHour * productionHours;
  
  return {
    outputPerHour: Math.floor(outputPerHour),
    outputPerShift: Math.floor(outputPerShift),
    outputPerDay: Math.floor(outputPerShift * 3), // Assuming 3 shifts
    cyclesPerHour: Math.floor(cyclesPerHour),
  };
}

/**
 * Calculate output metrics for painting/printing operations
 * @param {Object} config - Process configuration
 * @param {number} config.dryingTimeSec - Drying time in seconds
 * @param {number} config.maskingSteps - Number of masking steps
 * @param {number} config.scrapRate - Scrap rate (0-1)
 * @param {number} shiftHours - Shift duration in hours
 * @returns {Object} Output metrics
 */
function calculatePaintingOutput(config, shiftHours = 8) {
  const { dryingTimeSec = 300, maskingSteps = 1, scrapRate = 0.02 } = config;
  
  // Total cycle time = (drying time * masking steps) + handling time
  const handlingTimeSec = 60; // Approximate handling time per unit
  const totalCycleTimeSec = (dryingTimeSec * maskingSteps) + handlingTimeSec;
  
  const unitsPerHour = 3600 / totalCycleTimeSec;
  const outputPerHour = unitsPerHour * (1 - scrapRate);
  const outputPerShift = outputPerHour * shiftHours;
  
  return {
    outputPerHour: Math.floor(outputPerHour),
    outputPerShift: Math.floor(outputPerShift),
    outputPerDay: Math.floor(outputPerShift * 3),
  };
}

/**
 * Calculate output metrics for assembly operations
 * @param {Object} config - Process configuration
 * @param {number} config.assemblyTimeSec - Assembly time per unit in seconds
 * @param {number} config.scrapRate - Scrap rate (0-1)
 * @param {number} shiftHours - Shift duration in hours
 * @returns {Object} Output metrics
 */
function calculateAssemblyOutput(config, shiftHours = 8) {
  const { assemblyTimeSec, scrapRate = 0.01 } = config;
  
  const unitsPerHour = 3600 / assemblyTimeSec;
  const outputPerHour = unitsPerHour * (1 - scrapRate);
  const outputPerShift = outputPerHour * shiftHours;
  
  return {
    outputPerHour: Math.floor(outputPerHour),
    outputPerShift: Math.floor(outputPerShift),
    outputPerDay: Math.floor(outputPerShift * 3),
  };
}

/**
 * Calculate required machines and shifts for target quantity
 * @param {number} targetQty - Target quantity to produce
 * @param {number} outputPerShift - Output per shift
 * @param {number} availableShiftHours - Available hours per shift
 * @returns {Object} Resource requirements
 */
function calculateResourceRequirements(targetQty, outputPerShift, availableShiftHours = 8) {
  const shiftsRequired = Math.ceil(targetQty / outputPerShift);
  const hoursRequired = (targetQty / outputPerShift) * availableShiftHours;
  const machinesRequired = Math.ceil(hoursRequired / (availableShiftHours * 21)); // 21 working days per month
  
  return {
    shiftsRequired,
    hoursRequired: Math.ceil(hoursRequired),
    machinesRequired: Math.max(1, machinesRequired),
    daysRequired: Math.ceil(shiftsRequired / 3), // Assuming 3 shifts per day
  };
}

/**
 * Calculate material consumption for molding
 * @param {Object} config - Process configuration
 * @param {number} config.itemWeightGrams - Item weight in grams
 * @param {number} config.runnerWeightGrams - Runner weight in grams
 * @param {number} config.scrapRate - Scrap rate (0-1)
 * @param {number} targetQty - Target quantity
 * @returns {Object} Material consumption
 */
function calculateMoldingMaterials(config, targetQty) {
  const { itemWeightGrams, runnerWeightGrams, scrapRate = 0.02 } = config;
  
  const totalWeightPerUnit = itemWeightGrams + runnerWeightGrams;
  const resinNeededKg = (totalWeightPerUnit * targetQty * (1 + scrapRate)) / 1000;
  
  return {
    resin: {
      unit: 'kg',
      quantity: Math.ceil(resinNeededKg * 10) / 10, // Round to 1 decimal
    },
  };
}

/**
 * Calculate material consumption for painting
 * @param {Object} config - Process configuration
 * @param {number} config.paintPerUnitMl - Paint per unit in ml
 * @param {number} config.thinnerPerUnitMl - Thinner per unit in ml
 * @param {number} targetQty - Target quantity
 * @returns {Object} Material consumption
 */
function calculatePaintingMaterials(config, targetQty) {
  const { paintPerUnitMl, thinnerPerUnitMl } = config;
  
  const paintNeededLiters = (paintPerUnitMl * targetQty) / 1000;
  const thinnerNeededLiters = (thinnerPerUnitMl * targetQty) / 1000;
  
  return {
    paint: {
      unit: 'liters',
      quantity: Math.ceil(paintNeededLiters * 10) / 10,
    },
    thinner: {
      unit: 'liters',
      quantity: Math.ceil(thinnerNeededLiters * 10) / 10,
    },
  };
}

/**
 * Main calculation function - routes to correct calculator based on station type
 * @param {Object} processConfig - Full process configuration
 * @param {number} targetQty - Target quantity
 * @param {number} shiftHours - Shift duration in hours
 * @returns {Object} Complete calculation result
 */
function calculateProduction(processConfig, targetQty, shiftHours = 8) {
  const { stationType } = processConfig;
  
  let outputMetrics;
  let materialConsumption = {};
  
  switch (stationType) {
    case 'molding':
      outputMetrics = calculateMoldingOutput(processConfig, shiftHours);
      materialConsumption = calculateMoldingMaterials(processConfig, targetQty);
      break;
      
    case 'spray_painting':
    case 'pad_printing':
      outputMetrics = calculatePaintingOutput(processConfig, shiftHours);
      materialConsumption = calculatePaintingMaterials(processConfig, targetQty);
      break;
      
    case 'assembly':
      outputMetrics = calculateAssemblyOutput(processConfig, shiftHours);
      break;
      
    default:
      // Generic calculation based on cycle time
      const cycleTimeSec = processConfig.cycleTimeSec || 60;
      const unitsPerHour = 3600 / cycleTimeSec;
      outputMetrics = {
        outputPerHour: Math.floor(unitsPerHour),
        outputPerShift: Math.floor(unitsPerHour * shiftHours),
        outputPerDay: Math.floor(unitsPerHour * shiftHours * 3),
      };
  }
  
  const resourceRequirements = calculateResourceRequirements(
    targetQty,
    outputMetrics.outputPerShift,
    shiftHours
  );
  
  return {
    ...outputMetrics,
    ...resourceRequirements,
    materialConsumption,
    targetQty,
  };
}

/**
 * Calculate variance between actual and planned output
 * @param {number} actualQty - Actual quantity produced
 * @param {number} targetQty - Target quantity
 * @param {number} rejectedQty - Rejected quantity
 * @returns {Object} Variance metrics
 */
function calculateOutputVariance(actualQty, targetQty, rejectedQty = 0) {
  const outputVariance = actualQty - targetQty;
  const outputVariancePercent = (outputVariance / targetQty) * 100;
  
  const acceptedQty = actualQty - rejectedQty;
  const qualityRate = actualQty > 0 ? (acceptedQty / actualQty) * 100 : 100;
  const efficiency = (actualQty / targetQty) * 100;
  
  return {
    outputVariance,
    outputVariancePercent: Math.round(outputVariancePercent * 10) / 10,
    acceptedQty,
    rejectedQty,
    qualityRate: Math.round(qualityRate * 10) / 10,
    efficiency: Math.round(efficiency * 10) / 10,
    status: outputVariancePercent < -10 ? 'behind' : outputVariancePercent > 10 ? 'ahead' : 'on_track',
  };
}

/**
 * Calculate material variance
 * @param {Object} actualMaterial - { materialId: actualQty }
 * @param {Object} plannedMaterial - { materialId: plannedQty }
 * @returns {Object} Material variance
 */
function calculateMaterialVariance(actualMaterial, plannedMaterial) {
  const variance = {};
  
  for (const [materialId, plannedQty] of Object.entries(plannedMaterial)) {
    const actualQty = actualMaterial[materialId] || 0;
    const diff = actualQty - plannedQty;
    const percentVariance = plannedQty > 0 ? (diff / plannedQty) * 100 : 0;
    
    variance[materialId] = {
      planned: plannedQty,
      actual: actualQty,
      variance: diff,
      variancePercent: Math.round(percentVariance * 10) / 10,
      status: Math.abs(percentVariance) > 5 ? 'alert' : 'normal',
    };
  }
  
  return variance;
}

/**
 * Calculate projected completion date based on current progress
 * @param {number} completedQty - Completed quantity so far
 * @param {number} targetQty - Target quantity
 * @param {number} daysElapsed - Days elapsed since start
 * @returns {Object} Projection
 */
function calculateProjection(completedQty, targetQty, daysElapsed) {
  if (completedQty === 0 || daysElapsed === 0) {
    return {
      projectedDaysTotal: null,
      projectedDaysRemaining: null,
      dailyRate: 0,
      onTrack: false,
    };
  }
  
  const dailyRate = completedQty / daysElapsed;
  const projectedDaysTotal = targetQty / dailyRate;
  const projectedDaysRemaining = projectedDaysTotal - daysElapsed;
  
  return {
    projectedDaysTotal: Math.ceil(projectedDaysTotal),
    projectedDaysRemaining: Math.ceil(projectedDaysRemaining),
    dailyRate: Math.round(dailyRate),
    percentComplete: Math.round((completedQty / targetQty) * 100),
    onTrack: dailyRate >= (targetQty / 30), // Assuming 30-day target
  };
}

module.exports = {
  calculateProduction,
  calculateMoldingOutput,
  calculatePaintingOutput,
  calculateAssemblyOutput,
  calculateResourceRequirements,
  calculateMoldingMaterials,
  calculatePaintingMaterials,
  calculateOutputVariance,
  calculateMaterialVariance,
  calculateProjection,
};
