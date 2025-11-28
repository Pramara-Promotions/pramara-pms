// api/routes/plan-editor.js
// Interactive plan modification API

const express = require('express');
const router = express.Router();
const planEditorService = require('../services/planEditorService');
const authGuard = require('../middleware/authGuard');

// Apply auth to all routes
router.use(authGuard);

/**
 * PUT /api/plan-editor/operations/:detailId
 * Update a single operation in a plan
 */
router.put('/operations/:detailId', async (req, res) => {
  try {
    const { detailId } = req.params;
    const { updates, reason } = req.body;
    const userId = req.user?.id;

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Updates object is required' });
    }

    const result = await planEditorService.updateOperationPlan(
      detailId,
      updates,
      userId,
      reason || 'Manual adjustment'
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('PUT /operations/:detailId failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to update operation' 
    });
  }
});

/**
 * POST /api/plan-editor/operations/:detailId/split
 * Split an operation across multiple days
 */
router.post('/operations/:detailId/split', async (req, res) => {
  try {
    const { detailId } = req.params;
    const { splitConfig, reason } = req.body;
    const userId = req.user?.id;

    if (!splitConfig || !Array.isArray(splitConfig)) {
      return res.status(400).json({ 
        error: 'splitConfig array is required (format: [{date, quantity, stationId?, assignedMachines?}])' 
      });
    }

    const splits = await planEditorService.splitOperationAcrossDays(
      detailId,
      splitConfig,
      userId,
      reason || 'Split operation across days'
    );

    res.json({
      success: true,
      splits,
      message: `Operation split into ${splits.length} parts`
    });
  } catch (error) {
    console.error('POST /operations/:detailId/split failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to split operation' 
    });
  }
});

/**
 * POST /api/plan-editor/analyze-impact
 * Analyze impact of a proposed change without applying it
 */
router.post('/analyze-impact', async (req, res) => {
  try {
    const { detailId, proposedUpdates } = req.body;

    if (!detailId || !proposedUpdates) {
      return res.status(400).json({ 
        error: 'detailId and proposedUpdates are required' 
      });
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const currentDetail = await prisma.processPlanDetail.findUnique({
      where: { id: detailId },
      include: {
        ProcessOperation: true,
        Station: true,
        DailyPlanGeneration: {
          include: {
            processDetails: {
              include: { ProcessOperation: true },
              orderBy: { sequence: 'asc' }
            }
          }
        }
      }
    });

    if (!currentDetail) {
      return res.status(404).json({ error: 'Operation detail not found' });
    }

    const impactAnalysis = await planEditorService.analyzeChangeImpact(
      currentDetail,
      proposedUpdates
    );

    const conflicts = await planEditorService.detectConflicts(
      currentDetail.planId,
      detailId,
      proposedUpdates
    );

    res.json({
      impactAnalysis,
      conflicts,
      recommendation: conflicts.length === 0 
        ? 'No conflicts detected. Safe to apply changes.'
        : `${conflicts.filter(c => c.severity === 'critical').length} critical conflicts found. Review before applying.`
    });
  } catch (error) {
    console.error('POST /analyze-impact failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to analyze impact' 
    });
  }
});

/**
 * GET /api/plan-editor/plans/:planId/conflicts
 * Get all conflicts for a plan
 */
router.get('/plans/:planId/conflicts', async (req, res) => {
  try {
    const { planId } = req.params;
    const { includeResolved } = req.query;

    const conflicts = await planEditorService.getPlanConflicts(
      planId,
      includeResolved === 'true'
    );

    const summary = {
      total: conflicts.length,
      critical: conflicts.filter(c => c.severity === 'critical').length,
      warning: conflicts.filter(c => c.severity === 'warning').length,
      info: conflicts.filter(c => c.severity === 'info').length
    };

    res.json({ conflicts, summary });
  } catch (error) {
    console.error('GET /plans/:planId/conflicts failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch conflicts' 
    });
  }
});

/**
 * PUT /api/plan-editor/conflicts/:conflictId/resolve
 * Mark a conflict as resolved
 */
router.put('/conflicts/:conflictId/resolve', async (req, res) => {
  try {
    const { conflictId } = req.params;
    const { resolutionNote } = req.body;
    const userId = req.user?.id;

    const resolved = await planEditorService.resolveConflict(
      conflictId,
      userId,
      resolutionNote || 'Conflict resolved'
    );

    res.json({ success: true, resolved });
  } catch (error) {
    console.error('PUT /conflicts/:conflictId/resolve failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to resolve conflict' 
    });
  }
});

/**
 * GET /api/plan-editor/plans/:planId/history
 * Get modification history for a plan
 */
router.get('/plans/:planId/history', async (req, res) => {
  try {
    const { planId } = req.params;
    const { limit } = req.query;

    const history = await planEditorService.getModificationHistory(
      planId,
      limit ? parseInt(limit) : 50
    );

    res.json({ history, count: history.length });
  } catch (error) {
    console.error('GET /plans/:planId/history failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch modification history' 
    });
  }
});

/**
 * POST /api/plan-editor/plans/:planId/propagate
 * Manually trigger capacity propagation
 */
router.post('/plans/:planId/propagate', async (req, res) => {
  try {
    const { planId } = req.params;
    const { fromSequence, date } = req.body;

    if (fromSequence === undefined || !date) {
      return res.status(400).json({ 
        error: 'fromSequence and date are required' 
      });
    }

    await planEditorService.propagateCapacityChanges(
      planId,
      parseInt(fromSequence),
      new Date(date)
    );

    res.json({ 
      success: true, 
      message: 'Capacity changes propagated downstream' 
    });
  } catch (error) {
    console.error('POST /plans/:planId/propagate failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to propagate changes' 
    });
  }
});

module.exports = router;
