const express = require('express');
const { authenticate: requireAuth } = require('../middleware/auth');
const bottleneckService = require('../services/bottleneckService');
const { createNotification } = require('./notifications');

const router = express.Router();
router.use(requireAuth);

// GET /api/bottlenecks/:projectId - detect bottlenecks
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const data = await bottleneckService.detectBottlenecks(Number(projectId));

    // Emit a summary event and optionally send a notification if high severity exists
    try {
      const io = req.app.get('io');
      const userId = req.auth?.user?.id;
      if (io && userId) {
        io.to(`user:${userId}`).emit('bottleneck:summary', {
          projectId: data.projectId,
          projectCode: data.projectCode,
          bottlenecksDetected: data.bottlenecksDetected,
          top: data.bottlenecks?.slice(0, 3) || [],
        });
        io.to(`project:${data.projectId}`).emit('bottleneck:summary', {
          projectId: data.projectId,
          projectCode: data.projectCode,
          bottlenecksDetected: data.bottlenecksDetected,
          top: data.bottlenecks?.slice(0, 3) || [],
        });
      }
      const top = data.bottlenecks?.[0];
      if (userId && top && (top.severity === 'critical' || top.severity === 'high')) {
        await createNotification({
          userId,
          type: 'BOTTLENECK_ALERT',
          title: `${top.severity.toUpperCase()} Bottleneck Detected`,
          message: `${top.stationCode}: ${top.skuCode} is ${top.gap}% behind expected (${data.expectedProgressPercent}% expected).`,
        }, io);
      }
    } catch (e) {
      console.warn('[bottlenecks:get] ws/notification emit failed:', e?.message || e);
    }

    res.json(data);
  } catch (e) {
    console.error('bottlenecks:detect', e);
    res.status(500).json({ error: e.message || 'Failed to detect bottlenecks' });
  }
});

// GET /api/bottlenecks/:projectId/history
router.get('/:projectId/history', async (req, res) => {
  try {
    const { projectId } = req.params;
    const history = await bottleneckService.getBottleneckHistory(Number(projectId));
    res.json({ history });
  } catch (e) {
    console.error('bottlenecks:history', e);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// POST /api/bottlenecks/simulate { bottleneckStationId, machinesToMove, bottleneckData }
router.post('/simulate', async (req, res) => {
  try {
    const { bottleneckStationId, machinesToMove, bottleneckData } = req.body || {};
    if (!bottleneckStationId || !machinesToMove || !bottleneckData) {
      return res.status(400).json({ error: 'bottleneckStationId, machinesToMove, bottleneckData required' });
    }
    const simulation = await bottleneckService.simulateImpact({
      bottleneckStationId: Number(bottleneckStationId),
      machinesToMove: Number(machinesToMove),
      bottleneckData,
    });
    res.json({ simulation });
  } catch (e) {
    console.error('bottlenecks:simulate', e);
    res.status(500).json({ error: e.message || 'Failed to simulate impact' });
  }
});

// POST /api/bottlenecks/adaptation { suggestion, simulation }
router.post('/adaptation', async (req, res) => {
  try {
    const { suggestion, simulation } = req.body || {};
    if (!suggestion || !simulation) return res.status(400).json({ error: 'suggestion and simulation required' });
    const adaptation = await bottleneckService.createAdaptationSuggestion(suggestion, simulation);
    res.status(201).json({ adaptation });
  } catch (e) {
    console.error('bottlenecks:adaptation', e);
    res.status(500).json({ error: e.message || 'Failed to create adaptation suggestion' });
  }
});

module.exports = router;
