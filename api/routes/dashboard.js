const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { addDays, isPast, subDays, startOfDay, endOfDay } = require('date-fns')
const authGuard = require('../middleware/authGuard')
const MetricsService = require('../services/MetricsService')

// Middleware to require authentication
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  next()
}

/**
 * GET /api/dashboard/action-items
 * Returns role-based actionable items for the home page
 */
router.get('/action-items', authGuard, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user with role details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const roleNames = user.roles.map(ur => ur.role.name)
    const isProjectManager = roleNames.includes('PROJECT_MANAGER') || roleNames.includes('ADMIN')
    const isProductionWorker = roleNames.includes('PRODUCTION_WORKER')
    const isQCInspector = roleNames.includes('QC_INSPECTOR')
    const isAdmin = roleNames.includes('ADMIN')

    let actionItems = []

    // 1. Fetch Approvals (for managers and admins)
    if (isProjectManager || isAdmin) {
      try {
        const approvals = await prisma.approvalRequest.findMany({
          where: {
            status: 'pending',
          },
          include: {
            Project: true
          },
          orderBy: { expectedDate: 'asc' },
          take: 10
        })

        for (const approval of approvals) {
          const isOverdue = approval.cutoffDate && isPast(approval.cutoffDate)
          const bufferHours = approval.cutoffDate
            ? Math.round((approval.cutoffDate.getTime() - new Date().getTime()) / (1000 * 60 * 60))
            : null

          actionItems.push({
            id: `approval_${approval.id}`,
            type: 'approval',
            priority: isOverdue ? 'critical' : (bufferHours && bufferHours < 24 ? 'high' : 'medium'),
            title: `${approval.approvalType} Approval Pending`,
            description: `${approval.description || 'Item'} requires approval${approval.Project ? ` for ${approval.Project.name}` : ''}`,
            project: approval.Project ? {
              id: approval.Project.id,
              name: approval.Project.name,
              code: approval.Project.code
            } : null,
            dueDate: approval.cutoffDate,
            bufferRemaining: bufferHours ? `${Math.abs(bufferHours)} hours` : null,
            metadata: {
              blockedTasks: 0,
              affectedUsers: 1
            },
            link: `/approvals/${approval.id}`
          })
        }
      } catch (approvalError) {
        console.warn('[dashboard] Approvals fetch failed:', approvalError.message)
      }
    }

    // 2. Fetch User's Tasks
    let myTasks = []
    try {
      myTasks = await prisma.task.findMany({
        where: {
          assignee: userId,
          status: { in: ['green', 'amber'] }
        },
        include: {
          Project: true
        },
        orderBy: { dueDate: 'asc' },
        take: 10
      })
    } catch (taskError) {
      console.warn('[dashboard] Tasks fetch failed:', taskError.message)
      myTasks = []
    }

    for (const task of myTasks) {
      const isOverdue = task.dueDate && isPast(task.dueDate)

      actionItems.push({
        id: `task_${task.id}`,
        type: 'task',
        priority: isOverdue ? 'high' : 'medium',
        title: task.name || 'Untitled Task',
        description: task.name || 'Task needs to be completed',
        project: task.Project ? {
          id: task.Project.id,
          name: task.Project.name,
          code: task.Project.code
        } : null,
        dueDate: task.dueDate,
        link: `/tasks/${task.id}`
      })
    }

    // 3. Production Issues (for production workers)
    if (isProductionWorker || isAdmin) {
      try {
        const productionIssues = await prisma.productionEntry.findMany({
          where: {
            createdAt: { gte: addDays(new Date(), -7) }
          },
          include: {
            Project: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        })

        for (const issue of productionIssues) {
          actionItems.push({
            id: `production_${issue.id}`,
            type: 'blocked',
            priority: 'high',
            title: 'Recent Production Entry',
            description: `Production entry${issue.Project ? ` for ${issue.Project.name}` : ''}`,
            project: issue.Project ? {
              id: issue.Project.id,
              name: issue.Project.name,
              code: issue.Project.code
            } : null,
            link: `/execution/production/${issue.id}`
          })
        }
      } catch (productionError) {
        console.warn('[dashboard] Production issues fetch failed:', productionError.message)
      }
    }

    // 4. QC Submissions (for QC inspectors)
    if (isQCInspector || isAdmin) {
      try {
        const qcPending = await prisma.qCSubmission.findMany({
          where: {
            submittedAt: { gte: subDays(new Date(), 3) }
          },
          include: {
            Project: true
          },
          orderBy: { submittedAt: 'asc' },
          take: 10
        })

        for (const qc of qcPending) {
          actionItems.push({
            id: `qc_${qc.id}`,
            type: 'inspection',
            priority: qc.overallPass ? 'low' : 'high',
            title: `QC Submission - ${qc.overallPass ? 'Passed' : 'Failed'}`,
            description: `Quality inspection for batch ${qc.batchCode || 'N/A'}${qc.Project ? ` from ${qc.Project.name}` : ''}`,
            project: qc.Project ? {
              id: qc.Project.id,
              name: qc.Project.name,
              code: qc.Project.code
            } : null,
            link: `/qc/${qc.id}`
          })
        }
      } catch (qcError) {
        console.warn('[dashboard] QC submissions fetch failed:', qcError.message)
      }
    }

    // 5. Material Shortages
    // Prisma cannot reference another model field in the where clause (prisma.material.fields is invalid).
    // Safely fetch materials and filter in JS to avoid runtime errors that return 500.
    let materialShortages = []
    try {
      const materials = await prisma.material.findMany({ take: 100 })
      materialShortages = materials.filter(m => (m.stockQty || 0) <= (m.minStock || 0)).slice(0, 5)
    } catch (e) {
      console.warn('[dashboard] Material shortages fetch failed:', e?.message)
      materialShortages = []
    }

    for (const material of materialShortages) {
      actionItems.push({
        id: `material_${material.id}`,
        type: 'shortage',
        priority: 'high',
        title: 'Material Shortage',
        description: `${material.name} stock below minimum level`,
        metadata: {
          currentStock: material.stockQty,
          minStock: material.minStock
        },
        link: `/planning/materials/${material.id}`
      })
    }

    // 6. Compliance Issues
    let complianceDue = []
    try {
      complianceDue = await prisma.projectCompliance.findMany({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        },
        include: {
          project: true
        },
        orderBy: { requiredBy: 'asc' },
        take: 5
      })
    } catch (complianceError) {
      console.warn('[dashboard] Compliance fetch failed:', complianceError.message)
      complianceDue = []
    }

    for (const compliance of complianceDue) {
      const isOverdue = compliance.requiredBy && isPast(compliance.requiredBy)

      actionItems.push({
        id: `compliance_${compliance.id}`,
        type: 'compliance',
        priority: isOverdue ? 'critical' : 'medium',
        title: 'Compliance Deadline Approaching',
        description: `${compliance.complianceName || 'Compliance'} item due${compliance.project ? ` for ${compliance.project.name}` : ''}`,
        project: compliance.project ? {
          id: compliance.project.id,
          name: compliance.project.name,
          code: compliance.project.code
        } : null,
        dueDate: compliance.requiredBy,
        link: `/compliance/projects/${compliance.projectId}`
      })
    }

    // Sort by priority and date
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    actionItems.sort((a, b) => {
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate) - new Date(b.dueDate)
      }
      return 0
    })

    // Calculate summary
    const summary = {
      critical: actionItems.filter(i => i.priority === 'critical').length,
      high: actionItems.filter(i => i.priority === 'high').length,
      medium: actionItems.filter(i => i.priority === 'medium').length,
      low: actionItems.filter(i => i.priority === 'low').length
    }

    res.json({
      actionItems,
      summary
    })

  } catch (error) {
    console.error('Error fetching action items:', error)
    res.status(500).json({ error: 'Failed to fetch action items' })
  }
})

