const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(requireAuth);

// GET /api/margin-rules
router.get('/', async (_req, res) => {
  try {
    const rules = await prisma.marginRule.findMany({ orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }] });
    res.json({ rules });
  } catch (e) {
    console.error('margin-rules:list', e);
    res.status(500).json({ error: 'Failed to list margin rules' });
  }
});

// POST /api/margin-rules
router.post('/', async (req, res) => {
  try {
    const { name, marginType = 'percentage', marginValue = 20, applicableToCustomer = [], applicableToMarket = [], minVolume = null, maxVolume = null, priority = 0, active = true } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const rule = await prisma.marginRule.create({
      data: {
        name: String(name),
        marginType: String(marginType),
        marginValue: Number(marginValue),
        applicableToCustomer,
        applicableToMarket,
        minVolume: minVolume != null ? Number(minVolume) : null,
        maxVolume: maxVolume != null ? Number(maxVolume) : null,
        priority: Number(priority),
        active: Boolean(active),
      }
    });
    res.status(201).json({ rule });
  } catch (e) {
    console.error('margin-rules:create', e);
    res.status(500).json({ error: 'Failed to create margin rule' });
  }
});

// PUT /api/margin-rules/:id
router.put('/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const data = {};
    const fields = ['name','marginType','marginValue','applicableToCustomer','applicableToMarket','minVolume','maxVolume','priority','active'];
    for (const f of fields) if (req.body[f] !== undefined) data[f] = req.body[f];
    if (data.marginValue != null) data.marginValue = Number(data.marginValue);
    if (data.minVolume != null) data.minVolume = Number(data.minVolume);
    if (data.maxVolume != null) data.maxVolume = Number(data.maxVolume);
    if (data.priority != null) data.priority = Number(data.priority);
    const rule = await prisma.marginRule.update({ where: { id }, data });
    res.json({ rule });
  } catch (e) {
    console.error('margin-rules:update', e);
    res.status(500).json({ error: 'Failed to update margin rule' });
  }
});

// DELETE /api/margin-rules/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    await prisma.marginRule.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('margin-rules:delete', e);
    res.status(500).json({ error: 'Failed to delete margin rule' });
  }
});

module.exports = router;
