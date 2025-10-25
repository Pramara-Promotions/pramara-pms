// api/lib/learningEngine.js
/**
 * Learning Engine for Worker Suggestions and Adaptive Planning
 * Tracks performance, learns from planner overrides, and provides intelligent suggestions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calculate worker performance score
 * @param {Object} performance - Performance metrics
 * @returns {number} Score (0-100)
 */
function calculatePerformanceScore(performance) {
  const efficiencyWeight = 0.5;
  const qualityWeight = 0.4;
  const consistencyWeight = 0.1;
  
  const score = 
    (performance.avgEfficiency * efficiencyWeight) +
    (performance.avgQualityRate * qualityWeight) +
    (performance.consistencyScore * consistencyWeight);
  
  return Math.round(score * 10) / 10;
}

/**
 * Get worker performance summary
 * @param {string} workerId - Worker ID
 * @param {number} days - Number of days to look back
 * @returns {Promise<Object>} Performance summary
 */
async function getWorkerPerformance(workerId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  const performances = await prisma.workerPerformance.findMany({
    where: {
      workerId,
      date: { gte: since },
    },
  });
  
  if (performances.length === 0) {
    return {
      avgEfficiency: 0,
      avgQualityRate: 0,
      consistencyScore: 0,
      totalShifts: 0,
      score: 0,
    };
  }
  
  const avgEfficiency = performances.reduce((sum, p) => sum + p.efficiency, 0) / performances.length;
  const avgQualityRate = performances.reduce((sum, p) => sum + p.qualityRate, 0) / performances.length;
  
  // Calculate consistency (lower variance = higher consistency)
  const efficiencyVariance = performances.reduce((sum, p) => {
    return sum + Math.pow(p.efficiency - avgEfficiency, 2);
  }, 0) / performances.length;
  
  const consistencyScore = Math.max(0, 100 - efficiencyVariance);
  
  const score = calculatePerformanceScore({
    avgEfficiency,
    avgQualityRate,
    consistencyScore,
  });
  
  return {
    avgEfficiency: Math.round(avgEfficiency * 10) / 10,
    avgQualityRate: Math.round(avgQualityRate * 10) / 10,
    consistencyScore: Math.round(consistencyScore * 10) / 10,
    totalShifts: performances.length,
    score,
  };
}

/**
 * Get worker-station affinity (how well worker performs at specific station)
 * @param {string} workerId - Worker ID
 * @param {number} stationId - Station ID
 * @param {number} days - Number of days to look back
 * @returns {Promise<Object>} Affinity metrics
 */
async function getWorkerStationAffinity(workerId, stationId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  const performances = await prisma.workerPerformance.findMany({
    where: {
      workerId,
      stationId,
      date: { gte: since },
    },
  });
  
  if (performances.length === 0) {
    return { affinity: 0, shiftsWorked: 0 };
  }
  
  const avgEfficiency = performances.reduce((sum, p) => sum + p.efficiency, 0) / performances.length;
  const avgQualityRate = performances.reduce((sum, p) => sum + p.qualityRate, 0) / performances.length;
  
  const affinity = (avgEfficiency * 0.6) + (avgQualityRate * 0.4);
  
  return {
    affinity: Math.round(affinity * 10) / 10,
    shiftsWorked: performances.length,
    avgEfficiency: Math.round(avgEfficiency * 10) / 10,
    avgQualityRate: Math.round(avgQualityRate * 10) / 10,
  };
}

/**
 * Suggest workers for a station based on skills, performance, and availability
 * @param {number} stationId - Station ID
 * @param {string} shiftId - Shift ID
 * @param {Date} date - Date of the shift
 * @param {number} limit - Number of suggestions
 * @returns {Promise<Array>} Suggested workers with reasoning
 */
async function suggestWorkersForStation(stationId, shiftId, date, limit = 3) {
  // Get station details and required skills
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    include: {
      StationType: true,
    },
  });
  
  if (!station) {
    throw new Error('Station not found');
  }
  
  const requiredSkills = station.StationType?.defaultSkills || [];
  
  // Get all active workers with required skills
  const workers = await prisma.worker.findMany({
    where: {
      status: 'active',
      skills: requiredSkills.length > 0 ? { hasSome: requiredSkills } : undefined,
    },
    include: {
      Provider: true,
    },
  });
  
  // Get existing assignments for this date/shift
  const existingAssignments = await prisma.shiftPlan.findMany({
    where: {
      date,
      shiftId,
    },
    select: { workerId: true },
  });
  
  const assignedWorkerIds = existingAssignments.map(a => a.workerId);
  
  // Score each available worker
  const scoredWorkers = await Promise.all(
    workers
      .filter(w => !assignedWorkerIds.includes(w.id))
      .map(async (worker) => {
        const performance = await getWorkerPerformance(worker.id);
        const affinity = await getWorkerStationAffinity(worker.id, stationId);
        
        // Check skill match
        const hasAllSkills = requiredSkills.every(skill => worker.skills.includes(skill));
        const skillMatchScore = hasAllSkills ? 100 : 
          (worker.skills.filter(s => requiredSkills.includes(s)).length / requiredSkills.length) * 100;
        
        // Provider stability (for third-party workers)
        const providerScore = worker.workerType === 'third_party' && worker.Provider
          ? worker.Provider.stabilityScore || 0
          : 100; // Company workers get max score
        
        // Calculate composite score
        const compositeScore = 
          (performance.score * 0.4) +
          (affinity.affinity * 0.3) +
          (skillMatchScore * 0.2) +
          (providerScore * 0.1);
        
        // Generate reasoning
        const reasons = [];
        if (affinity.shiftsWorked > 5) {
          reasons.push(`Worked ${affinity.shiftsWorked} shifts at this station (${affinity.affinity}% efficiency)`);
        }
        if (performance.score >= 80) {
          reasons.push(`High performer (${performance.score}/100 score)`);
        }
        if (hasAllSkills) {
          reasons.push(`Has all required skills: ${requiredSkills.join(', ')}`);
        }
        if (worker.workerType === 'company') {
          reasons.push('Company worker (higher stability)');
        } else if (providerScore >= 70) {
          reasons.push(`Stable provider (${providerScore}/100 stability)`);
        }
        
        return {
          workerId: worker.id,
          workerName: worker.name,
          workerType: worker.workerType,
          providerName: worker.Provider?.name,
          score: Math.round(compositeScore * 10) / 10,
          performanceScore: performance.score,
          affinityScore: affinity.affinity,
          skillMatchScore: Math.round(skillMatchScore),
          providerStability: Math.round(providerScore),
          shiftsAtStation: affinity.shiftsWorked,
          totalShifts: performance.totalShifts,
          reasoning: reasons,
        };
      })
  );
  
  // Sort by score and return top suggestions
  return scoredWorkers
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Learn from planner override
 * @param {string} plannerId - Planner user ID
 * @param {string} context - Context type (e.g., 'worker_assignment')
 * @param {Object} contextData - Context-specific data
 * @param {string} systemSuggestion - What system suggested
 * @param {string} plannerChoice - What planner chose
 * @returns {Promise<void>}
 */
