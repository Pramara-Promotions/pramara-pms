const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');
const capacityService = require('../services/capacityService');

const prisma = new PrismaClient();
const router = express.Router();
router.use(requireAuth);

// Map DailyPlanStationAuto -> AssignableTask shape for UI
function mapAutoPlanToTask(item) {
  return {
    id: item.id,
    projectCode: item.Project?.code || String(item.projectId),
    projectName: item.Project?.name || `Project #${item.projectId}`,
    stageName: item.Station?.name || 'Production',
    requiredQty: item.targetQty || 0,
    dueDate: item.date,
    status: 'pending',
  };
}

// GET /api/assignments/unassigned?projectId=
// Returns pending auto-plan items as tasks to be assigned/committed to stations
router.get('/unassigned', async (req, res) => {
  try {
    const { projectId } = req.query;

    // Get latest plan generations per project (or just filter by provided project)
    const whereGen = projectId ? { projectId: Number(projectId) } : {};
    const latestGens = await prisma.dailyPlanGeneration.findMany({
      where: whereGen,
      orderBy: { generatedAt: 'desc' },
      take: projectId ? 1 : 10,
      select: { id: true },
    });

    if (!latestGens || latestGens.length === 0) return res.json([]);

    const items = await prisma.dailyPlanStationAuto.findMany({
      where: {
        planGenerationId: { in: latestGens.map((g) => g.id) },
        status: 'pending',
      },
      orderBy: [{ date: 'asc' }],
      include: {
        Project: { select: { id: true, code: true, name: true } },
        Station: { select: { id: true, name: true, code: true, status: true } },
        ProjectSku: { select: { id: true, code: true, name: true } },
      },
    });

    const shaped = items.map(mapAutoPlanToTask);
    res.json(shaped);
  } catch (e) {
    console.error('assignments:unassigned', e);
    res.status(500).json({ error: 'Failed to fetch unassigned tasks' });
  }
});

