const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(requireAuth);

// GET /api/cost-templates
router.get('/', async (_req, res) => {
  try {
    const templates = await prisma.costTemplate.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    res.json({ templates });
  } catch (e) {
    console.error('cost-templates:list', e);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// POST /api/cost-templates
router.post('/', async (req, res) => {
  try {
    const { name, category, defaultValue, unit, customizable = true } = req.body || {};
    if (!name || !category) return res.status(400).json({ error: 'name and category required' });
    const tpl = await prisma.costTemplate.create({ data: { name: String(name), category: String(category), unit: unit || null, defaultValue: defaultValue != null ? Number(defaultValue) : null, customizable: Boolean(customizable), active: true } });
    res.status(201).json({ template: tpl });
  } catch (e) {
    console.error('cost-templates:create', e);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// POST /api/cost-templates/apply { costingId, templateIds[] }
router.post('/apply', async (req, res) => {
  try {
    const { costingId, templateIds } = req.body || {};
    if (!costingId || !Array.isArray(templateIds) || !templateIds.length) return res.status(400).json({ error: 'costingId and templateIds[] required' });
    const templates = await prisma.costTemplate.findMany({ where: { id: { in: templateIds.map(String) } } });
    const created = [];
    for (const t of templates) {
      const component = await prisma.costComponent.create({
        data: {
          projectCostingId: String(costingId),
          category: t.category,
          name: t.name,
          unit: t.unit || null,
          allocation: 'per_unit',
          quantity: t.defaultValue != null ? 1 : 0,
          costPerUnit: t.defaultValue != null ? Number(t.defaultValue) : 0,
          totalCost: t.defaultValue != null ? Number(t.defaultValue) : 0,
          oneTime: false,
        }
      });
      created.push(component);
    }
    res.json({ applied: created.length, components: created });
  } catch (e) {
    console.error('cost-templates:apply', e);
    res.status(500).json({ error: 'Failed to apply templates' });
  }
});

// PUT /api/cost-templates/:id
router.put('/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    const { name, category, defaultValue, unit, customizable, active } = req.body || {};
    const data = {};
    if (name !== undefined) data.name = String(name);
    if (category !== undefined) data.category = String(category);
    if (defaultValue !== undefined) data.defaultValue = defaultValue != null ? Number(defaultValue) : null;
    if (unit !== undefined) data.unit = unit || null;
    if (customizable !== undefined) data.customizable = Boolean(customizable);
    if (active !== undefined) data.active = Boolean(active);
    const tpl = await prisma.costTemplate.update({ where: { id }, data });
    res.json({ template: tpl });
  } catch (e) {
    console.error('cost-templates:update', e);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /api/cost-templates/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = String(req.params.id);
    await prisma.costTemplate.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('cost-templates:delete', e);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

module.exports = router;
