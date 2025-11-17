const express = require('express');
const { authenticate: requireAuth } = require('../middleware/auth');
const bomService = require('../services/bomService');

const router = express.Router();
router.use(requireAuth);

// GET /api/bom/:projectId - full BOM tree
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const bom = await bomService.getProjectBOM(Number(projectId));
    res.json({ bom });
  } catch (e) {
    console.error('bom:get', e);
    res.status(500).json({ error: 'Failed to fetch BOM' });
  }
});

// GET /api/bom/:projectId/requirements - aggregated material requirements
router.get('/:projectId/requirements', async (req, res) => {
  try {
    const { projectId } = req.params;
    const requirements = await bomService.calculateMaterialRequirements(Number(projectId));
    res.json({ requirements });
  } catch (e) {
    console.error('bom:requirements', e);
    res.status(500).json({ error: 'Failed to calculate requirements' });
  }
});

// POST /api/bom/component { projectId, skuId, type, name, qtyPerUnit }
router.post('/component', async (req, res) => {
  try {
    const { projectId, skuId, type, name, quantityPerUnit, qtyPerUnit, color, pantone, pantoneCode, notes } = req.body || {};
    if (!projectId || !skuId || !type || !name) return res.status(400).json({ error: 'projectId, skuId, type, name required' });
    const component = await bomService.createComponent({
      projectId: Number(projectId),
      skuId: Number(skuId),
      type: String(type),
      name: String(name),
      qtyPerUnit: qtyPerUnit != null ? Number(qtyPerUnit) : (quantityPerUnit != null ? Number(quantityPerUnit) : 1),
      color: color || null,
      pantoneCode: pantoneCode || pantone || null,
      notes: notes || null,
    });
    res.status(201).json({ component });
  } catch (e) {
    console.error('bom:create-component', e);
    res.status(500).json({ error: e.message || 'Failed to create component' });
  }
});

// POST /api/bom/material-link { componentId, materialId, qtyPerComponent, unit }
router.post('/material-link', async (req, res) => {
  try {
    const { componentId, materialId, qtyPerComponent, unit, stage } = req.body || {};
    if (!componentId || !materialId || qtyPerComponent == null) return res.status(400).json({ error: 'componentId, materialId, qtyPerComponent required' });
    const link = await bomService.linkMaterialToComponent({
      componentId: String(componentId),
      materialId: String(materialId),
      qtyPerComponent: Number(qtyPerComponent),
      unit: unit || 'kg',
      stage: stage || null,
    });
    res.status(201).json({ link });
  } catch (e) {
    console.error('bom:material-link', e);
    res.status(500).json({ error: e.message || 'Failed to link material' });
  }
});

// PUT /api/bom/component/:componentId/quantity { quantityPerUnit }
router.put('/component/:componentId/quantity', async (req, res) => {
  try {
    const { componentId } = req.params;
    const { quantityPerUnit } = req.body || {};
    if (quantityPerUnit == null) return res.status(400).json({ error: 'quantityPerUnit required' });
    const updated = await bomService.updateComponentQuantity(Number(componentId), Number(quantityPerUnit));
    res.json({ component: updated });
  } catch (e) {
    console.error('bom:update-quantity', e);
    res.status(500).json({ error: e.message || 'Failed to update quantity' });
  }
});

// POST /api/bom/component/:componentId/deactivate
router.post('/component/:componentId/deactivate', async (req, res) => {
  try {
    const { componentId } = req.params;
    const deactivated = await bomService.deactivateComponent(Number(componentId));
    res.json({ component: deactivated });
  } catch (e) {
    console.error('bom:deactivate', e);
    res.status(500).json({ error: e.message || 'Failed to deactivate component' });
  }
});

// POST /api/bom/template/sunglasses { projectId, skuId, frameColor, templeColor }
router.post('/template/sunglasses', async (req, res) => {
  try {
    const { projectId, skuId, frameColor, templeColor } = req.body || {};
    if (!projectId || !skuId) return res.status(400).json({ error: 'projectId and skuId required' });
    const template = await bomService.createSunglassesBOMTemplate({
      projectId: Number(projectId),
      skuId: Number(skuId),
      frame: { color: frameColor || null },
      temple: { color: templeColor || null },
    });
    res.status(201).json({ template });
  } catch (e) {
    console.error('bom:template-sunglasses', e);
    res.status(500).json({ error: e.message || 'Failed to create template' });
  }
});

module.exports = router;
