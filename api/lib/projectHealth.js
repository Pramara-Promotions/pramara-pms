// Project Health Calculation Utility
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calculate comprehensive project health metrics
 * @param {Object} project - Project object with related data
 * @returns {Object} Health metrics object
 */
async function calculateProjectHealth(projectId) {
  try {
    // Fetch project with all related data
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        Task: {
          select: {
            id: true,
            status: true,
            priority: true,
            dueDate: true,
            // completedAt removed to align with current Prisma schema
          }
        },
        Batch: {
          select: {
            id: true,
            currentQty: true,
            targetQty: true,
            rejectedQty: true,
            status: true
          }
        },
        skus: {
          select: {
            id: true,
            orderQty: true
          }
        }
      }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // 1. TIMELINE METRICS
    const timeline = calculateTimelineMetrics(project);

    // 2. BUDGET METRICS
    const budget = calculateBudgetMetrics(project);

    // 3. OUTPUT METRICS
    const output = calculateOutputMetrics(project);

    // 4. QUALITY METRICS
    const quality = calculateQualityMetrics(project);

    // 5. TASK PROGRESS
    const taskProgress = calculateTaskProgress(project);

    // 6. ATTENTION ITEMS
    const attentionItems = identifyAttentionItems(project, timeline, taskProgress);

    // 7. OVERALL HEALTH SCORE (0-100)
    const healthScore = calculateOverallHealth({
      timeline,
      budget,
      output,
      quality,
      taskProgress
    });

    // 8. HEALTH STATUS (healthy, at-risk, critical)
    const status = determineHealthStatus(healthScore, attentionItems);

    return {
      projectId,
      healthScore,
      status,
      timeline,
      budget,
      output,
      quality,
      taskProgress,
      attentionItems,
      calculatedAt: new Date()
    };
  } catch (error) {
    console.error('Error calculating project health:', error);
    throw error;
  }
}

/**
 * Calculate timeline metrics
 */
function calculateTimelineMetrics(project) {
  const now = new Date();
  const startDate = project.startDate ? new Date(project.startDate) : project.createdAt;
  const endDate = project.cutoffDate ? new Date(project.cutoffDate) : null;

  if (!endDate) {
    return {
      daysElapsed: Math.floor((now - startDate) / (1000 * 60 * 60 * 24)),
      daysRemaining: null,
      daysTotal: null,
      percentComplete: null,
      isOverdue: false,
      status: 'no-deadline'
    };
  }

  const daysTotal = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.floor((endDate - now) / (1000 * 60 * 60 * 24));
  const percentComplete = Math.min(100, Math.max(0, (daysElapsed / daysTotal) * 100));
  const isOverdue = now > endDate;

  return {
    startDate,
    endDate,
    daysElapsed,
    daysRemaining,
    daysTotal,
    percentComplete: Math.round(percentComplete * 10) / 10,
    isOverdue,
    status: isOverdue ? 'overdue' : daysRemaining < 7 ? 'urgent' : 'on-track'
  };
}

/**
 * Calculate budget metrics
 */
function calculateBudgetMetrics(project) {
  const budgetTotal = project.budget || 0;
  const budgetSpent = project.budgetSpent || 0;
  const budgetRemaining = Math.max(0, budgetTotal - budgetSpent);
  const percentUsed = budgetTotal > 0 ? (budgetSpent / budgetTotal) * 100 : 0;
  const isOverBudget = budgetSpent > budgetTotal;

  return {
    total: budgetTotal,
    spent: budgetSpent,
    remaining: budgetRemaining,
    percentUsed: Math.round(percentUsed * 10) / 10,
    isOverBudget,
    status: isOverBudget ? 'over-budget' : percentUsed > 90 ? 'at-risk' : 'on-track'
  };
}

/**
 * Calculate output metrics
 */
function calculateOutputMetrics(project) {
  // From SKUs (using orderQty as target)
  const skuTarget = project.skus?.reduce((sum, sku) => sum + (sku.orderQty || 0), 0) || 0;

  // From Batch
  const batchTarget = project.Batch?.reduce((sum, batch) => sum + (batch.targetQty || 0), 0) || 0;
  const batchProduced = project.Batch?.reduce((sum, batch) => sum + (batch.currentQty || 0), 0) || 0;

  // Use SKU if available, otherwise batch or project quantity
  const targetQuantity = skuTarget > 0 ? skuTarget : (project.quantity || batchTarget);
  const producedQuantity = batchProduced;
  const percentComplete = targetQuantity > 0 ? (producedQuantity / targetQuantity) * 100 : 0;

  return {
    target: targetQuantity,
    produced: producedQuantity,
    remaining: Math.max(0, targetQuantity - producedQuantity),
    percentComplete: Math.round(percentComplete * 10) / 10,
    status: percentComplete >= 100 ? 'complete' : percentComplete >= 75 ? 'on-track' : percentComplete >= 50 ? 'at-risk' : 'behind'
  };
}

/**
 * Calculate quality metrics
 */
