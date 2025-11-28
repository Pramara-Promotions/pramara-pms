const express = require('express');
const { authenticate: requireAuth } = require('../middleware/auth');
const dailyPlanService = require('../services/dailyPlanService');
const { PrismaClient } = require('@prisma/client');
const { createNotification } = require('./notifications');

const prisma = new PrismaClient();

const router = express.Router();
router.use(requireAuth);

// POST /api/auto-planning/generate { projectId, notes }
router.post('/generate', async (req, res) => {
  try {
    const { projectId, notes } = req.body || {};
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const result = await dailyPlanService.generateDailyPlan({
      projectId: Number(projectId),
      generatedBy: req.auth?.user?.email || 'system',
      notes: notes || null,
    });
    // Emit websocket event and persist a notification for the actor
    try {
      const io = req.app.get('io');
      const userId = req.auth?.user?.id;
      const plan = result?.planGeneration;
      if (io && plan && userId) {
        io.to(`user:${userId}`).emit('auto-plan:generated', {
          projectId: plan.projectId,
          planId: plan.id,
          version: plan.version,
          status: plan.status,
          projectCode: plan.Project?.code || String(plan.projectId),
          generatedAt: plan.generatedAt,
        });
        io.to(`project:${plan.projectId}`).emit('auto-plan:generated', {
          projectId: plan.projectId,
          planId: plan.id,
          version: plan.version,
          status: plan.status,
          projectCode: plan.Project?.code || String(plan.projectId),
          generatedAt: plan.generatedAt,
        });
      }
      // Create notification only if user exists in DB
      if (userId && plan) {
        const userExists = await prisma.user.findUnique({ where: { id: userId } });
        if (userExists) {
          await createNotification({
            userId,
            type: 'AUTO_PLAN_GENERATED',
            title: 'Daily Plan Generated',
            message: `Plan v${plan.version} generated for ${plan.Project?.code || 'project #' + plan.projectId}.`,
          }, io);
        }
      }
    } catch (e) {
      console.warn('[auto-planning:generate] ws/notification emit failed:', e?.message || e);
    }

    res.status(201).json({ success: true, ...result });
  } catch (e) {
    console.error('auto-planning:generate', e);
    res.status(500).json({ error: e.message || 'Failed to generate auto plan' });
  }
});

// POST /api/auto-planning/approve/:planGenerationId
router.post('/approve/:planGenerationId', async (req, res) => {
  try {
    const { planGenerationId } = req.params;
    const approved = await dailyPlanService.approvePlan(String(planGenerationId), req.auth?.user?.email || 'system');
    // Emit websocket event + notification
    try {
      const io = req.app.get('io');
      const userId = req.auth?.user?.id;
      if (io && userId) {
        io.to(`user:${userId}`).emit('auto-plan:approved', {
          planId: approved.id,
          approvedBy: approved.approvedBy,
          approvedAt: approved.approvedAt,
        });
        io.to(`project:${approved.projectId}`).emit('auto-plan:approved', {
          planId: approved.id,
          projectId: approved.projectId,
          approvedBy: approved.approvedBy,
          approvedAt: approved.approvedAt,
        });
      }
      // Create notification only if user exists in DB
      if (userId) {
        const userExists = await prisma.user.findUnique({ where: { id: userId } });
        if (userExists) {
          await createNotification({
            userId,
            type: 'AUTO_PLAN_APPROVED',
            title: 'Plan Approved',
            message: `Plan ${approved.id} approved and allocations created.`,
          }, io);
        }
      }
    } catch (e) {
      console.warn('[auto-planning:approve] ws/notification emit failed:', e?.message || e);
    }

    res.json({ success: true, approved });
  } catch (e) {
    console.error('auto-planning:approve', e);
    res.status(500).json({ error: e.message || 'Failed to approve plan' });
  }
});

