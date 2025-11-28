// api/services/processChainAnalyzer.js
/**
 * Process Chain Analysis Service
 * Analyzes process flows to identify bottlenecks and calculate effective capacity
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Analyze a process chain to identify bottlenecks and calculate throughput
 * @param {string} processFlowId
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeProcessChain(processFlowId) {
  const processFlow = await prisma.processFlow.findUnique({
    where: { id: processFlowId },
    include: {
      operations: {
        include: {
          station: true,
          subOperations: true
        },
        orderBy: { sequence: 'asc' }
      }
    }
  });

  if (!processFlow) {
    throw new Error('Process flow not found');
  }

  if (processFlow.operations.length === 0) {
    throw new Error('No operations defined in process flow');
  }

  // Calculate capacity for each operation
  const operationCapacities = processFlow.operations.map(op => ({
    operationId: op.id,
    operationName: op.operationName,
    sequence: op.sequence,
    standardOutput: op.standardOutput || 0,
    estimatedTime: op.estimatedTime || 0,
    stationId: op.stationId,
    stationName: op.station?.name || 'Unassigned',
    predecessorIds: op.predecessorIds || []
  }));

  // Find bottleneck (minimum capacity in the chain)
  const bottleneck = operationCapacities.reduce((min, op) => 
    op.standardOutput > 0 && (min.standardOutput === 0 || op.standardOutput < min.standardOutput) ? op : min
  );

  // Effective capacity is the bottleneck capacity
  const effectiveCapacity = bottleneck.standardOutput;

  // Calculate utilization for each operation
  const operationBreakdown = operationCapacities.map(op => ({
    ...op,
    isBottleneck: op.operationId === bottleneck.operationId,
    effectiveOutput: effectiveCapacity, // All operations constrained to bottleneck
    capacityUtilization: op.standardOutput > 0 ? (effectiveCapacity / op.standardOutput) * 100 : 0,
    idleCapacity: op.standardOutput > 0 ? op.standardOutput - effectiveCapacity : 0
  }));

  return {
    processFlowId,
    processFlowName: processFlow.flowName,
    totalOperations: processFlow.operations.length,
    bottleneck: {
      operationId: bottleneck.operationId,
      operationName: bottleneck.operationName,
      sequence: bottleneck.sequence,
      capacity: bottleneck.standardOutput
    },
    effectiveCapacity,
    operationBreakdown,
    warnings: generateWarnings(operationBreakdown)
  };
}

/**
 * Get capacity for a specific operation
 * @param {string} operationId
 * @returns {Promise<number>}
 */
async function getOperationCapacity(operationId) {
  const operation = await prisma.processOperation.findUnique({
    where: { id: operationId }
  });

  return operation?.standardOutput || 0;
}

/**
 * Calculate chain throughput (minimum capacity across all operations)
 * @param {Array} operations - Array of ProcessOperation objects
 * @returns {number} Minimum capacity (units/hour)
 */
function calculateChainThroughput(operations) {
  if (operations.length === 0) return 0;

  const capacities = operations
    .map(op => op.standardOutput || 0)
    .filter(cap => cap > 0);

  if (capacities.length === 0) return 0;

  return Math.min(...capacities);
}

/**
 * Identify bottleneck operations in the chain
 * @param {Array} operations - Array of ProcessOperation objects with capacities
 * @returns {Array} Operations that are bottlenecks
 */
function identifyBottlenecks(operations) {
  const minCapacity = calculateChainThroughput(operations);
  
  return operations.filter(op => 
    op.standardOutput && op.standardOutput === minCapacity
  );
}

/**
 * Generate warnings for process chain issues
 * @param {Array} operationBreakdown
 * @returns {Array} Warning messages
 */
function generateWarnings(operationBreakdown) {
  const warnings = [];

  // Check for operations with no capacity defined
  const noCapacity = operationBreakdown.filter(op => op.standardOutput === 0);
  if (noCapacity.length > 0) {
    warnings.push({
      type: 'MISSING_CAPACITY',
      message: `${noCapacity.length} operation(s) have no capacity defined`,
      operations: noCapacity.map(op => op.operationName)
    });
  }

  // Check for severe underutilization (< 50%)
  const underutilized = operationBreakdown.filter(op => 
    !op.isBottleneck && op.capacityUtilization > 0 && op.capacityUtilization < 50
  );
  if (underutilized.length > 0) {
    warnings.push({
      type: 'SEVERE_UNDERUTILIZATION',
      message: `${underutilized.length} operation(s) running below 50% capacity`,
      operations: underutilized.map(op => ({
        name: op.operationName,
        utilization: Math.round(op.capacityUtilization)
      }))
    });
  }

  // Check for unassigned stations
  const noStation = operationBreakdown.filter(op => op.stationName === 'Unassigned');
  if (noStation.length > 0) {
    warnings.push({
      type: 'UNASSIGNED_STATIONS',
      message: `${noStation.length} operation(s) have no station assigned`,
      operations: noStation.map(op => op.operationName)
    });
  }

  return warnings;
}

/**
 * Calculate daily capacity breakdown
 * @param {number} effectiveCapacity - Units per hour
 * @param {number} hoursPerDay - Working hours per day
 * @returns {Object} Daily capacity metrics
 */
function calculateDailyCapacity(effectiveCapacity, hoursPerDay = 8) {
  const dailyCapacity = effectiveCapacity * hoursPerDay;
  
  return {
    hourlyCapacity: effectiveCapacity,
    dailyCapacity,
    weeklyCapacity: dailyCapacity * 6, // 6 working days
    monthlyCapacity: dailyCapacity * 26 // ~26 working days
  };
}

/**
 * Estimate completion date based on quantity and capacity
 * @param {number} quantity - Total quantity to produce
 * @param {number} effectiveCapacity - Units per hour
 * @param {number} hoursPerDay - Working hours per day
 * @param {Date} startDate - Start date
 * @returns {Object} Completion estimate
 */
function estimateCompletion(quantity, effectiveCapacity, hoursPerDay = 8, startDate = new Date()) {
  if (effectiveCapacity === 0) {
    return {
      estimatedDays: null,
      estimatedCompletionDate: null,
      error: 'Cannot estimate: effective capacity is zero'
    };
  }

  const dailyCapacity = effectiveCapacity * hoursPerDay;
  const daysRequired = Math.ceil(quantity / dailyCapacity);
  
  const completionDate = new Date(startDate);
  completionDate.setDate(completionDate.getDate() + daysRequired);
  
  return {
    quantity,
    effectiveCapacity,
    hoursPerDay,
    dailyCapacity,
    daysRequired,
    startDate,
    estimatedCompletionDate: completionDate
  };
}

module.exports = {
  analyzeProcessChain,
  getOperationCapacity,
  calculateChainThroughput,
  identifyBottlenecks,
  calculateDailyCapacity,
  estimateCompletion
};