function calculateQualityMetrics(project) {
  const batches = project.Batch || [];
  const totalProduced = batches.reduce((sum, b) => sum + (b.currentQty || 0), 0);
  const totalRejected = batches.reduce((sum, b) => sum + (b.rejectedQty || 0), 0);
  const totalGood = totalProduced - totalRejected;

  const passRate = totalProduced > 0 ? (totalGood / totalProduced) * 100 : 100;
  const defectRate = totalProduced > 0 ? (totalRejected / totalProduced) * 100 : 0;

  return {
    totalProduced,
    totalGood,
    totalRejected,
    passRate: Math.round(passRate * 10) / 10,
    defectRate: Math.round(defectRate * 10) / 10,
    status: passRate >= 95 ? 'excellent' : passRate >= 90 ? 'good' : passRate >= 85 ? 'acceptable' : 'poor'
  };
}

/**
 * Calculate task progress
 */
function calculateTaskProgress(project) {
  const tasks = project.Task || [];
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'done' || t.status === 'completed').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const todo = tasks.filter(t => t.status === 'todo' || t.status === 'open').length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;

  const percentComplete = total > 0 ? (completed / total) * 100 : 0;

  return {
    total,
    completed,
    inProgress,
    todo,
    blocked,
    percentComplete: Math.round(percentComplete * 10) / 10,
    status: percentComplete >= 100 ? 'complete' : percentComplete >= 75 ? 'on-track' : percentComplete >= 50 ? 'at-risk' : 'behind'
  };
}

/**
 * Identify items requiring attention
 */
function identifyAttentionItems(project, timeline, taskProgress) {
  const items = [];
  const now = new Date();

  // Overdue project
  if (timeline.isOverdue) {
    items.push({
      type: 'timeline',
      severity: 'critical',
      message: `Project is ${Math.abs(timeline.daysRemaining)} days overdue`,
      action: 'Review timeline and adjust resources'
    });
  } else if (timeline.daysRemaining !== null && timeline.daysRemaining < 7) {
    items.push({
      type: 'timeline',
      severity: 'high',
      message: `Deadline in ${timeline.daysRemaining} days`,
      action: 'Prioritize remaining tasks'
    });
  }

  // Overdue tasks
  const tasks = project.Task || [];
  const overdueTasks = tasks.filter(t =>
    t.dueDate &&
    new Date(t.dueDate) < now &&
    t.status !== 'done' &&
    t.status !== 'completed'
  );
  if (overdueTasks.length > 0) {
    items.push({
      type: 'tasks',
      severity: 'high',
      message: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
      action: 'Review and update task priorities',
      count: overdueTasks.length
    });
  }

  // Blocked tasks
  if (taskProgress.blocked > 0) {
    items.push({
      type: 'tasks',
      severity: 'medium',
      message: `${taskProgress.blocked} blocked task${taskProgress.blocked > 1 ? 's' : ''}`,
      action: 'Remove blockers or reassign tasks',
      count: taskProgress.blocked
    });
  }

  // Quality issues
  const quality = calculateQualityMetrics(project);
  if (quality.defectRate > 10) {
    items.push({
      type: 'quality',
      severity: 'high',
      message: `High defect rate: ${quality.defectRate}%`,
      action: 'Investigate root causes and implement corrective actions'
    });
  } else if (quality.defectRate > 5) {
    items.push({
      type: 'quality',
      severity: 'medium',
      message: `Elevated defect rate: ${quality.defectRate}%`,
      action: 'Monitor quality metrics closely'
    });
  }

  // Low progress with deadline approaching
  const output = calculateOutputMetrics(project);
  if (timeline.daysRemaining !== null && timeline.daysRemaining < 14 && output.percentComplete < 75) {
    items.push({
      type: 'output',
      severity: 'high',
      message: `Only ${output.percentComplete}% complete with ${timeline.daysRemaining} days remaining`,
      action: 'Increase production capacity or adjust deadline'
    });
  }

  return items.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Calculate overall health score (0-100)
 */
function calculateOverallHealth({ timeline, budget, output, quality, taskProgress }) {
  let score = 100;

  // Timeline penalty
  if (timeline.isOverdue) {
    score -= 30;
  } else if (timeline.status === 'urgent') {
    score -= 15;
  }

  // Budget penalty
  if (budget.isOverBudget) {
    score -= 25;
  } else if (budget.percentUsed > 90) {
    score -= 10;
  }

  // Output penalty
  if (output.status === 'behind') {
    score -= 20;
  } else if (output.status === 'at-risk') {
    score -= 10;
  }

  // Quality penalty
  if (quality.status === 'poor') {
    score -= 20;
  } else if (quality.status === 'acceptable') {
    score -= 10;
  }

  // Task progress penalty
  if (taskProgress.status === 'behind') {
    score -= 15;
  } else if (taskProgress.status === 'at-risk') {
    score -= 8;
  }

  // Blocked tasks penalty
  score -= taskProgress.blocked * 2;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Determine overall health status
 */
function determineHealthStatus(healthScore, attentionItems) {
  const criticalItems = attentionItems.filter(i => i.severity === 'critical').length;
  const highItems = attentionItems.filter(i => i.severity === 'high').length;

  if (criticalItems > 0 || healthScore < 50) {
    return 'critical';
  } else if (highItems > 0 || healthScore < 70) {
    return 'at-risk';
  } else {
    return 'healthy';
  }
}

module.exports = {
  calculateProjectHealth
};
