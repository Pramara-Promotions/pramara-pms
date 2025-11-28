// api/services/loadBalancingService.js
// Adaptive load balancing - detect resource changes and suggest optimizations

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Record a resource availability change
 * @param {object} event - Resource availability event
 * @returns {object} Created event with generated opportunities
 */
async function recordAvailabilityEvent({
  resourceType,
  resourceId,
  resourceName,
  eventType,
  previousValue,
  newValue,
  effectiveFrom,
  effectiveTo,
  reason,
  detectedBy = 'system'
}) {
  // Create event
  const event = await prisma.resourceAvailabilityEvent.create({
    data: {
      resourceType,
      resourceId,
      resourceName,
      eventType,
      previousValue,
      newValue,
      effectiveFrom: new Date(effectiveFrom),
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      reason,
      detectedBy
    }
  });

  // Auto-generate opportunities based on event type
  const opportunities = await generateOpportunities(event);

  return { event, opportunities };
}

/**
 * Generate load balancing opportunities from an availability event
 */
async function generateOpportunities(event) {
  const opportunities = [];

  // Find active plans that could benefit from this change
  const activePlans = await prisma.dailyPlanGeneration.findMany({
    where: {
      status: { in: ['draft', 'pending_approval', 'approved', 'active'] },
      startDate: { lte: event.effectiveTo || new Date('2099-12-31') },
      endDate: { gte: event.effectiveFrom }
    },
    include: {
      processDetails: {
        include: {
          ProcessOperation: true,
          Station: true
        },
        orderBy: { sequence: 'asc' }
      }
    }
  });

  for (const plan of activePlans) {
    // Check if this resource change affects the plan
    const affectedOperations = plan.processDetails.filter(detail => {
      if (event.resourceType === 'station') {
        return detail.stationId === parseInt(event.resourceId);
      } else if (event.resourceType === 'machine') {
        // Check if machine is linked to station used in plan
        return detail.Station?.id === parseInt(event.resourceId);
      }
      return false;
    });

    if (affectedOperations.length === 0) continue;

    // Generate opportunity based on event type
    if (event.eventType === 'increased_capacity' || event.eventType === 'new_resource') {
      const opp = await createAccelerationOpportunity(
        plan,
        event,
        affectedOperations
      );
      if (opp) opportunities.push(opp);
    } else if (event.eventType === 'decreased_capacity' || event.eventType === 'breakdown') {
      const opp = await createRiskMitigationOpportunity(
        plan,
        event,
        affectedOperations
      );
      if (opp) opportunities.push(opp);
    } else if (event.eventType === 'maintenance') {
      const opp = await createReallocationOpportunity(
        plan,
        event,
        affectedOperations
      );
      if (opp) opportunities.push(opp);
    }
  }

  return opportunities;
}

/**
 * Create opportunity to accelerate production with new/increased capacity
 */
async function createAccelerationOpportunity(plan, event, affectedOperations) {
  const bottleneckOp = affectedOperations.find(op => op.isBottleneck);
  
  if (!bottleneckOp) {
    // Not affecting bottleneck, lower priority
    return null;
  }

  const currentCapacity = bottleneckOp.operationCapacity;
  const capacityIncrease = event.newValue.capacity - (event.previousValue?.capacity || 0);
  const potentialSpeedup = (capacityIncrease / currentCapacity) * 100;

  const proposedChanges = [
    {
      detailId: bottleneckOp.id,
      field: 'operationCapacity',
      currentValue: currentCapacity,
      proposedValue: currentCapacity + capacityIncrease,
      reason: `Increased ${event.resourceType} capacity available`
    }
  ];

  // Estimate time saved
  const totalDays = plan.totalDays;
  const estimatedTimeSaved = totalDays * (potentialSpeedup / 100);

  const opportunity = await prisma.loadBalancingOpportunity.create({
    data: {
      availabilityEventId: event.id,
      planId: plan.id,
      opportunityType: 'accelerate_production',
      title: `Accelerate production using new ${event.resourceName}`,
      description: `${event.resourceName} capacity increased by ${capacityIncrease} units/hr. This affects bottleneck operation "${bottleneckOp.ProcessOperation.name}".`,
      currentBottleneck: bottleneckOp.ProcessOperation.name,
      proposedChanges,
      estimatedTimeSaved,
      riskLevel: 'low',
      confidence: 0.85,
      priority: 8
    }
  });

  return opportunity;
}

