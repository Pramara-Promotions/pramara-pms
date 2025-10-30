const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(requireAuth);

// POST /api/workstation-assets/assign
router.post('/assign', async (req, res) => {
  try {
    const { workstationId, assetId, isPrimary = false, isRequired = true, cycleTimeImpact, efficiencyImpact, notes } = req.body || {};
    if (!workstationId || !assetId) return res.status(400).json({ error: 'workstationId and assetId are required' });

    // If there's an active assignment, do nothing (idempotent); else create
    const existing = await prisma.workstationAsset.findFirst({ where: { workstationId: Number(workstationId), assetId: String(assetId), removedAt: null } });
    let link;
    if (existing) {
      link = await prisma.workstationAsset.update({
        where: { id: existing.id },
        data: { isPrimary: Boolean(isPrimary), isRequired: Boolean(isRequired), cycleTimeImpact: cycleTimeImpact ?? existing.cycleTimeImpact, efficiencyImpact: efficiencyImpact ?? existing.efficiencyImpact, notes: notes ?? existing.notes },
      });
    } else {
      link = await prisma.workstationAsset.create({
        data: {
          workstationId: Number(workstationId),
          assetId: String(assetId),
          isPrimary: Boolean(isPrimary),
          isRequired: Boolean(isRequired),
          cycleTimeImpact: cycleTimeImpact ?? null,
          efficiencyImpact: efficiencyImpact ?? null,
          notes: notes || null,
        },
      });
    }

    // Update asset location/assignment hint
    await prisma.asset.update({ where: { id: String(assetId) }, data: { assignedToStation: String(workstationId), status: 'in_use' } }).catch(() => {});

    res.json({ ok: true, link });
  } catch (e) {
    console.error('ws-assets:assign', e);
    res.status(500).json({ error: 'Failed to assign asset to workstation' });
  }
});

// POST /api/workstation-assets/unassign
router.post('/unassign', async (req, res) => {
  try {
    const { workstationId, assetId, removedBy } = req.body || {};
    if (!workstationId || !assetId) return res.status(400).json({ error: 'workstationId and assetId are required' });

    const existing = await prisma.workstationAsset.findFirst({ where: { workstationId: Number(workstationId), assetId: String(assetId), removedAt: null } });
    if (!existing) return res.status(404).json({ error: 'Active assignment not found' });

    const link = await prisma.workstationAsset.update({ where: { id: existing.id }, data: { removedAt: new Date(), removedBy: removedBy || null, isPrimary: false } });

    // Update asset
    await prisma.asset.update({ where: { id: String(assetId) }, data: { assignedToStation: null, status: 'available' } }).catch(() => {});

    res.json({ ok: true, link });
  } catch (e) {
    console.error('ws-assets:unassign', e);
    res.status(500).json({ error: 'Failed to unassign asset from workstation' });
  }
});

// GET /api/workstation-assets/station/:id/assets
router.get('/station/:id/assets', async (req, res) => {
  try {
    const workstationId = Number(req.params.id);
    const links = await prisma.workstationAsset.findMany({ where: { workstationId, removedAt: null }, include: { Asset: true } });
    res.json({ workstationId, assets: links.map(l => ({ ...l.Asset, isPrimary: l.isPrimary, isRequired: l.isRequired, cycleTimeImpact: l.cycleTimeImpact, efficiencyImpact: l.efficiencyImpact, assignedAt: l.assignedAt })) });
  } catch (e) {
    console.error('ws-assets:list-by-station', e);
    res.status(500).json({ error: 'Failed to list assets for station' });
  }
});

// GET /api/workstation-assets/asset/:id/stations
router.get('/asset/:id/stations', async (req, res) => {
  try {
    const assetId = String(req.params.id);
    const links = await prisma.workstationAsset.findMany({ where: { assetId }, include: { Workstation: true } });
    res.json({ assetId, workstations: links.map(l => ({ id: l.workstationId, removedAt: l.removedAt, isPrimary: l.isPrimary, assignedAt: l.assignedAt })) });
  } catch (e) {
    console.error('ws-assets:list-by-asset', e);
    res.status(500).json({ error: 'Failed to list stations for asset' });
  }
});

module.exports = router;
