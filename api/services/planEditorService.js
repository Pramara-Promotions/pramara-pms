// api/services/planEditorService.js
// Interactive plan modification with real-time impact analysis and conflict detection

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Update a single operation in a plan
 * @param {string} detailId - ProcessPlanDetail ID
 * @param {object} updates - Fields to update (e.g., effectiveOutput, date, stationId)
 * @param {string} userId - User making the change
 * @param {string} reason - Reason for modification
 * @returns {object} Updated detail with impact analysis and conflicts
 */
async function updateOperationPlan(detailId, updates, userId, reason) {
  // Get current detail
  const currentDetail = await prisma.processPlanDetail.findUnique({
    where: { id: detailId },
    include: {
      ProcessOperation: true,
      Station: true,
      DailyPlanGeneration: {
        include: {
          processDetails: {
            include: {
              ProcessOperation: true
            },
            orderBy: { sequence: 'asc' }
          }
        }
      }
    }
  });

  if (!currentDetail) {
    throw new Error('Operation plan detail not found');
  }

  const planId = currentDetail.planId;

  // Track changes
  const oldValue = {};
  const newValue = {};
  let changeType = 'quantity'; // Default

  for (const key of Object.keys(updates)) {
    oldValue[key] = currentDetail[key];
    newValue[key] = updates[key];
    
    if (key === 'effectiveOutput' || key === 'inputCapacity' || key === 'operationCapacity') {
      changeType = 'quantity';
    } else if (key === 'date') {
      changeType = 'date';
    } else if (key === 'stationId' || key === 'assignedMachines' || key === 'assignedWorkers') {
      changeType = 'resource';
    } else if (key === 'sequence') {
      changeType = 'sequence';
    }
  }

  // Perform impact analysis BEFORE updating
  const impactAnalysis = await analyzeChangeImpact(currentDetail, updates);

  // Detect conflicts
  const conflicts = await detectConflicts(planId, detailId, updates);

  // Update the detail
  const updated = await prisma.processPlanDetail.update({
    where: { id: detailId },
    data: {
      ...updates,
      updatedAt: new Date()
    },
    include: {
      ProcessOperation: true,
      Station: true
    }
  });

  // Record modification history
  await prisma.planModificationHistory.create({
    data: {
      planId,
      detailId,
      changeType,
      fieldChanged: Object.keys(updates).join(', '),
      oldValue,
      newValue,
      reason,
      impactAnalysis,
      userId
    }
  });

  // Create conflict records if any
  for (const conflict of conflicts) {
    await prisma.planConflict.create({
      data: {
        planId,
        conflictType: conflict.type,
        severity: conflict.severity,
        affectedDetails: conflict.affectedDetails,
        description: conflict.description,
        suggestion: conflict.suggestion
      }
    });
  }

  // If output changed, propagate downstream
  if (updates.effectiveOutput !== undefined || updates.operationCapacity !== undefined) {
    await propagateCapacityChanges(planId, currentDetail.sequence, updated.date);
  }

  return {
    updated,
    impactAnalysis,
    conflicts
  };
}

/**
 * Analyze downstream impact of a change
 */
