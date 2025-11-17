const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(requireAuth);

// GET /api/time-planning/policies
router.get('/policies', async (_req, res) => {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'timePlanningPolicy' } });
    const value = setting?.value || {
      urgencyWeight: 0.6,
      valueWeight: 0.3,
      effortWeight: 0.1,
      atRiskThresholdDays: 3,
    };
    res.json({ policy: value });
  } catch (e) {
    console.error('time-planning:policies:get', e);
    res.status(500).json({ error: 'Failed to load policies' });
  }
});

// POST /api/time-planning/policies { urgencyWeight, valueWeight, effortWeight, atRiskThresholdDays }
router.post('/policies', async (req, res) => {
  try {
    const { urgencyWeight = 0.6, valueWeight = 0.3, effortWeight = 0.1, atRiskThresholdDays = 3 } = req.body || {};
    const total = Number(urgencyWeight) + Number(valueWeight) + Number(effortWeight);
    if (Math.abs(total - 1) > 0.001) return res.status(400).json({ error: 'Weights must sum to 1.0' });

    const value = { urgencyWeight: Number(urgencyWeight), valueWeight: Number(valueWeight), effortWeight: Number(effortWeight), atRiskThresholdDays: Number(atRiskThresholdDays) };
    await prisma.systemSetting.upsert({
      where: { key: 'timePlanningPolicy' },
      update: { value },
      create: { key: 'timePlanningPolicy', value },
    });
    res.status(201).json({ policy: value });
  } catch (e) {
    console.error('time-planning:policies:post', e);
    res.status(500).json({ error: 'Failed to save policy' });
  }
});

module.exports = router;
