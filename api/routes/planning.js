const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();
router.use(requireAuth);

// Helper to compute simple project priority from cutoff proximity
function computePriority(cutoffDate) {
  if (!cutoffDate) return 'low';
  const days = Math.ceil((new Date(cutoffDate) - new Date()) / 86400000);
  if (days <= 7) return 'high';
  if (days <= 21) return 'medium';
  return 'low';
}

// GET /api/planning/projects?projectId=
// Returns projects with simple timeline/stage summary from latest plan generation
router.get('/projects', async (req, res) => {
  try {
    const { projectId } = req.query;
    const where = projectId ? { id: Number(projectId) } : {};

    const projects = await prisma.project.findMany({
      where,
      include: {
        dailyPlanGenerations: {
          orderBy: { generatedAt: 'desc' },
          take: 1,
          include: { stationPlans: { orderBy: { date: 'asc' }, include: { Station: true } } },
        },
      },
      orderBy: { id: 'asc' },
      take: projectId ? 1 : 20,
    });

    const shaped = projects.map((p) => {
      const latest = p.dailyPlanGenerations[0];
      const startDate = latest?.startDate || new Date();
      const endDate = latest?.endDate || (p.cutoffDate || new Date());
      const totalPlanned = (latest?.stationPlans || []).reduce((s, it) => s + (it.targetQty || 0), 0);
      const totalActual = (latest?.stationPlans || []).reduce((s, it) => s + (it.actualQty || 0), 0);
      const progress = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;

      const stages = (latest?.stationPlans || []).map((sp) => ({
        id: sp.id,
        name: `${sp.Station?.name || 'Station'} • Qty ${sp.targetQty}`,
        projectId: String(p.id),
        startDate: sp.date,
        endDate: sp.date,
        duration: 1,
        dependencies: [],
        assignedWorkers: (sp.assignedWorkers || []).length,
        requiredWorkers: Math.max(1, sp.allocatedMachines || 1),
        status: sp.status === 'completed' ? 'completed' : sp.status === 'in_progress' ? 'in-progress' : sp.status === 'blocked' ? 'blocked' : 'not-started',
      }));

      return {
        id: String(p.id),
        name: `${p.code} • ${p.name}`,
        startDate,
        endDate,
        priority: computePriority(p.cutoffDate),
        progress,
        stages,
        resources: [], // keep minimal; UI tolerates empty
      };
    });

    res.json(shaped);
  } catch (e) {
    console.error('planning:projects', e);
    res.status(500).json({ error: 'Failed to fetch planning projects' });
  }
});

// GET /api/planning/ai-suggestions?projectId=
// Surfaces pending PlanAdaptations as AI suggestions
router.get('/ai-suggestions', async (req, res) => {
  try {
    const { projectId } = req.query;
    const where = { status: 'pending', ...(projectId ? { projectId: Number(projectId) } : {}) };
    const adaptations = await prisma.planAdaptation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const shaped = adaptations.map((a) => ({
      id: a.id,
      type: (a.type || 'resource_reallocation'),
      title: a.title || 'Optimization suggestion',
      description: a.description || 'System-generated plan optimization suggestion',
      reasoning: a.reasoning || '',
      impact: {},
      affected: { projects: [String(a.projectId)], stages: [], resources: [] },
      confidence: Math.round((a.confidence || 0.5) * 100),
      status: 'pending',
      createdAt: a.createdAt || new Date(),
    }));

    res.json(shaped);
  } catch (e) {
    console.error('planning:ai-suggestions', e);
    res.status(500).json({ error: 'Failed to fetch AI suggestions' });
  }
});

// POST /api/planning/ai-suggestions/:id/accept
router.post('/ai-suggestions/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.planAdaptation.update({
      where: { id },
      data: {
        status: 'accepted',
        decidedBy: req.auth?.user?.id || null,
        decidedAt: new Date(),
      },
    });
    res.json({ ok: true, suggestion: updated });
  } catch (e) {
    console.error('planning:ai-accept', e);
    if (e.code === 'P2025') return res.status(404).json({ error: 'Suggestion not found' });
    res.status(500).json({ error: 'Failed to accept suggestion' });
  }
});

// POST /api/planning/ai-suggestions/:id/reject { reason }
router.post('/ai-suggestions/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const updated = await prisma.planAdaptation.update({
      where: { id },
      data: {
        status: 'rejected',
        plannerReason: reason || null,
        decidedBy: req.auth?.user?.id || null,
        decidedAt: new Date(),
      },
    });
    res.json({ ok: true, suggestion: updated });
  } catch (e) {
    console.error('planning:ai-reject', e);
    if (e.code === 'P2025') return res.status(404).json({ error: 'Suggestion not found' });
    res.status(500).json({ error: 'Failed to reject suggestion' });
  }
});

// GET /api/planning/conflicts?projectId=
// Detect overlapping machine allocations across projects for next 14 days
router.get('/conflicts', async (req, res) => {
  try {
    const { projectId } = req.query;
    const start = new Date();
    const end = new Date(Date.now() + 14 * 86400000);

    const where = {
      OR: [
        { startDate: { lte: end }, endDate: { gte: start } },
      ],
      ...(projectId ? { projectId: Number(projectId) } : {}),
      status: { in: ['planned', 'active'] },
    };

    // Group by machine
    const allocations = await prisma.resourceAllocation.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: {
        Project: { select: { id: true, name: true } },
        StationMachine: { select: { id: true, name: true } },
      },
      take: 500,
    });

    const byMachine = new Map();
    for (const a of allocations) {
      const key = a.machineId;
      if (!byMachine.has(key)) byMachine.set(key, []);
      byMachine.get(key).push(a);
    }

    const conflicts = [];
    for (const [machineId, list] of byMachine.entries()) {
      // Find overlaps among allocations for this machine across different projects
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          const overlap = !(new Date(a.endDate) < new Date(b.startDate) || new Date(b.endDate) < new Date(a.startDate));
          if (overlap && a.projectId !== b.projectId) {
            conflicts.push({
              resourceId: String(machineId),
              resourceName: a.StationMachine?.name || `Machine ${machineId}`,
              conflictingProjects: [
                { projectId: String(a.Project.id), projectName: a.Project.name, stageName: 'Production' },
                { projectId: String(b.Project.id), projectName: b.Project.name, stageName: 'Production' },
              ],
              startDate: a.startDate,
              endDate: new Date(Math.min(new Date(a.endDate), new Date(b.endDate))),
              severity: 'warning',
            });
          }
        }
      }
    }

    res.json(conflicts);
  } catch (e) {
    console.error('planning:conflicts', e);
    res.status(500).json({ error: 'Failed to fetch conflicts' });
  }
});

// GET /api/planning/learning-insights?projectId=
router.get('/learning-insights', async (req, res) => {
  try {
    const { projectId } = req.query;
    const where = projectId ? { projectId: Number(projectId) } : {};
    const total = await prisma.planAdaptation.count({ where });
    const accepted = await prisma.planAdaptation.count({ where: { ...where, status: 'accepted' } });
    const rejected = await prisma.planAdaptation.count({ where: { ...where, status: 'rejected' } });

    res.json({
      acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
      avgTimeSaved: 0,
      avgCostSaved: 0,
      totalSuggestionsProcessed: accepted + rejected,
    });
  } catch (e) {
    console.error('planning:learning-insights', e);
    res.status(500).json({ error: 'Failed to fetch learning insights' });
  }
});

module.exports = router;
