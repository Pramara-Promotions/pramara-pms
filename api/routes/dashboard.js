const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { addDays, isPast, isBefore, subDays, startOfDay, endOfDay } = require('date-fns')
const { calculateProjectHealth } = require('../lib/projectHealth')
const authGuard = require('../middleware/authGuard')

// Simple in-memory cache for project health (TTL: 5 minutes)
const healthCache = new Map()
const HEALTH_CACHE_TTL = 5 * 60 * 1000

function getCachedHealth(projectId) {
  const cached = healthCache.get(projectId)
  if (cached && Date.now() - cached.timestamp < HEALTH_CACHE_TTL) {
    return cached.data
  }
  return null
}

async function getCachedOrCalculateHealth(projectId) {
  const cached = getCachedHealth(projectId)
  if (cached) return cached
  
  const health = await calculateProjectHealth(projectId).catch(e => {
    console.warn(`[dashboard] health calc failed for project ${projectId}:`, e?.message)
    return null
  })
  
  if (health) {
    healthCache.set(projectId, { data: health, timestamp: Date.now() })
  }
  
  return health
}

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
    const userId = req.user.id
    const userRoles = req.user.roles || []

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
      const approvals = await prisma.approval.findMany({
        where: {
          status: 'PENDING',
          OR: [
            { dueDate: { lt: new Date() } }, // Overdue
            { dueDate: { lt: addDays(new Date(), 3) } } // Due within 3 days
          ]
        },
        include: {
          project: true
        },
        orderBy: { dueDate: 'asc' },
        take: 10
      })

      for (const approval of approvals) {
        const isOverdue = approval.dueDate && isPast(approval.dueDate)
        const bufferHours = approval.dueDate
          ? Math.round((approval.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60))
          : null

        actionItems.push({
          id: `approval_${approval.id}`,
          type: 'approval',
          priority: isOverdue ? 'critical' : (bufferHours && bufferHours < 24 ? 'high' : 'medium'),
          title: `${approval.type} Approval Pending`,
          description: `${approval.entity || 'Item'} requires approval${approval.project ? ` for ${approval.project.name}` : ''}`,
          project: approval.project ? {
            id: approval.project.id,
            name: approval.project.name,
            code: approval.project.code
          } : null,
          dueDate: approval.dueDate,
          bufferRemaining: bufferHours ? `${Math.abs(bufferHours)} hours` : null,
          metadata: {
            blockedTasks: 0, // Could calculate from dependencies
            affectedUsers: 1
          },
          link: `/approvals/${approval.id}`
        })
      }
    }

    // 2. Fetch User's Tasks
    const myTasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        OR: [
          { dueDate: { lt: new Date() } },
          { dueDate: { lt: addDays(new Date(), 3) } }
        ]
      },
      include: {
        project: true
      },
      orderBy: { dueDate: 'asc' },
      take: 10
    })

    for (const task of myTasks) {
      const isOverdue = task.dueDate && isPast(task.dueDate)

      actionItems.push({
        id: `task_${task.id}`,
        type: 'task',
        priority: isOverdue ? 'high' : 'medium',
        title: task.title || task.name || 'Untitled Task',
        description: task.description || 'Task needs to be completed',
        project: task.project ? {
          id: task.project.id,
          name: task.project.name,
          code: task.project.code
        } : null,
        dueDate: task.dueDate,
        link: `/tasks/${task.id}`
      })
    }

    // 3. Production Issues (for production workers)
    if (isProductionWorker || isAdmin) {
      const productionIssues = await prisma.productionEntry.findMany({
        where: {
          status: 'BLOCKED',
          createdAt: { gte: addDays(new Date(), -7) } // Last 7 days
        },
        include: {
          project: true
        },
        take: 5
      })

      for (const issue of productionIssues) {
        actionItems.push({
          id: `production_${issue.id}`,
          type: 'blocked',
          priority: 'high',
          title: 'Production Blocked',
          description: `Production entry blocked${issue.project ? ` for ${issue.project.name}` : ''}`,
          project: issue.project ? {
            id: issue.project.id,
            name: issue.project.name,
            code: issue.project.code
          } : null,
          link: `/execution/production/${issue.id}`
        })
      }
    }

    // 4. QC Inspections (for QC inspectors)
    if (isQCInspector || isAdmin) {
      const qcPending = await prisma.qcInspection.findMany({
        where: {
          status: 'PENDING',
          dueDate: { lte: addDays(new Date(), 3) }
        },
        include: {
          project: true
        },
        orderBy: { dueDate: 'asc' },
        take: 10
      })

      for (const qc of qcPending) {
        const isOverdue = qc.dueDate && isPast(qc.dueDate)

        actionItems.push({
          id: `qc_${qc.id}`,
          type: 'inspection',
          priority: isOverdue ? 'critical' : 'high',
          title: 'QC Inspection Pending',
          description: `${qc.type || 'Quality'} inspection required${qc.project ? ` for ${qc.project.name}` : ''}`,
          project: qc.project ? {
            id: qc.project.id,
            name: qc.project.name,
            code: qc.project.code
          } : null,
          dueDate: qc.dueDate,
          link: `/qc/${qc.id}`
        })
      }
    }

    // 5. Material Shortages
    const materialShortages = await prisma.material.findMany({
      where: {
        currentStock: { lte: prisma.material.fields.minStock }
      },
      take: 5
    })

    for (const material of materialShortages) {
      actionItems.push({
        id: `material_${material.id}`,
        type: 'shortage',
        priority: 'high',
        title: 'Material Shortage',
        description: `${material.name} stock below minimum level`,
        metadata: {
          currentStock: material.currentStock,
          minStock: material.minStock
        },
        link: `/planning/materials/${material.id}`
      })
    }

    // 6. Compliance Issues
    const complianceDue = await prisma.projectCompliance.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        deadline: { lte: addDays(new Date(), 7) }
      },
      include: {
        project: true
      },
      orderBy: { deadline: 'asc' },
      take: 5
    })

    for (const compliance of complianceDue) {
      const isOverdue = compliance.deadline && isPast(compliance.deadline)

      actionItems.push({
        id: `compliance_${compliance.id}`,
        type: 'compliance',
        priority: isOverdue ? 'critical' : 'medium',
        title: 'Compliance Deadline Approaching',
        description: `${compliance.type || 'Compliance'} item due${compliance.project ? ` for ${compliance.project.name}` : ''}`,
        project: compliance.project ? {
          id: compliance.project.id,
          name: compliance.project.name,
          code: compliance.project.code
        } : null,
        dueDate: compliance.deadline,
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
 */
router.get('/overview', authGuard, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days);
    const startDate = subDays(new Date(), daysNum);

    // Production Analytics: primary=ProductionEntry (seeded data), fallback=ShiftEntry (legacy)
    const [productionStats, productionTrend, shiftStats] = await Promise.all([
      prisma.productionEntry.aggregate({
        where: { startTime: { gte: startDate } },
        _sum: { actualQty: true, rejectedQty: true, targetQty: true },
        _count: true,
      }).catch(() => ({
        _sum: { actualQty: 0, rejectedQty: 0, targetQty: 0 },
        _count: 0,
      })),
      prisma.productionEntry.groupBy({
        by: ['startTime'],
        where: { startTime: { gte: startDate } },
        _sum: { actualQty: true, rejectedQty: true },
        orderBy: { startTime: 'asc' },
      }).catch(() => []),
      prisma.shiftEntry.aggregate({
        where: { shiftDate: { gte: startDate } },
        _sum: { totalProduced: true, qualityPassed: true, qualityRejected: true },
        _count: true,
      }).catch(() => ({
        _sum: { totalProduced: 0, qualityPassed: 0, qualityRejected: 0 },
        _count: 0,
      })),
    ]);

    // Prefer ProductionEntry if available; fallback to ShiftEntry
    const hasProductionData = (productionStats._sum?.actualQty || 0) > 0;
    const totalProduced = hasProductionData 
      ? (productionStats._sum?.actualQty || 0)
      : (shiftStats._sum?.totalProduced || 0);
    const totalApproved = hasProductionData
      ? Math.max(0, (productionStats._sum?.actualQty || 0) - (productionStats._sum?.rejectedQty || 0))
      : (shiftStats._sum?.qualityPassed || 0);
    const totalRejected = hasProductionData
      ? (productionStats._sum?.rejectedQty || 0)
      : (shiftStats._sum?.qualityRejected || 0);
    const entryCount = hasProductionData ? productionStats._count : shiftStats._count;

    // Quality Analytics (QCSubmission)
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

    // Workforce Analytics
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

    // Project Analytics
    const projectStats = await prisma.project.aggregate({
      _count: true,
    });

    // Note: Removed projectsByStatus groupBy as Project model doesn't have a 'status' field
    // Health-based status breakdown is provided below instead

    // Project health overview (cached): compute status counts for dashboard
    let onTrackCount = 0;
    let needAttentionCount = 0;
    let projectsByHealth = [];
    try {
      const projectList = await prisma.project.findMany({ select: { id: true } });
      console.log(`[dashboard] Computing health for ${projectList.length} projects`);
      const healthResults = await Promise.all(
        projectList.map(p => getCachedOrCalculateHealth(p.id))
      );
      const healthStatusCounts = healthResults.reduce((acc, h) => {
        if (!h) return acc;
        const s = h.status || 'healthy';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});
      projectsByHealth = Object.keys(healthStatusCounts).map(k => ({ status: k, count: healthStatusCounts[k] }));
      onTrackCount = healthStatusCounts.healthy || 0;
      needAttentionCount = (healthStatusCounts['at-risk'] || 0) + (healthStatusCounts.critical || 0);
      console.log(`[dashboard] Health aggregation complete: onTrack=${onTrackCount}, needAttention=${needAttentionCount}`, healthStatusCounts);
    } catch (e) {
      console.warn('[dashboard] project health aggregation failed:', e?.message);
    }

    // Active workers today
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
      production: {
        totalOutput: totalProduced,
        approved: totalApproved,
        rejected: totalRejected,
        entries: entryCount,
        trend: (productionTrend && productionTrend.length > 0)
          ? productionTrend.map(t => ({
            date: t.startTime,
            output: t._sum?.actualQty || 0,
            approved: Math.max(0, (t._sum?.actualQty || 0) - (t._sum?.rejectedQty || 0)),
          }))
          : [],
      },
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
        byHealth: projectsByHealth,
      },
      onTrackCount,
      needAttentionCount,
    });

  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
});

module.exports = router