// POST /api/auto-planning/reject/:planGenerationId { reason }
router.post('/reject/:planGenerationId', async (req, res) => {
  try {
    const { planGenerationId } = req.params;
    const { reason } = req.body || {};
    const rejected = await dailyPlanService.rejectPlan(String(planGenerationId), req.auth?.user?.email || 'system', reason || 'No reason');
    // Emit websocket event + notification
    try {
      const io = req.app.get('io');
      const userId = req.auth?.user?.id;
      if (io && userId) {
        io.to(`user:${userId}`).emit('auto-plan:rejected', {
          planId: rejected.id,
          rejectedBy: rejected.approvedBy,
          rejectedAt: rejected.approvedAt,
          reason: rejected.notes || reason || 'No reason',
        });
        io.to(`project:${rejected.projectId}`).emit('auto-plan:rejected', {
          planId: rejected.id,
          projectId: rejected.projectId,
          rejectedBy: rejected.approvedBy,
          rejectedAt: rejected.approvedAt,
          reason: rejected.notes || reason || 'No reason',
        });
      }
      // Create notification only if user exists in DB
      if (userId) {
        const userExists = await prisma.user.findUnique({ where: { id: userId } });
        if (userExists) {
          await createNotification({
            userId,
            type: 'AUTO_PLAN_REJECTED',
            title: 'Plan Rejected',
            message: `Plan ${rejected.id} rejected. Reason: ${rejected.notes || reason || 'No reason'}`,
          }, io);
        }
      }
    } catch (e) {
      console.warn('[auto-planning:reject] ws/notification emit failed:', e?.message || e);
    }

    res.json({ success: true, rejected });
  } catch (e) {
    console.error('auto-planning:reject', e);
    res.status(500).json({ error: e.message || 'Failed to reject plan' });
  }
});

// POST /api/auto-planning/rebalance { projectIds: [] }
router.post('/rebalance', async (req, res) => {
  try {
    const { projectIds } = req.body || {};
    if (!Array.isArray(projectIds) || projectIds.length === 0) return res.status(400).json({ error: 'projectIds array required' });
    const result = await dailyPlanService.rebalancePlans(projectIds.map(Number));
    // Emit summary event (optional)
    try {
      const io = req.app.get('io');
      const userId = req.auth?.user?.id;
      if (io && userId) {
        io.to(`user:${userId}`).emit('auto-plan:rebalance', result);
      }
    } catch {}

    res.json({ success: true, ...result });
  } catch (e) {
    console.error('auto-planning:rebalance', e);
    res.status(500).json({ error: e.message || 'Failed to rebalance plans' });
  }
});

