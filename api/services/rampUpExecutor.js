const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Execute an approved ramp-up opportunity
 * Creates a RampUpSchedule and begins modifying the daily plan
 * @param {string} opportunityId - LoadBalancingOpportunity ID
 * @param {string} [approvedBy] - User ID who approved
 * @returns {Promise<Object>}
 */
async function executeRampUp(opportunityId, approvedBy = null) {
    try {
        // Fetch opportunity with all details
        const opportunity = await prisma.loadBalancingOpportunity.findUnique({
            where: { id: opportunityId },
            include: {
                DailyPlanGeneration: {
                    include: {
                        Project: { select: { id: true, code: true, name: true } },
                    },
                },
                ResourceAvailabilityEvent: true,
            },
        });

        if (!opportunity) {
            throw new Error(`Opportunity ${opportunityId} not found`);
        }

        if (opportunity.status !== 'pending') {
            throw new Error(`Opportunity ${opportunityId} is not pending (status: ${opportunity.status})`);
        }

        // Extract ramp-up plan from proposedChanges
        const rampUpPlan = opportunity.proposedChanges?.rampUpPlan || {};
        const startDate = new Date();
        const endDate = rampUpPlan.endDate ? new Date(rampUpPlan.endDate) :
            new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        // Create RampUpSchedule
        const schedule = await prisma.rampUpSchedule.create({
            data: {
                opportunityId,
                projectId: opportunity.targetProjectId,
                stationId: opportunity.ResourceAvailabilityEvent?.stationId,
                startDate,
                endDate,
                status: 'SCHEDULED',
                progress: 0,
                adjustments: {
                    createdAt: new Date(),
                    initialPlan: rampUpPlan,
                },
            },
        });

        // Update opportunity status
        await prisma.loadBalancingOpportunity.update({
            where: { id: opportunityId },
            data: {
                status: 'accepted',
                decidedBy: approvedBy,
                decidedAt: new Date(),
                implementedAt: new Date(),
            },
        });

        // Begin modifying daily schedule
        const scheduleUpdate = await updateDailySchedule({
            planId: opportunity.planId,
            rampUpPlan: rampUpPlan.days || [],
            opportunityId,
        });

        console.log(`[rampUpExecutor] Executed ramp-up for opportunity ${opportunityId}: ${scheduleUpdate.updated.length} days updated`);

        return {
            success: true,
            opportunityId,
            scheduleId: schedule.id,
            updatedDays: scheduleUpdate.updated.length,
            schedule,
        };
    } catch (error) {
        console.error('[rampUpExecutor] Failed to execute ramp-up:', error);
        throw error;
    }
}

/**
 * Update daily schedule based on ramp-up plan
 * Modifies ProcessPlanDetail records to reflect increased capacity
 * @param {Object} params - { planId, rampUpPlan, opportunityId }
 * @returns {Promise<Object>}
 */
async function updateDailySchedule(params) {
    const { planId, rampUpPlan, opportunityId } = params;

    try {
        // Fetch existing plan details
        const planDetails = await prisma.dailyPlanStationAuto.findMany({
            where: { planGenerationId: planId },
            orderBy: { date: 'asc' },
            take: 10, // Limit to near-term schedule
        });

        const updated = [];

        for (const dayPlan of rampUpPlan) {
            const targetDate = new Date(dayPlan.date);

            // Find matching plan detail
            const matchingDetail = planDetails.find(detail => {
                const detailDate = new Date(detail.date);
                return detailDate.toDateString() === targetDate.toDateString();
            });

            if (matchingDetail) {
                // Increase planned quantity
                const newQuantity = matchingDetail.quantityPlanned + dayPlan.capacityIncrement;

                await prisma.dailyPlanStationAuto.update({
                    where: { id: matchingDetail.id },
                    data: {
                        quantityPlanned: newQuantity,
                        notes: matchingDetail.notes
                            ? `${matchingDetail.notes}; Ramp-up +${dayPlan.capacityIncrement}`
                            : `Ramp-up opportunity ${opportunityId}: +${dayPlan.capacityIncrement}`,
                    },
                });

                updated.push({
                    id: matchingDetail.id,
                    date: targetDate,
                    oldQuantity: matchingDetail.quantityPlanned,
                    newQuantity,
                    increment: dayPlan.capacityIncrement,
                });
            }
        }

        console.log(`[rampUpExecutor] Updated ${updated.length} daily schedule entries for plan ${planId}`);
        return { success: true, updated };
    } catch (error) {
        console.error('[rampUpExecutor] Failed to update daily schedule:', error);
        throw error;
    }
}