// GET /api/assignments/suggest?taskId=&projectId=
// Returns top station suggestions with score and ETA
router.get('/suggest', async (req, res) => {
  try {
    const { taskId, projectId } = req.query;
    if (!taskId) return res.status(400).json({ error: 'taskId is required' });

    const task = await prisma.dailyPlanStationAuto.findUnique({
      where: { id: String(taskId) },
      include: {
        Project: { select: { id: true, code: true, name: true } },
        Station: { select: { id: true, name: true, code: true, workstationType: true, status: true, targetUtilization: true, baseCycleTime: true } },
        ProjectSku: { select: { id: true, code: true, name: true } },
      },
    });
    if (!task) return res.json([]);

    const pid = projectId ? Number(projectId) : task.projectId;
    const date = new Date(task.date);

    // Candidate stations: same project or global, operational
    const stations = await prisma.station.findMany({
      where: {
        active: true,
        status: 'operational',
        OR: [{ projectId: pid }, { projectId: null }],
      },
      include: {
        machines: { where: { status: { in: ['available', 'in_use'] } } },
        ProcessConfig: true,
      },
      orderBy: [{ projectId: 'desc' }, { name: 'asc' }],
      take: 50,
    });

    // Maintenance windows overlapping the task date
    const maint = await prisma.maintenanceLog.findMany({
      where: {
        stationId: { in: stations.map((s) => s.id) },
        startTime: { lte: new Date(date.getTime() + 24 * 3600 * 1000) },
        OR: [
          { endTime: null },
          { endTime: { gte: new Date(date.getTime()) } },
        ],
      },
      select: { stationId: true, startTime: true, endTime: true, description: true },
    });
    const maintByStation = maint.reduce((acc, m) => {
      acc[m.stationId] = acc[m.stationId] || [];
      acc[m.stationId].push(m);
      return acc;
    }, {});

    // Load learned overrides for biasing suggestions (lightweight learning loop)
    const learned = await prisma.planAdaptation.findMany({
      where: { projectId: pid, type: 'assignment_override' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { reasoning: true }
    }).catch(() => []);
    const favoredStations = new Set();
    for (const l of learned) {
      try {
        const r = typeof l.reasoning === 'string' ? JSON.parse(l.reasoning) : l.reasoning;
        if (r?.stationId) favoredStations.add(Number(r.stationId));
      } catch {}
    }

    const suggestions = [];
    for (const s of stations) {
      // Skip if no process config - we can't estimate
      const proc = (s.ProcessConfig || [])[0];
      let capacity;
      try {
        capacity = await capacityService.getStationCapacity(s.id, proc?.stationType || s.workstationType || 'default');
      } catch (_) {
        continue;
      }

      const partsPerDay = capacity.partsPerDay || 0;
      const daysRequired = partsPerDay > 0 ? Math.ceil((task.targetQty || 0) / partsPerDay) : 999;
      const eta = new Date(date);
      eta.setDate(eta.getDate() + Math.max(0, daysRequired - 1));

      // Score components
      let score = 0;
      const reasons = [];

      if (s.projectId === pid) {
        score += 20;
        reasons.push('In-project station');
      }
      if (partsPerDay > 0) {
        const speedScore = Math.min(50, Math.round((task.targetQty / partsPerDay) * 10));
        score += 50 - speedScore; // faster -> higher score
        reasons.push(`Capacity ~${partsPerDay}/day`);
      }
      const mlist = maintByStation[s.id] || [];
      if (mlist.length > 0) {
        score -= 15;
        reasons.push('Maintenance window nearby');
      }
      if (s.id === task.stationId) {
        score += 10;
        reasons.push('Planned station');
      }

      // Learned preference boost
      if (favoredStations.has(s.id)) {
        score += 5;
        reasons.push('Learned preference');
      }

      // Clamp to [0, 100]
      score = Math.max(0, Math.min(100, score));

      suggestions.push({
        stationId: s.id,
        stationName: s.name,
        score,
        reasoning: reasons.join(' • '),
        estimatedFinish: eta,
        conflicts: mlist.map((m) => m.description).slice(0, 3),
      });
    }

    // Top 5
    suggestions.sort((a, b) => b.score - a.score);
    res.json(suggestions.slice(0, 5));
  } catch (e) {
    console.error('assignments:suggest', e);
    res.status(500).json({ error: 'Failed to suggest assignments' });
  }
});

// POST /api/assignments/assign { taskId, stationId, overrideReason, projectId }
// Creates a DailyPlan (if missing) and commits a DailyPlanStation for chosen station
router.post('/assign', async (req, res) => {
  try {
    const { taskId, stationId, overrideReason, projectId } = req.body || {};
    if (!taskId || !stationId) return res.status(400).json({ error: 'taskId and stationId are required' });

    const task = await prisma.dailyPlanStationAuto.findUnique({ where: { id: String(taskId) } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (projectId && Number(projectId) !== task.projectId) {
      return res.status(400).json({ error: 'Project mismatch for task' });
    }

    const sId = Number(stationId);
    const date = new Date(task.date);

    // Check maintenance on target station around the date
    const conflict = await prisma.maintenanceLog.findFirst({
      where: {
        stationId: sId,
        startTime: { lte: new Date(date.getTime() + 24 * 3600 * 1000) },
        OR: [
          { endTime: null },
          { endTime: { gte: new Date(date.getTime()) } },
        ],
      },
    });
    if (conflict && !overrideReason) {
      return res.status(409).json({ error: 'Station under maintenance near target date. Provide overrideReason to proceed.' });
    }

    // Find or create a DailyPlan for the project and date
    const dayStart = new Date(date); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(date); dayEnd.setHours(23,59,59,999);
    let plan = await prisma.dailyPlan.findFirst({
      where: { projectId: task.projectId, date: { gte: dayStart, lte: dayEnd } },
    });
    if (!plan) {
      plan = await prisma.dailyPlan.create({
        data: {
          id: require('crypto').randomUUID(),
          projectId: task.projectId,
          date: date,
          scenario: 'manual',
          generatedBy: req.auth?.user?.email || 'system',
          status: 'draft',
          totalTargetQty: task.targetQty || 0,
          totalExpectedOutput: task.targetQty || 0,
        },
      });
    }

  // Create a DailyPlanStation entry reflecting this assignment
    const dps = await prisma.dailyPlanStation.create({
      data: {
        id: require('crypto').randomUUID(),
        dailyPlanId: plan.id,
        stationId: sId,
        projectId: task.projectId,
        projectSkuId: task.skuId,
        targetQty: task.targetQty || 0,
        assignedWorkers: [],
        workerAssignmentReason: overrideReason ? { overrideReason } : {},
        materialsRequired: {},
        equipmentStatus: 'operational',
        dependencies: [],
        status: 'pending',
      },
    });

    // Update auto plan item to reflect it has been committed
    await prisma.dailyPlanStationAuto.update({
      where: { id: task.id },
      data: { status: 'in_progress' },
    });

    // Log override to learning system when applicable
    try {
      if (overrideReason && task.stationId && Number(task.stationId) !== Number(sId)) {
        await prisma.planAdaptation.create({
          data: {
            id: require('crypto').randomUUID(),
            projectId: task.projectId,
            type: 'assignment_override',
            title: 'Assignment override captured',
            description: `Task ${task.id} assigned to station ${sId} overriding planned ${task.stationId}`,
            reasoning: JSON.stringify({ stationId: Number(sId), taskId: String(task.id), date: task.date, reason: String(overrideReason) }),
            confidence: 0.6,
            status: 'accepted',
          }
        });
      }
    } catch (e) {
      console.warn('assignments:learn-log failed', e?.message);
    }

    // Audit
    try {
      await prisma.auditLog.create({
        data: {
          actorId: req.auth?.user?.id || null,
          action: 'assignment.create',
          entity: 'DailyPlanStation',
          entityId: dps.id,
          meta: { taskId, stationId: sId, projectId: task.projectId, overrideReason: overrideReason || null },
          result: 'success',
        },
      });
    } catch {}

    res.json({ ok: true, dailyPlanId: plan.id, assignmentId: dps.id });
  } catch (e) {
    console.error('assignments:assign', e);
    res.status(500).json({ error: 'Failed to assign task' });
  }
});

module.exports = router;