/**
 * Create opportunity to mitigate risk from decreased capacity
 */
async function createRiskMitigationOpportunity(plan, event, affectedOperations) {
  const capacityLoss = (event.previousValue?.capacity || 0) - event.newValue.capacity;
  
  // Check if any affected operations are critical
  const criticalOps = affectedOperations.filter(
    op => op.capacityUtilization > 0.7 || op.isBottleneck
  );

  if (criticalOps.length === 0) {
    return null; // No critical impact
  }

  const proposedChanges = criticalOps.map(op => ({
    detailId: op.id,
    field: 'date',
    currentValue: op.date,
    proposedValue: new Date(new Date(op.date).getTime() + 86400000 * 2), // Add 2 days
    reason: `Shift production to compensate for ${event.resourceName} ${event.eventType}`
  }));

  const opportunity = await prisma.loadBalancingOpportunity.create({
    data: {
      availabilityEventId: event.id,
      planId: plan.id,
      opportunityType: 'reduce_bottleneck',
      title: `Mitigate ${event.resourceName} ${event.eventType}`,
      description: `${event.resourceName} capacity reduced by ${capacityLoss} units/hr. ${criticalOps.length} critical operations affected.`,
      currentBottleneck: criticalOps[0].ProcessOperation.name,
      proposedChanges,
      estimatedTimeSaved: -2, // Delay expected
      riskLevel: 'high',
      confidence: 0.75,
      priority: 9
    }
  });

  return opportunity;
}

/**
 * Create opportunity to reallocate during maintenance
 */
async function createReallocationOpportunity(plan, event, affectedOperations) {
  // Find alternative stations for affected operations
  const alternatives = [];

  for (const op of affectedOperations) {
    const alternativeStations = await prisma.station.findMany({
      where: {
        category: op.Station?.category,
        id: { not: op.stationId },
        isActive: true
      }
    });

    if (alternativeStations.length > 0) {
      alternatives.push({
        detailId: op.id,
        field: 'stationId',
        currentValue: op.stationId,
        proposedValue: alternativeStations[0].id,
        alternativeName: alternativeStations[0].name,
        reason: `Reallocate during ${event.resourceName} maintenance`
      });
    }
  }

  if (alternatives.length === 0) {
    return null; // No alternatives available
  }

  const opportunity = await prisma.loadBalancingOpportunity.create({
    data: {
      availabilityEventId: event.id,
      planId: plan.id,
      opportunityType: 'optimize_utilization',
      title: `Reallocate operations during ${event.resourceName} maintenance`,
      description: `${affectedOperations.length} operations can be moved to alternative stations during maintenance window.`,
      proposedChanges: alternatives,
      estimatedTimeSaved: 0, // No delay
      riskLevel: 'medium',
      confidence: 0.7,
      priority: 6
    }
  });

  return opportunity;
}

/**
 * Get all pending opportunities for a plan
 */
async function getPendingOpportunities(planId) {
  return await prisma.loadBalancingOpportunity.findMany({
    where: {
      planId,
      status: 'pending',
      expiresAt: { gt: new Date() }
    },
    include: {
      ResourceAvailabilityEvent: true
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' }
    ]
  });
}

/**
 * Accept and implement an opportunity
 */