/**
 * Monitor progress of an active ramp-up
 * Compares actual production vs planned increases
 * @param {string} opportunityId - LoadBalancingOpportunity ID
 * @returns {Promise<Object>}
 */
async function monitorRampUpProgress(opportunityId) {
    try {
        const opportunity = await prisma.loadBalancingOpportunity.findUnique({
            where: { id: opportunityId },
            include: {
                RampUpSchedule: true,
            },
        });

        if (!opportunity || !opportunity.RampUpSchedule || opportunity.RampUpSchedule.length === 0) {
            return {
                progress: [],
                opportunityId,
                message: 'No active ramp-up schedule found',
            };
        }

        const schedule = opportunity.RampUpSchedule[0];
        const rampUpPlan = opportunity.proposedChanges?.rampUpPlan?.days || [];

        const progress = [];
        for (const dayPlan of rampUpPlan) {
            const targetDate = new Date(dayPlan.date);

            // Fetch actual production for that day
            const actual = await prisma.dailyPlanStationAuto.findMany({
                where: {
                    planGenerationId: opportunity.planId,
                    date: targetDate,
                },
                select: {
                    quantityActual: true,
                    quantityPlanned: true,
                },
            });

            const totalActual = actual.reduce((sum, d) => sum + (d.quantityActual || 0), 0);
            const totalPlanned = actual.reduce((sum, d) => sum + d.quantityPlanned, 0);

            progress.push({
                day: dayPlan.day,
                date: targetDate,
                plannedIncrement: dayPlan.capacityIncrement,
                actualProduction: totalActual,
                plannedProduction: totalPlanned,
                variance: totalActual - totalPlanned,
                onTrack: totalActual >= totalPlanned * 0.9, // 90% threshold
            });
        }

        // Calculate overall progress percentage
        const completedDays = progress.filter(p => new Date(p.date) < new Date()).length;
        const totalDays = rampUpPlan.length;
        const progressPercent = Math.round((completedDays / totalDays) * 100);

        // Update schedule progress
        await prisma.rampUpSchedule.update({
            where: { id: schedule.id },
            data: {
                progress: progressPercent,
                status: progressPercent === 100 ? 'COMPLETED' : 'IN_PROGRESS',
            },
        });

        console.log(`[rampUpExecutor] Monitored ramp-up ${opportunityId}: ${progressPercent}% complete`);
        return {
            opportunityId,
            scheduleId: schedule.id,
            progress,
            overallProgress: progressPercent,
            status: progressPercent === 100 ? 'COMPLETED' : 'IN_PROGRESS',
        };
    } catch (error) {
        console.error('[rampUpExecutor] Failed to monitor ramp-up progress:', error);
        throw error;
    }
}

/**
 * Adjust ramp-up plan if actual performance deviates from plan
 * @param {string} opportunityId - LoadBalancingOpportunity ID
 * @returns {Promise<Object>}
 */
async function adjustIfNeeded(opportunityId) {
    try {
        const progressData = await monitorRampUpProgress(opportunityId);

        if (!progressData.progress || progressData.progress.length === 0) {
            return { adjusted: false, opportunityId, message: 'No progress data to analyze' };
        }

        // Check if any days are significantly off-track
        const offTrackDays = progressData.progress.filter(p => !p.onTrack && new Date(p.date) < new Date());

        if (offTrackDays.length > 0) {
            const opportunity = await prisma.loadBalancingOpportunity.findUnique({
                where: { id: opportunityId },
                include: { RampUpSchedule: true },
            });

            const schedule = opportunity.RampUpSchedule[0];

            // Record adjustment
            const adjustments = schedule.adjustments || {};
            adjustments.courseCorrections = adjustments.courseCorrections || [];
            adjustments.courseCorrections.push({
                date: new Date(),
                reason: `${offTrackDays.length} days off-track`,
                offTrackDays: offTrackDays.map(d => ({ day: d.day, variance: d.variance })),
            });

            await prisma.rampUpSchedule.update({
                where: { id: schedule.id },
                data: {
                    status: 'ADJUSTED',
                    adjustments,
                },
            });

            console.log(`[rampUpExecutor] Adjusted ramp-up ${opportunityId}: ${offTrackDays.length} days off-track`);
            return {
                adjusted: true,
                opportunityId,
                adjustmentCount: adjustments.courseCorrections.length,
                offTrackDays: offTrackDays.length,
            };
        }

        return { adjusted: false, opportunityId, message: 'Performance on track, no adjustment needed' };
    } catch (error) {
        console.error('[rampUpExecutor] Failed to adjust ramp-up:', error);
        throw error;
    }
}

module.exports = {
    executeRampUp,
    updateDailySchedule,
    monitorRampUpProgress,
    adjustIfNeeded,
};
