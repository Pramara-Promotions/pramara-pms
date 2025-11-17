const express = require('express');
const { authenticate: requireAuth } = require('../middleware/auth');
const resourceService = require('../services/resourceService');
const { createNotification } = require('./notifications');

const router = express.Router();
router.use(requireAuth);

// GET /api/resources/availability?stationId=&machineType=&startDate=&endDate=
router.get('/availability', async (req, res) => {
  try {
    const { stationId, machineType, startDate, endDate, material } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate required' });
    }
    const availability = await resourceService.checkMachineAvailability({
      stationId: stationId ? Number(stationId) : undefined,
      machineType: machineType || undefined,
      startDate,
      endDate,
      material: material || undefined,
    });
    res.json({ availability });
  } catch (e) {
    console.error('resources:availability', e);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// POST /api/resources/allocate { projectId, skuId, stationId, machineIds, startDate, endDate }
router.post('/allocate', async (req, res) => {
  try {
    const { projectId, skuId, stationId, machineIds, startDate, endDate, notes } = req.body || {};
    if (!projectId || !skuId || !stationId || !Array.isArray(machineIds) || !startDate || !endDate) {
      return res.status(400).json({ error: 'projectId, skuId, stationId, machineIds, startDate, endDate required' });
    }
    const allocations = await resourceService.allocateMachines({
      projectId: Number(projectId),
      skuId: Number(skuId),
      stationId: Number(stationId),
      machineIds: machineIds.map(String),
      startDate,
      endDate,
      notes: notes || null,
      createdBy: req.auth?.user?.email || 'system',
    });
    // Emit allocation event & notify actor
    try {
      const io = req.app.get('io');
      const userId = req.auth?.user?.id;
      if (io && userId) {
        io.to(`user:${userId}`).emit('resource:allocated', {
          projectId: Number(projectId),
          skuId: Number(skuId),
          stationId: Number(stationId),
          machineIds: machineIds.map(Number),
          startDate,
          endDate,
        });
        io.to(`project:${Number(projectId)}`).emit('resource:allocated', {
          projectId: Number(projectId),
          skuId: Number(skuId),
          stationId: Number(stationId),
          machineIds: machineIds.map(Number),
          startDate,
          endDate,
        });
      }
      if (userId) {
        await createNotification({
          userId,
          type: 'RESOURCE_ALLOCATED',
          title: 'Resources Allocated',
          message: `Allocated ${machineIds.length} machine(s) to station ${stationId} for SKU ${skuId}.`,
        }, io);
      }
    } catch (e) {
      console.warn('[resources:allocate] ws/notification emit failed:', e?.message || e);
    }

    res.status(201).json({ allocations });
  } catch (e) {
    console.error('resources:allocate', e);
    res.status(500).json({ error: e.message || 'Failed to allocate machines' });
  }
});

// POST /api/resources/conflicts { machineIds, startDate, endDate }
router.post('/conflicts', async (req, res) => {
  try {
    const { machineIds, startDate, endDate } = req.body || {};
    if (!Array.isArray(machineIds) || !startDate || !endDate) {
      return res.status(400).json({ error: 'machineIds, startDate, endDate required' });
    }
    const conflicts = await resourceService.checkAllocationConflicts({
      machineIds: machineIds.map(String),
      startDate,
      endDate,
    });
    res.json({ conflicts });
  } catch (e) {
    console.error('resources:conflicts', e);
    res.status(500).json({ error: 'Failed to check conflicts' });
  }
});

// GET /api/resources/utilization?stationId=&startDate=&endDate=
router.get('/utilization', async (req, res) => {
  try {
    const { stationId, startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate required' });
    const report = await resourceService.getMachineUtilization({
      stationId: stationId ? Number(stationId) : undefined,
      startDate,
      endDate,
    });
    res.json(report);
  } catch (e) {
    console.error('resources:utilization', e);
    res.status(500).json({ error: 'Failed to get utilization' });
  }
});

// POST /api/resources/release/:allocationId
router.post('/release/:allocationId', async (req, res) => {
  try {
    const { allocationId } = req.params;
    const allocation = await resourceService.releaseAllocation(String(allocationId));
    res.json({ allocation });
  } catch (e) {
    console.error('resources:release', e);
    res.status(500).json({ error: 'Failed to release allocation' });
  }
});

// GET /api/resources/reallocate/suggest?projectId=&stationId=
router.get('/reallocate/suggest', async (req, res) => {
  try {
    const { projectId, stationId } = req.query;
    if (!projectId || !stationId) return res.status(400).json({ error: 'projectId and stationId required' });
    const suggestion = await resourceService.suggestReallocation(Number(projectId), Number(stationId));
    res.json(suggestion);
  } catch (e) {
    console.error('resources:reallocate-suggest', e);
    res.status(500).json({ error: 'Failed to suggest reallocation' });
  }
});

module.exports = router;