async function learnFromOverride(plannerId, context, contextData, systemSuggestion, plannerChoice) {
  // Check if this preference already exists
  const existing = await prisma.plannerPreference.findFirst({
    where: {
      plannerId,
      preferenceType: context,
      context: contextData,
      systemSuggestion,
      plannerChoice,
    },
  });
  
  if (existing) {
    // Increment frequency
    await prisma.plannerPreference.update({
      where: { id: existing.id },
      data: {
        frequency: existing.frequency + 1,
        lastUsed: new Date(),
      },
    });
  } else {
    // Create new preference
    await prisma.plannerPreference.create({
      data: {
        plannerId,
        preferenceType: context,
        context: contextData,
        systemSuggestion,
        plannerChoice,
        frequency: 1,
        lastUsed: new Date(),
      },
    });
  }
}

/**
 * Get planner preferences for a context
 * @param {string} plannerId - Planner user ID
 * @param {string} context - Context type
 * @param {Object} contextData - Context-specific data
 * @returns {Promise<Array>} Preferences
 */
async function getPlannerPreferences(plannerId, context, contextData) {
  const preferences = await prisma.plannerPreference.findMany({
    where: {
      plannerId,
      preferenceType: context,
      context: contextData,
    },
    orderBy: [
      { frequency: 'desc' },
      { lastUsed: 'desc' },
    ],
    take: 5,
  });
  
  return preferences;
}

/**
 * Generate adaptation suggestions based on shift performance
 * @param {string} dailyPlanId - Daily plan ID
 * @param {Object} shiftData - Shift performance data
 * @returns {Promise<Object>} Adaptation suggestion
 */
async function generateAdaptationSuggestion(dailyPlanId, shiftData) {
  const { stationId, targetQty, actualQty, variance } = shiftData;
  
  if (variance > 0) {
    // Ahead of schedule
    return {
      trigger: 'ahead_schedule',
      affectedStationId: stationId,
      systemSuggestion: {
        action: 'reassign_workers',
        details: `Station is ${Math.abs(variance)} units ahead. Consider reassigning workers to behind-schedule stations.`,
        reasoning: 'Optimize resource utilization by balancing workload',
      },
    };
  } else if (variance < -10) {
    // Behind schedule by more than 10 units
    const percentBehind = Math.abs((variance / targetQty) * 100);
    
    if (percentBehind > 20) {
      return {
        trigger: 'behind_schedule',
        affectedStationId: stationId,
        systemSuggestion: {
          action: 'add_resources',
          details: `Station is ${Math.abs(variance)} units behind (${percentBehind.toFixed(1)}%). Suggest adding overtime or additional workers.`,
          reasoning: 'Significant delay detected, additional resources needed',
        },
      };
    } else {
      return {
        trigger: 'behind_schedule',
        affectedStationId: stationId,
        systemSuggestion: {
          action: 'optimize_schedule',
          details: `Station is ${Math.abs(variance)} units behind. Consider extending next shift or reallocating workers.`,
          reasoning: 'Minor delay, can be recovered with schedule optimization',
        },
      };
    }
  }
  
  return null; // No adaptation needed
}

/**
 * Calculate station learning metrics
 * @param {number} stationId - Station ID
 * @returns {Promise<void>}
 */
async function updateStationLearningMetrics(stationId) {
  const performances = await prisma.workerPerformance.findMany({
    where: { stationId },
    take: 100, // Last 100 shifts
    orderBy: { date: 'desc' },
  });
  
  if (performances.length === 0) return;
  
  const avgOutput = performances.reduce((sum, p) => sum + p.actualQty, 0) / performances.length;
  const avgQuality = performances.reduce((sum, p) => sum + p.qualityRate, 0) / performances.length;
  const totalJobs = performances.length;
  
  await prisma.station.update({
    where: { id: stationId },
    data: {
      avgOutputRate: Math.round(avgOutput),
      avgQualityRate: Math.round(avgQuality * 10) / 10,
      totalJobsCompleted: totalJobs,
    },
  });
}

module.exports = {
  getWorkerPerformance,
  getWorkerStationAffinity,
  suggestWorkersForStation,
  learnFromOverride,
  getPlannerPreferences,
  generateAdaptationSuggestion,
  updateStationLearningMetrics,
  calculatePerformanceScore,
};
