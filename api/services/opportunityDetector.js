const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Analyze an availability event and identify projects that could benefit
 * @param {Object} event - ResourceAvailabilityEvent record
 * @returns {Promise<Array>} Array of opportunity records created
 */
async function analyzeAvailabilityEvent(event) {
    try {
        // Only process NEW events
        if (event.status !== 'NEW') {
            return { opportunities: [], message: 'Event already processed' };
        }

        const opportunities = [];

        // Find active daily plan generations that could benefit
        const activePlans = await prisma.dailyPlanGeneration.findMany({
            where: {
                status: { in: ['pending', 'approved'] },
                // Plans that have bottlenecks or capacity constraints
                OR: [
                    { bottleneckOperation: { not: null } },
                    { effectiveCapacity: { lt: 1000 } }, // Adjust threshold
                ],
            },
            include: {
                Project: { select: { id: true, code: true, name: true } },
            },
            take: 20,
        });

        for (const plan of activePlans) {
            // Skip if this is the source project
            if (event.projectId && event.projectId === plan.projectId) {
                continue;
            }

            // Calculate potential benefit
            const benefit = await calculateBenefit(event, plan);

            if (benefit.feasible) {
                const rampUpPlan = await calculateRampUpPlan({
                    event,
                    plan,
                    benefit,
                });

                const risk = await assessRisk({ event, plan, rampUpPlan });

                const opportunity = await prisma.loadBalancingOpportunity.create({
                    data: {
                        availabilityEventId: event.id,
                        planId: plan.id,
                        sourceProjectId: event.projectId,
                        targetProjectId: plan.projectId,
                        opportunityType: 'gradual_ramp_up',
                        title: `Increase capacity for ${plan.Project.name}`,
                        description: `${event.resourceType} available: ${event.resourceName}. Can accelerate ${plan.Project.code} by ramping up gradually.`,
                        currentBottleneck: plan.bottleneckOperation,
                        proposedChanges: {
                            rampUpPlan,
                            resourceType: event.resourceType,
                            resourceId: event.resourceId,
                        },
                        estimatedTimeSaved: benefit.daysSaved,
                        riskLevel: risk.riskLevel,
                        status: 'pending',
                        confidence: benefit.confidence,
                        priority: Math.min(10, Math.ceil(benefit.daysSaved)),
                    },
                    include: {
                        sourceProject: { select: { code: true, name: true } },
                        targetProject: { select: { code: true, name: true } },
                    },
                });

                opportunities.push(opportunity);
            }
        }

        // Mark event as analyzed
        await prisma.resourceAvailabilityEvent.update({
            where: { id: event.id },
            data: {
                status: opportunities.length > 0 ? 'OPPORTUNITIES_CREATED' : 'IGNORED',
            },
        });

        console.log(`[opportunityDetector] Analyzed event ${event.id}: ${opportunities.length} opportunities created`);
        return { opportunities, count: opportunities.length };
    } catch (error) {
        console.error('[opportunityDetector] Failed to analyze event:', error);
        throw error;
    }
}

/**
 * Calculate potential benefit of applying available resource to a plan
 */
async function calculateBenefit(event, plan) {
    // Simplified benefit calculation
    const capacityIncrease = event.capacityDelta || 100;
    const currentCapacity = plan.effectiveCapacity || 500;

    const newCapacity = currentCapacity + capacityIncrease;
    const speedupRatio = newCapacity / currentCapacity;

    // Estimate days saved (rough approximation)
    const estimatedDuration = 30; // Default estimate
    const daysSaved = estimatedDuration * (1 - 1 / speedupRatio);

    return {
        feasible: capacityIncrease > 0 && daysSaved > 1,
        daysSaved: Math.round(daysSaved * 10) / 10,
        capacityIncrease,
        speedupRatio: Math.round(speedupRatio * 100) / 100,
        confidence: 0.75,
    };
}

/**
 * Calculate a gradual ramp-up plan (increase capacity over multiple days)
 * @param {Object} context - { event, plan, benefit }
 * @returns {Promise<Object>} Ramp-up schedule
 */
async function calculateRampUpPlan(context) {
    const { event, benefit } = context;
    const totalIncrease = event.capacityDelta || 100;
    const rampUpDays = 3; // Default 3-day ramp-up

    const dailyIncrement = Math.ceil(totalIncrease / rampUpDays);
    const days = [];

    for (let i = 0; i < rampUpDays; i++) {
        const increment = Math.min(dailyIncrement, totalIncrease - (dailyIncrement * i));
        days.push({
            day: i + 1,
            date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
            capacityIncrement: increment,
            cumulativeIncrease: dailyIncrement * (i + 1),
        });
    }

    return {
        days,
        totalIncrease,
        rampUpDays,
        startDate: new Date(),
        endDate: new Date(Date.now() + rampUpDays * 24 * 60 * 60 * 1000),
    };
}

/**
 * Assess risk level of implementing a capacity change
 * @param {Object} plan - { event, plan, rampUpPlan }
 * @returns {Promise<Object>} Risk assessment
 */
async function assessRisk(plan) {
    const { event, rampUpPlan } = plan;

    const notes = [];
    let riskScore = 0;

    // Risk factors
    if (event.resourceType === 'machine' && event.eventType === 'new_resource') {
        notes.push('New machine may require calibration period');
        riskScore += 2;
    }

    if (rampUpPlan.totalIncrease > 500) {
        notes.push('Large capacity increase may strain downstream operations');
        riskScore += 3;
    }

    if (rampUpPlan.rampUpDays < 3) {
        notes.push('Rapid ramp-up may cause quality issues');
        riskScore += 2;
    }

    // Determine risk level
    let riskLevel = 'low';
    if (riskScore >= 5) riskLevel = 'high';
    else if (riskScore >= 3) riskLevel = 'medium';

    return {
        riskLevel,
        riskScore,
        notes,
        recommendation: riskLevel === 'low' ? 'Safe to proceed' : 'Review carefully before approval',
    };
}

/**
 * Generate a complete opportunity proposal from an event
 * @param {string} eventId - ResourceAvailabilityEvent ID
 * @returns {Promise<Object>}
 */
async function generateProposal(eventId) {
    try {
        const event = await prisma.resourceAvailabilityEvent.findUnique({
            where: { id: eventId },
            include: {
                project: true,
                station: true,
                mold: true,
            },
        });

        if (!event) {
            throw new Error(`Event ${eventId} not found`);
        }

        const result = await analyzeAvailabilityEvent(event);
        return {
            proposal: {
                event,
                opportunities: result.opportunities,
                count: result.count,
            },
            status: result.count > 0 ? 'opportunities_generated' : 'no_opportunities',
        };
    } catch (error) {
        console.error('[opportunityDetector] Failed to generate proposal:', error);
        throw error;
    }
}

module.exports = {
    analyzeAvailabilityEvent,
    calculateRampUpPlan,
    assessRisk,
    generateProposal,
};