/**
 * GET /api/dashboard/overview
 * Comprehensive dashboard analytics for home page
 * REFACTORED: Uses MetricsService for performance
 */
router.get('/overview', authGuard, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days);
    const startDate = subDays(new Date(), daysNum);

    // 1. Production Analytics (Via Service)
    const productionData = await MetricsService.getProductionOverview(startDate);

    // 2. Quality Analytics (QCSubmission)
    // QCSubmission only has overallPass boolean, compute pass/fail via groupBy
    let qcStats = { _count: 0, _sum: { sampleSize: 0, passedQty: 0, failedQty: 0 } };
    let qcByResult = [];
    try {
      const grouped = await prisma.qCSubmission.groupBy({
        by: ['overallPass'],
        where: { submittedAt: { gte: startDate } },
        _count: true,
      });
      const pass = grouped.find(g => g.overallPass === true)?._count || 0;
      const fail = grouped.find(g => g.overallPass === false)?._count || 0;
      qcStats = { _count: pass + fail, _sum: { sampleSize: pass + fail, passedQty: pass, failedQty: fail } };
      qcByResult = grouped.map(g => ({ result: g.overallPass ? 'pass' : 'fail', _count: g._count }));
    } catch (e) {
      console.warn('[dashboard] QC analytics failed:', e?.message);
      qcStats = { _count: 0, _sum: { sampleSize: 0, passedQty: 0, failedQty: 0 } };
      qcByResult = [];
    }

    const totalChecked = (qcStats._sum.sampleSize || 0);
    const totalPassed = (qcStats._sum.passedQty || 0);
    const passRate = totalChecked > 0 ? (totalPassed / totalChecked) * 100 : 0;

    // 3. Workforce Analytics
    const [shiftStatsGrouped, topPerformers] = await Promise.all([
      prisma.shiftEntry.groupBy({
        by: ['shiftType'],
        where: { shiftDate: { gte: startDate } },
        _sum: { workersPresent: true, totalProduced: true },
        _avg: { efficiency: true },
      }),
      prisma.wIPLedger.groupBy({
        by: ['operatorId'],
        where: {
          transactionType: 'output',
          status: 'active',
          operatorId: { not: null },
          transactionDate: { gte: startDate },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),
    ]);

    // Fetch operator names
    const operatorIds = topPerformers.map(op => op.operatorId).filter(Boolean);
    const operators = operatorIds.length > 0
      ? await prisma.user.findMany({
        where: { id: { in: operatorIds } },
        select: { id: true, name: true, firstName: true, lastName: true },
      })
      : [];

    const topPerformersWithNames = topPerformers.map(op => {
      const operator = operators.find(u => u.id === op.operatorId);
      return {
        operatorId: op.operatorId,
        operatorName: operator
          ? (operator.name || `${operator.firstName || ''} ${operator.lastName || ''}`.trim() || 'Unknown')
          : 'Unknown',
        totalOutput: op._sum.quantity || 0,
      };
    });

    // 4. Project Analytics & Health (Via Service - Bulk Optimized)
    const projectStats = await prisma.project.aggregate({ _count: true });

    // Bulk fetch health for all projects
    const healthSummary = await MetricsService.getBulkProjectHealth();

    // 5. Active workers today
    const today = startOfDay(new Date());
    const activeWorkersToday = await prisma.shiftEntry.aggregate({
      where: {
        shiftDate: { gte: today, lte: endOfDay(new Date()) },
      },
      _sum: { workersPresent: true },
    });

    res.json({
      period: {
        days: daysNum,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      production: productionData, // Used from Service
      quality: {
        totalSubmissions: qcStats._count,
        totalChecked,
        totalPassed,
        totalFailed: (qcStats._sum.failedQty || 0),
        passRate: Math.round(passRate * 100) / 100,
        byResult: (Array.isArray(qcByResult) ? qcByResult : []).map(r => ({
          result: (r.result !== undefined ? r.result : (r.overallPass ? 'pass' : 'fail')),
          count: r._count,
        })),
      },
      workforce: {
        activeToday: activeWorkersToday._sum.workersPresent || 0,
        byShift: shiftStatsGrouped.map(s => ({
          shift: s.shiftType,
          workers: s._sum.workersPresent || 0,
          output: s._sum.totalProduced || 0,
          avgEfficiency: Math.round((s._avg.efficiency || 0) * 100) / 100,
        })),
        topPerformers: topPerformersWithNames,
      },
      projects: {
        total: projectStats._count,
        byHealth: healthSummary.projectsByHealth,
      },
      onTrackCount: healthSummary.onTrackCount,
      needAttentionCount: healthSummary.needAttentionCount,
    });

  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
});

module.exports = router
