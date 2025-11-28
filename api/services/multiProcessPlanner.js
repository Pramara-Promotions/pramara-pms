// api/services/multiProcessPlanner.js
/**
 * Multi-Process Planning Service
 * Generates production plans considering entire process chains and bottlenecks
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const processChainAnalyzer = require('./processChainAnalyzer');
const resourceValidator = require('./resourceValidator');

/**
 * Generate a multi-process production plan
 * @param {Object} params - Planning parameters
 * @returns {Promise<Object>} Generated plan
 */
async function generateMultiProcessPlan(params) {
  const {
    projectId,
    processFlowId,
    quantity,
    startDate,
    hoursPerDay = 8,
    workingDaysPerWeek = 6,
    strategy = 'bottleneck' // bottleneck, balanced, aggressive
  } = params;

  // 1. Validate process flow exists and has operations
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

  // 2. Validate resources BEFORE planning
  console.log('🔍 Validating resources...');
  const validation = await resourceValidator.validatePlanningResources(projectId, processFlowId);
  
  if (!validation.valid) {
    throw new Error(
      `Cannot generate plan: Resource validation failed\n` +
      validation.errors.map(e => `- ${e.message}`).join('\n')
    );
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️ Planning warnings:', validation.warnings);
  }

  // 3. Analyze process chain to find bottleneck
  console.log('📊 Analyzing process chain...');
  const analysis = await processChainAnalyzer.analyzeProcessChain(processFlowId);
  
  if (analysis.effectiveCapacity === 0) {
    throw new Error('Cannot generate plan: No capacity defined in operations');
  }

  // 4. Calculate time required
  const dailyCapacity = analysis.effectiveCapacity * hoursPerDay;
  const daysRequired = Math.ceil(quantity / dailyCapacity);
  
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + daysRequired);

  // 5. Create plan generation record
  const plan = await prisma.dailyPlanGeneration.create({
    data: {
      projectId,
      processFlowId,
      startDate: start,
      endDate: end,
      totalDays: daysRequired,
      bottleneckOperation: analysis.bottleneck.operationName,
      effectiveCapacity: analysis.effectiveCapacity,
      planningStrategy: strategy,
      status: 'draft',
      notes: `Generated plan for ${quantity} units using ${strategy} strategy. Bottleneck: ${analysis.bottleneck.operationName} (${analysis.effectiveCapacity} units/hr)`
    }
  });

  // 6. Generate daily breakdown for each operation
  console.log('📅 Generating daily breakdown...');
  const processDetails = await generateProcessPlanDetails(
    plan.id,
    processFlow.operations,
    analysis,
    start,
    daysRequired,
    dailyCapacity,
    hoursPerDay
  );

  console.log(`✅ Plan generated: ${processDetails.length} operation-days planned`);

  return {
    plan,
    analysis,
    processDetails,
    summary: {
      totalQuantity: quantity,
      daysRequired,
      dailyCapacity,
      effectiveCapacity: analysis.effectiveCapacity,
      bottleneck: analysis.bottleneck.operationName,
      warnings: validation.warnings
    }
  };
}

/**
 * Generate ProcessPlanDetail records for each operation per day
 */
async function generateProcessPlanDetails(
  planId,
  operations,
  analysis,
  startDate,
  totalDays,
  dailyCapacity,
  hoursPerDay
) {
  const details = [];
  
  // Generate for each day
  for (let day = 0; day < totalDays; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);
    
    // Generate for each operation
    for (const operation of operations) {
      const opBreakdown = analysis.operationBreakdown.find(
        ob => ob.operationId === operation.id
      );
      
      if (!opBreakdown) continue;
      
      // Allocate machines if station has them
      const assignedMachines = await calculateMachineAllocation(
        operation.stationId,
        operation.id
      );
      
      const detail = await prisma.processPlanDetail.create({
        data: {
          planId,
          operationId: operation.id,
          date,
          sequence: operation.sequence,
          
          // Capacity calculation
          inputCapacity: operation.sequence === 1 ? null : analysis.effectiveCapacity,
          operationCapacity: operation.standardOutput || 0,
          effectiveOutput: analysis.effectiveCapacity,
          isBottleneck: opBreakdown.isBottleneck,
          
          // Resource allocation
          stationId: operation.stationId,
          assignedMachines: assignedMachines.count,
          machineIds: assignedMachines.ids,
          
          // Utilization
          capacityUtilization: opBreakdown.capacityUtilization / 100, // Convert to decimal
          hoursRequired: hoursPerDay,
          
          status: 'planned'
        }
      });
      
      details.push(detail);
    }
  }
  
  return details;
}

/**
 * Calculate machine allocation for an operation
 */
async function calculateMachineAllocation(stationId, operationId) {
  if (!stationId) {
    return { count: 0, ids: [] };
  }

  const machines = await prisma.stationMachine.findMany({
    where: {
      stationId,
      status: 'operational'
    },
    select: { id: true }
  });

  return {
    count: machines.length,
    ids: machines.map(m => m.id)
  };
}

/**
 * Distribute work across multiple days
 */
function calculateDailyBreakdown(effectiveCapacity, totalQty, days, hoursPerDay = 8) {
  const dailyCapacity = effectiveCapacity * hoursPerDay;
  const breakdown = [];
  
  let remaining = totalQty;
  
  for (let day = 1; day <= days; day++) {
    const dayQty = Math.min(dailyCapacity, remaining);
    breakdown.push({
      day,
      plannedQty: dayQty,
      remainingQty: remaining - dayQty
    });
    remaining -= dayQty;
  }
  
  return breakdown;
}

/**
 * Apply bottleneck constraint to all downstream operations
 */
function propagateConstraints(operations, bottleneckCapacity) {
  return operations.map(op => ({
    ...op,
    effectiveCapacity: Math.min(op.standardOutput || Infinity, bottleneckCapacity),
    isConstrained: (op.standardOutput || 0) > bottleneckCapacity
  }));
}

/**
 * Get plan with all details
 */
async function getPlanWithDetails(planId) {
  const plan = await prisma.dailyPlanGeneration.findUnique({
    where: { id: planId },
    include: {
      Project: true,
      ProcessFlow: {
        include: {
          operations: {
            include: {
              station: true
            },
            orderBy: { sequence: 'asc' }
          }
        }
      },
      processDetails: {
        include: {
          ProcessOperation: true,
          Station: true
        },
        orderBy: [
          { date: 'asc' },
          { sequence: 'asc' }
        ]
      }
    }
  });

  if (!plan) {
    throw new Error('Plan not found');
  }

  // Group details by date
  const detailsByDate = {};
  for (const detail of plan.processDetails) {
    const dateKey = detail.date.toISOString().split('T')[0];
    if (!detailsByDate[dateKey]) {
      detailsByDate[dateKey] = [];
    }
    detailsByDate[dateKey].push(detail);
  }

  return {
    ...plan,
    detailsByDate
  };
}

module.exports = {
  generateMultiProcessPlan,
  calculateDailyBreakdown,
  propagateConstraints,
  getPlanWithDetails
};