async function acceptOpportunity(opportunityId, decidedBy, decisionNote) {
  const opportunity = await prisma.loadBalancingOpportunity.findUnique({
    where: { id: opportunityId },
    include: { DailyPlanGeneration: true }
  });

  if (!opportunity) {
    throw new Error('Opportunity not found');
  }

  if (opportunity.status !== 'pending') {
    throw new Error('Opportunity already processed');
  }

  // Apply proposed changes
  const appliedChanges = [];
  for (const change of opportunity.proposedChanges) {
    const updated = await prisma.processPlanDetail.update({
      where: { id: change.detailId },
      data: {
        [change.field]: change.proposedValue,
        updatedAt: new Date()
      }
    });
    appliedChanges.push(updated);
  }

  // Update opportunity status
  const accepted = await prisma.loadBalancingOpportunity.update({
    where: { id: opportunityId },
    data: {
      status: 'implemented',
      decidedBy,
      decidedAt: new Date(),
      decisionNote,
      implementedAt: new Date()
    }
  });

  // Propagate capacity changes if needed
  const planEditorService = require('./planEditorService');
  for (const change of opportunity.proposedChanges) {
    if (change.field === 'operationCapacity' || change.field === 'effectiveOutput') {
      const detail = await prisma.processPlanDetail.findUnique({
        where: { id: change.detailId }
      });
      if (detail) {
        await planEditorService.propagateCapacityChanges(
          detail.planId,
          detail.sequence,
          detail.date
        );
      }
    }
  }

  return { accepted, appliedChanges };
}

/**
 * Reject an opportunity
 */
async function rejectOpportunity(opportunityId, decidedBy, decisionNote) {
  return await prisma.loadBalancingOpportunity.update({
    where: { id: opportunityId },
    data: {
      status: 'rejected',
      decidedBy,
      decidedAt: new Date(),
      decisionNote
    }
  });
}

/**
 * Create a gradual ramp-up opportunity for new projects
 */
async function suggestGradualRampUp(planId, rampUpDays = 5) {
  const plan = await prisma.dailyPlanGeneration.findUnique({
    where: { id: planId },
    include: {
      processDetails: {
        include: { ProcessOperation: true },
        orderBy: { date: 'asc' }
      }
    }
  });

  if (!plan) {
    throw new Error('Plan not found');
  }

  // Group by date
  const dateGroups = {};
  for (const detail of plan.processDetails) {
    const dateKey = detail.date.toISOString().split('T')[0];
    if (!dateGroups[dateKey]) dateGroups[dateKey] = [];
    dateGroups[dateKey].push(detail);
  }

  const dates = Object.keys(dateGroups).sort();
  if (dates.length < rampUpDays) {
    throw new Error('Not enough days for ramp-up');
  }

  const proposedChanges = [];
  
  // Create gradual ramp-up (50% -> 70% -> 85% -> 95% -> 100%)
  const rampUpFactors = [0.5, 0.7, 0.85, 0.95, 1.0];
  
  for (let i = 0; i < Math.min(rampUpDays, dates.length); i++) {
    const details = dateGroups[dates[i]];
    const factor = rampUpFactors[Math.min(i, rampUpFactors.length - 1)];
    
    for (const detail of details) {
      proposedChanges.push({
        detailId: detail.id,
        field: 'effectiveOutput',
        currentValue: detail.effectiveOutput,
        proposedValue: Math.ceil(detail.effectiveOutput * factor),
        reason: `Day ${i + 1} ramp-up (${(factor * 100).toFixed(0)}% capacity)`
      });
    }
  }

  const opportunity = await prisma.loadBalancingOpportunity.create({
    data: {
      planId,
      opportunityType: 'gradual_ramp_up',
      title: `Gradual ${rampUpDays}-day ramp-up for new project`,
      description: `Reduce initial risk by starting at 50% capacity and gradually increasing to full capacity over ${rampUpDays} days.`,
      proposedChanges,
      estimatedTimeSaved: 0,
      riskLevel: 'low',
      confidence: 0.9,
      priority: 7
    }
  });

  return opportunity;
}

module.exports = {
  recordAvailabilityEvent,
  generateOpportunities,
  getPendingOpportunities,
  acceptOpportunity,
  rejectOpportunity,
  suggestGradualRampUp
};