async function analyzeChangeImpact(currentDetail, updates) {
  const impact = {
    affectedOperations: [],
    bottleneckShifted: false,
    completionDelayed: false,
    estimatedDelayDays: 0,
    resourceConflicts: []
  };

  const planId = currentDetail.planId;
  const sequence = currentDetail.sequence;

  // Get all operations in this plan
  const allDetails = await prisma.processPlanDetail.findMany({
    where: { planId },
    include: { ProcessOperation: true },
    orderBy: { sequence: 'asc' }
  });

  // If output changed, check downstream operations
  if (updates.effectiveOutput !== undefined) {
    const downstreamOps = allDetails.filter(d => d.sequence > sequence && d.date === currentDetail.date);
    
    for (const downstream of downstreamOps) {
      // Next operation's input capacity should equal this operation's output
      if (downstream.inputCapacity !== updates.effectiveOutput) {
        impact.affectedOperations.push({
          operationId: downstream.operationId,
          operationName: downstream.ProcessOperation.name,
          currentInput: downstream.inputCapacity,
          newInput: updates.effectiveOutput,
          impact: 'Input capacity will change'
        });
      }
    }
  }

  // If date changed, check sequence dependencies
  if (updates.date !== undefined) {
    const prevOp = allDetails.find(d => d.sequence === sequence - 1);
    const nextOp = allDetails.find(d => d.sequence === sequence + 1);

    if (prevOp && new Date(updates.date) < new Date(prevOp.date)) {
      impact.resourceConflicts.push({
        type: 'date_dependency',
        message: `Cannot schedule before previous operation (${prevOp.ProcessOperation.name})`
      });
    }

    if (nextOp && new Date(updates.date) > new Date(nextOp.date)) {
      impact.resourceConflicts.push({
        type: 'date_dependency',
        message: `Next operation (${nextOp.ProcessOperation.name}) is scheduled earlier`
      });
    }
  }

  // Check if bottleneck shifted
  const currentBottleneck = allDetails.find(d => d.isBottleneck);
  if (updates.operationCapacity !== undefined && currentDetail.id === currentBottleneck?.id) {
    const newCapacity = updates.operationCapacity;
    const otherOps = allDetails.filter(d => d.id !== currentDetail.id);
    const lowestOtherCapacity = Math.min(...otherOps.map(d => d.operationCapacity || Infinity));

    if (newCapacity > lowestOtherCapacity) {
      impact.bottleneckShifted = true;
    }
  }

  return impact;
}

/**
 * Detect conflicts after proposed changes
 */
async function detectConflicts(planId, detailId, updates) {
  const conflicts = [];

  const currentDetail = await prisma.processPlanDetail.findUnique({
    where: { id: detailId },
    include: { Station: true }
  });

  // Resource overload check
  if (updates.stationId !== undefined || updates.date !== undefined) {
    const targetStationId = updates.stationId ?? currentDetail.stationId;
    const targetDate = updates.date ?? currentDetail.date;

    const sameStationSameDate = await prisma.processPlanDetail.findMany({
      where: {
        planId,
        stationId: targetStationId,
        date: targetDate,
        id: { not: detailId }
      }
    });

    if (sameStationSameDate.length > 0) {
      conflicts.push({
        type: 'resource_overload',
        severity: 'warning',
        affectedDetails: [detailId, ...sameStationSameDate.map(d => d.id)],
        description: `Station ${currentDetail.Station?.name || targetStationId} has ${sameStationSameDate.length + 1} operations on ${new Date(targetDate).toISOString().split('T')[0]}`,
        suggestion: 'Consider splitting across multiple days or assigning different stations'
      });
    }
  }

  // Capacity exceeded check
  if (updates.effectiveOutput !== undefined) {
    const operationCapacity = currentDetail.operationCapacity;
    if (updates.effectiveOutput > operationCapacity) {
      conflicts.push({
        type: 'capacity_exceeded',
        severity: 'critical',
        affectedDetails: [detailId],
        description: `Output ${updates.effectiveOutput} exceeds operation capacity ${operationCapacity}`,
        suggestion: 'Reduce output or increase assigned resources (machines/workers)'
      });
    }
  }

  // Sequence violation check
  if (updates.sequence !== undefined) {
    const allDetails = await prisma.processPlanDetail.findMany({
      where: { planId },
      orderBy: { sequence: 'asc' }
    });

    const sequenceExists = allDetails.some(d => d.sequence === updates.sequence && d.id !== detailId);
    if (sequenceExists) {
      conflicts.push({
        type: 'sequence_violation',
        severity: 'critical',
        affectedDetails: [detailId],
        description: `Sequence ${updates.sequence} is already assigned to another operation`,
        suggestion: 'Use a different sequence number or reorder operations'
      });
    }
  }

  return conflicts;
}

