const express = require('express');
const { authenticate: requireAuth } = require('../middleware/auth');
const resourceMonitor = require('../services/resourceMonitor');
const opportunityDetector = require('../services/opportunityDetector');
const rampUpExecutor = require('../services/rampUpExecutor');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();
router.use(requireAuth);

// GET /api/load-balancing/events - List recent availability events
router.get('/events', async (req, res) => {
  try {
    const { limit = 50, resourceType, status } = req.query;

    const where = {};
    if (resourceType) where.resourceType = resourceType;
    if (status) where.status = status;

    const events = await prisma.resourceAvailabilityEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      include: {
        project: { select: { id: true, code: true, name: true } },
        station: { select: { id: true, code: true, name: true } },
        mold: { select: { id: true, moldCode: true, moldName: true } },
        opportunities: {
          select: { id: true, status: true, estimatedTimeSaved: true },
        },
      },
    });

    res.json({ events, count: events.length });
  } catch (error) {
    console.error('GET /events failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/load-balancing/events/manual - Manually create an availability event
router.post('/events/manual', async (req, res) => {
  try {
    const result = await resourceMonitor.createAvailabilityEvent({
      ...req.body,
      detectedBy: req.user?.id || 'manual',
    });

    // Analyze the event immediately
    if (result.event) {
      const analysis = await opportunityDetector.analyzeAvailabilityEvent(result.event);
      return res.status(201).json({
        ...result,
        opportunitiesCreated: analysis.count || 0,
        opportunities: analysis.opportunities || [],
      });
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('POST /events/manual failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/load-balancing/opportunities - List pending opportunities
router.get('/opportunities', async (req, res) => {
  try {
    const { status = 'pending', limit = 20 } = req.query;

    const opportunities = await prisma.loadBalancingOpportunity.findMany({
      where: { status },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: parseInt(limit),
      include: {
        ResourceAvailabilityEvent: {
          select: {
            id: true,
            resourceType: true,
            resourceName: true,
            eventType: true,
            capacityDelta: true,
          },
        },
        sourceProject: { select: { id: true, code: true, name: true } },
        targetProject: { select: { id: true, code: true, name: true } },
        DailyPlanGeneration: { select: { id: true, status: true } },
      },
    });

    res.json({ opportunities, count: opportunities.length });
  } catch (error) {
    console.error('GET /opportunities failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/load-balancing/opportunities/:id - Get opportunity details
router.get('/opportunities/:id', async (req, res) => {
  try {
    const opportunity = await prisma.loadBalancingOpportunity.findUnique({
      where: { id: req.params.id },
      include: {
        ResourceAvailabilityEvent: {
          include: {
            project: { select: { id: true, code: true, name: true } },
            station: { select: { id: true, code: true, name: true } },
            mold: { select: { id: true, moldCode: true, moldName: true } },
          },
        },
        sourceProject: true,
        targetProject: true,
        DailyPlanGeneration: {
          include: {
            Project: { select: { id: true, code: true, name: true } },
          },
        },
        RampUpSchedule: true,
      },
    });

    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    res.json({ opportunity });
  } catch (error) {
    console.error('GET /opportunities/:id failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/load-balancing/opportunities/:id/approve - Approve and execute opportunity
router.post('/opportunities/:id/approve', async (req, res) => {
  try {
    const { decisionNote } = req.body;
    const userId = req.user?.id;

    const exec = await rampUpExecutor.executeRampUp(req.params.id, userId);

    res.json({
      success: true,
      ...exec,
      message: 'Opportunity approved and ramp-up initiated',
      decisionNote,
    });
  } catch (error) {
    console.error('POST /opportunities/:id/approve failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/load-balancing/opportunities/:id/reject - Reject opportunity
router.post('/opportunities/:id/reject', async (req, res) => {
  try {
    const { decisionNote } = req.body;
    const userId = req.user?.id;

    const updated = await prisma.loadBalancingOpportunity.update({
      where: { id: req.params.id },
      data: {
        status: 'rejected',
        decidedBy: userId,
        decidedAt: new Date(),
        decisionNote: decisionNote || 'Rejected',
      },
    });

    res.json({
      success: true,
      rejected: updated,
      message: 'Opportunity rejected',
    });
  } catch (error) {
    console.error('POST /opportunities/:id/reject failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/load-balancing/active-rampups - List active ramp-up schedules
router.get('/active-rampups', async (req, res) => {
  try {
    const rampUps = await prisma.rampUpSchedule.findMany({
      where: {
        status: { in: ['SCHEDULED', 'IN_PROGRESS', 'ADJUSTED'] },
      },
      orderBy: { startDate: 'asc' },
      include: {
        opportunity: {
          include: {
            targetProject: { select: { id: true, code: true, name: true } },
            ResourceAvailabilityEvent: {
              select: { resourceType: true, resourceName: true },
            },
          },
        },
        project: { select: { id: true, code: true, name: true } },
        station: { select: { id: true, code: true, name: true } },
      },
    });

    res.json({ rampUps, count: rampUps.length });
  } catch (error) {
    console.error('GET /active-rampups failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/load-balancing/opportunities/:id/progress - Monitor ramp-up progress
router.get('/opportunities/:id/progress', async (req, res) => {
  try {
    const progress = await rampUpExecutor.monitorRampUpProgress(req.params.id);
    res.json(progress);
  } catch (error) {
    console.error('GET /opportunities/:id/progress failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/load-balancing/scan - Trigger background scans manually
router.post('/scan', async (req, res) => {
  try {
    const { scanType = 'all' } = req.body;
    const results = {};

    if (scanType === 'all' || scanType === 'projects') {
      results.projects = await resourceMonitor.watchProjectCompletions();
    }

    if (scanType === 'all' || scanType === 'machines') {
      results.machines = await resourceMonitor.watchMachineStatus();
    }

    if (scanType === 'all' || scanType === 'molds') {
      results.molds = await resourceMonitor.watchMoldInventory();
    }

    const totalEvents = Object.values(results).reduce((sum, r) => sum + (r.eventsCreated || 0), 0);

    res.json({
      success: true,
      scanType,
      results,
      totalEventsCreated: totalEvents,
      message: `Scan complete: ${totalEvents} events created`,
    });
  } catch (error) {
    console.error('POST /scan failed:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
