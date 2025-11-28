// api/routes/load-balancing.js
// Adaptive load balancing API

const express = require('express');
const router = express.Router();
const loadBalancingService = require('../services/loadBalancingService');
const authGuard = require('../middleware/authGuard');

// Apply auth to all routes
router.use(authGuard);

/**
 * POST /api/load-balancing/events
 * Record a resource availability change
 */
router.post('/events', async (req, res) => {
  try {
    const event = req.body;
    const userId = req.user?.id;

    const result = await loadBalancingService.recordAvailabilityEvent({
      ...event,
      detectedBy: event.detectedBy || userId || 'system'
    });

    res.json({
      success: true,
      event: result.event,
      opportunitiesGenerated: result.opportunities.length,
      opportunities: result.opportunities
    });
  } catch (error) {
    console.error('POST /events failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to record availability event' 
    });
  }
});

/**
 * GET /api/load-balancing/plans/:planId/opportunities
 * Get all pending opportunities for a plan
 */
router.get('/plans/:planId/opportunities', async (req, res) => {
  try {
    const { planId } = req.params;

    const opportunities = await loadBalancingService.getPendingOpportunities(planId);

    res.json({
      opportunities,
      count: opportunities.length,
      summary: {
        highPriority: opportunities.filter(o => o.priority >= 8).length,
        mediumPriority: opportunities.filter(o => o.priority >= 5 && o.priority < 8).length,
        lowPriority: opportunities.filter(o => o.priority < 5).length
      }
    });
  } catch (error) {
    console.error('GET /plans/:planId/opportunities failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch opportunities' 
    });
  }
});

/**
 * POST /api/load-balancing/opportunities/:opportunityId/accept
 * Accept and implement an opportunity
 */
router.post('/opportunities/:opportunityId/accept', async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const { decisionNote } = req.body;
    const userId = req.user?.id;

    const result = await loadBalancingService.acceptOpportunity(
      opportunityId,
      userId,
      decisionNote || 'Opportunity accepted'
    );

    res.json({
      success: true,
      accepted: result.accepted,
      appliedChanges: result.appliedChanges.length,
      message: 'Opportunity implemented successfully'
    });
  } catch (error) {
    console.error('POST /opportunities/:opportunityId/accept failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to accept opportunity' 
    });
  }
});

/**
 * POST /api/load-balancing/opportunities/:opportunityId/reject
 * Reject an opportunity
 */
router.post('/opportunities/:opportunityId/reject', async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const { decisionNote } = req.body;
    const userId = req.user?.id;

    const rejected = await loadBalancingService.rejectOpportunity(
      opportunityId,
      userId,
      decisionNote || 'Opportunity rejected'
    );

    res.json({
      success: true,
      rejected,
      message: 'Opportunity rejected'
    });
  } catch (error) {
    console.error('POST /opportunities/:opportunityId/reject failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to reject opportunity' 
    });
  }
});

/**
 * POST /api/load-balancing/plans/:planId/suggest-ramp-up
 * Suggest a gradual ramp-up plan
 */
router.post('/plans/:planId/suggest-ramp-up', async (req, res) => {
  try {
    const { planId } = req.params;
    const { rampUpDays = 5 } = req.body;

    const opportunity = await loadBalancingService.suggestGradualRampUp(
      planId,
      parseInt(rampUpDays)
    );

    res.json({
      success: true,
      opportunity,
      message: `Gradual ${rampUpDays}-day ramp-up suggested`
    });
  } catch (error) {
    console.error('POST /plans/:planId/suggest-ramp-up failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to suggest ramp-up' 
    });
  }
});

/**
 * GET /api/load-balancing/events/recent
 * Get recent availability events
 */
router.get('/events/recent', async (req, res) => {
  try {
    const { limit = 20, resourceType } = req.query;

    const where = {};
    if (resourceType) {
      where.resourceType = resourceType;
    }

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const events = await prisma.resourceAvailabilityEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      include: {
        _count: {
          select: { opportunities: true }
        }
      }
    });

    res.json({ events, count: events.length });
  } catch (error) {
    console.error('GET /events/recent failed:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch events' 
    });
  }
});

module.exports = router;
