const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(requireAuth);

// POST /api/maintenance
router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.stationId || !b.maintenanceType || !b.description || !b.startTime) {
      return res.status(400).json({ error: 'stationId, maintenanceType, description, startTime are required' });
    }
    const item = await prisma.maintenanceLog.create({
      data: {
        id: require('crypto').randomUUID(),
        stationId: Number(b.stationId),
        maintenanceType: String(b.maintenanceType),
        description: String(b.description),
        performedBy: b.performedBy || null,
        startTime: new Date(b.startTime),
        endTime: b.endTime ? new Date(b.endTime) : null,
        duration: b.duration != null ? Number(b.duration) : null,
        cost: b.cost != null ? Number(b.cost) : null,
        notes: b.notes || null,
      },
    });
    res.status(201).json(item);
  } catch (e) {
    console.error('maintenance:create', e);
    res.status(500).json({ error: 'Failed to create maintenance log' });
  }
});

// GET /api/maintenance
router.get('/', async (req, res) => {
  try {
    const { stationId, startDate, endDate, type } = req.query;
    const where = {};
    if (stationId) where.stationId = Number(stationId);
    if (type) where.maintenanceType = String(type);
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }
    const items = await prisma.maintenanceLog.findMany({ where, orderBy: { startTime: 'desc' } });
    res.json({ items });
  } catch (e) {
    console.error('maintenance:list', e);
    res.status(500).json({ error: 'Failed to list maintenance logs' });
  }
});

// PUT /api/maintenance/:id
router.put('/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const b = req.body || {};
    const item = await prisma.maintenanceLog.update({
      where: { id },
      data: {
        ...(b.maintenanceType !== undefined ? { maintenanceType: String(b.maintenanceType) } : {}),
        ...(b.description !== undefined ? { description: String(b.description) } : {}),
        ...(b.performedBy !== undefined ? { performedBy: b.performedBy || null } : {}),
        ...(b.startTime !== undefined ? { startTime: b.startTime ? new Date(b.startTime) : null } : {}),
        ...(b.endTime !== undefined ? { endTime: b.endTime ? new Date(b.endTime) : null } : {}),
        ...(b.duration !== undefined ? { duration: b.duration != null ? Number(b.duration) : null } : {}),
        ...(b.cost !== undefined ? { cost: b.cost != null ? Number(b.cost) : null } : {}),
        ...(b.notes !== undefined ? { notes: b.notes || null } : {}),
      },
    });
    res.json(item);
  } catch (e) {
    console.error('maintenance:update', e);
    if (e.code === 'P2025') return res.status(404).json({ error: 'Maintenance log not found' });
    res.status(500).json({ error: 'Failed to update maintenance log' });
  }
});

// DELETE /api/maintenance/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    await prisma.maintenanceLog.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('maintenance:delete', e);
    if (e.code === 'P2025') return res.status(404).json({ error: 'Maintenance log not found' });
    res.status(500).json({ error: 'Failed to delete maintenance log' });
  }
});

module.exports = router;