// GET /api/auto-planning/plans — list recent generated plans with details shaped for UI
router.get('/plans', async (req, res) => {
  try {
    const plans = await prisma.dailyPlanGeneration.findMany({
      orderBy: { generatedAt: 'desc' },
      include: {
        Project: { select: { id: true, code: true, name: true, cutoffDate: true } },
        stationPlans: {
          orderBy: { date: 'asc' },
          include: {
            Station: { select: { id: true, name: true } },
            ProjectSku: { select: { id: true, name: true } },
          },
        },
      },
      take: 50,
    });

    // Map to the UI shape expected by AutoPlanningPage
    const shaped = plans.map((p) => ({
      id: p.id,
      projectId: p.projectId,
      generatedAt: p.generatedAt,
      status: p.status,
      approvedBy: p.approvedBy,
      approvedAt: p.approvedAt,
      rejectedBy: null,
      rejectedAt: null,
      rejectionReason: null,
      totalCapacityUsed: 0,
      estimatedCompletionDate: p.endDate ?? null,
      notes: p.notes ?? null,
      Project: p.Project,
      dailyPlanStationsAuto: (p.stationPlans || []).map((d) => ({
        id: d.id,
        planId: p.id,
        projectId: d.projectId,
        skuId: d.skuId,
        stationId: d.stationId,
        date: d.date,
        plannedQuantity: d.targetQty,
        allocatedMachines: d.allocatedMachines,
        machineIds: [],
        estimatedCapacity: d.effectiveCapacity,
        sku: { skuName: d.ProjectSku?.name || `SKU #${d.skuId}` },
        station: { stationName: d.Station?.name || `Station #${d.stationId}` },
      })),
    }));

    res.json({ plans: shaped });
  } catch (e) {
    console.error('auto-planning:plans', e);
    res.status(500).json({ error: 'Failed to list plans' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-PROCESS PLANNING ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

const multiProcessPlanner = require('../services/multiProcessPlanner');
const processChainAnalyzer = require('../services/processChainAnalyzer');
const resourceValidator = require('../services/resourceValidator');

/**
 * POST /api/auto-planning/analyze-process-flow/:flowId
 * Analyze a process flow to identify bottlenecks
 */
router.post('/analyze-process-flow/:flowId', async (req, res) => {
  try {
    const { flowId } = req.params;
    
    const analysis = await processChainAnalyzer.analyzeProcessChain(flowId);
    res.json(analysis);
  } catch (error) {
    console.error('POST /analyze-process-flow/:flowId failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to analyze process flow' 
    });
  }
});

/**
 * POST /api/auto-planning/validate-resources
 * Validate resources before planning
 */
router.post('/validate-resources', async (req, res) => {
  try {
    const { projectId, processFlowId } = req.body;
    
    if (!projectId || !processFlowId) {
      return res.status(400).json({ 
        error: 'Project ID and Process Flow ID are required' 
      });
    }
    
    const validation = await resourceValidator.validatePlanningResources(
      Number(projectId),
      processFlowId
    );
    
    res.json(validation);
  } catch (error) {
    console.error('POST /validate-resources failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to validate resources' 
    });
  }
});

/**
 * POST /api/auto-planning/generate-multi-process
 * Generate a multi-process production plan
 */
router.post('/generate-multi-process', async (req, res) => {
  try {
    const {
      projectId,
      processFlowId,
      quantity,
      startDate,
      hoursPerDay = 8,
      workingDaysPerWeek = 6,
      strategy = 'bottleneck'
    } = req.body;
    
    // Validation
    if (!projectId || !processFlowId || !quantity || !startDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: projectId, processFlowId, quantity, startDate' 
      });
    }
    
    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be positive' });
    }
    
    const result = await multiProcessPlanner.generateMultiProcessPlan({
      projectId: Number(projectId),
      processFlowId,
      quantity: Number(quantity),
      startDate: new Date(startDate),
      hoursPerDay: Number(hoursPerDay),
      workingDaysPerWeek: Number(workingDaysPerWeek),
      strategy
    });
    
    res.json(result);
  } catch (error) {
    console.error('POST /generate-multi-process failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate plan' 
    });
  }
});

/**
 * GET /api/auto-planning/plans/:planId/operations
 * Get process details for a plan grouped by date
 */
router.get('/plans/:planId/operations', async (req, res) => {
  try {
    const { planId } = req.params;
    
    const details = await prisma.processPlanDetail.findMany({
      where: { planId },
      include: {
        ProcessOperation: true,
        Station: true
      },
      orderBy: [
        { date: 'asc' },
        { sequence: 'asc' }
      ]
    });
    
    // Group by date
    const grouped = {};
    for (const detail of details) {
      const dateKey = detail.date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(detail);
    }
    
    res.json({ details, grouped });
  } catch (error) {
    console.error('GET /plans/:planId/operations failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch operation details' 
    });
  }
});

/**
 * PUT /api/auto-planning/plans/:planId/operations/:detailId
 * Update individual operation plan
 */
router.put('/plans/:planId/operations/:detailId', async (req, res) => {
  try {
    const { detailId } = req.params;
    const updates = req.body;
    
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
    
    res.json(updated);
  } catch (error) {
    console.error('PUT /plans/:planId/operations/:detailId failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to update operation plan' 
    });
  }
});

module.exports = router;