/**
 * Propagate capacity changes downstream
 */
async function propagateCapacityChanges(planId, fromSequence, date) {
  const allDetails = await prisma.processPlanDetail.findMany({
    where: { 
      planId,
      date,
      sequence: { gt: fromSequence }
    },
    orderBy: { sequence: 'asc' }
  });

  let previousOutput = null;

  // Get the output from the changed operation
  const changedOp = await prisma.processPlanDetail.findFirst({
    where: { planId, sequence: fromSequence, date }
  });
  
  if (changedOp) {
    previousOutput = changedOp.effectiveOutput;
  }

  for (const detail of allDetails) {
    if (previousOutput !== null) {
      // Update input capacity to match previous output
      const newEffectiveOutput = Math.min(previousOutput, detail.operationCapacity);
      const newUtilization = detail.operationCapacity > 0 
        ? (newEffectiveOutput / detail.operationCapacity) 
        : 0;

      await prisma.processPlanDetail.update({
        where: { id: detail.id },
        data: {
          inputCapacity: previousOutput,
          effectiveOutput: newEffectiveOutput,
          capacityUtilization: newUtilization,
          updatedAt: new Date()
        }
      });

      previousOutput = newEffectiveOutput;
    }
  }
}

/**
 * Get all conflicts for a plan
 */
async function getPlanConflicts(planId, includeResolved = false) {
  const where = { planId };
  if (!includeResolved) {
    where.resolved = false;
  }

  return await prisma.planConflict.findMany({
    where,
    orderBy: [
      { severity: 'desc' },
      { createdAt: 'desc' }
    ]
  });
}

/**
 * Resolve a conflict
 */
async function resolveConflict(conflictId, resolvedBy, resolutionNote) {
  return await prisma.planConflict.update({
    where: { id: conflictId },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy,
      resolutionNote
    }
  });
}

/**
 * Get modification history for a plan
 */
async function getModificationHistory(planId, limit = 50) {
  return await prisma.planModificationHistory.findMany({
    where: { planId },
    include: {
      User: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

/**
 * Split an operation across multiple days
 */
async function splitOperationAcrossDays(detailId, splitConfig, userId, reason) {
  const original = await prisma.processPlanDetail.findUnique({
    where: { id: detailId },
    include: { ProcessOperation: true }
  });

  if (!original) {
    throw new Error('Operation detail not found');
  }

  const splits = [];

  // Create new details for each split
  for (const split of splitConfig) {
    const newDetail = await prisma.processPlanDetail.create({
      data: {
        planId: original.planId,
        operationId: original.operationId,
        date: split.date,
        sequence: original.sequence,
        inputCapacity: original.inputCapacity,
        operationCapacity: original.operationCapacity,
        effectiveOutput: split.quantity,
        isBottleneck: original.isBottleneck,
        stationId: split.stationId || original.stationId,
        assignedMachines: split.assignedMachines || original.assignedMachines,
        assignedWorkers: split.assignedWorkers || original.assignedWorkers,
        capacityUtilization: split.quantity / original.operationCapacity,
        status: 'planned'
      }
    });
    splits.push(newDetail);
  }

  // Record split modification
  await prisma.planModificationHistory.create({
    data: {
      planId: original.planId,
      detailId: original.id,
      changeType: 'split',
      fieldChanged: 'split across days',
      oldValue: { singleDay: original.date, quantity: original.effectiveOutput },
      newValue: { splits: splitConfig },
      reason,
      userId
    }
  });

  // Delete original
  await prisma.processPlanDetail.delete({
    where: { id: detailId }
  });

  return splits;
}

module.exports = {
  updateOperationPlan,
  analyzeChangeImpact,
  detectConflicts,
  propagateCapacityChanges,
  getPlanConflicts,
  resolveConflict,
  getModificationHistory,
  splitOperationAcrossDays
};
