// api/routes/projectSkus.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

// Reuse if already created elsewhere; otherwise create one.
const prisma = global.prisma || new PrismaClient();

/**
 * GET /api/project-skus?projectId=123
 * List SKUs for a project (optionally filter by poNumber via ?poNumber=...)
 */
router.get('/project-skus', async (req, res) => {
  try {
    const projectId = Number(req.query.projectId);
    const poNumber = req.query.poNumber ? String(req.query.poNumber) : undefined;

    if (!Number.isFinite(projectId)) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const skus = await prisma.projectSku.findMany({
      where: { projectId, ...(poNumber ? { poNumber } : {}) },
      orderBy: [{ poNumber: 'asc' }, { id: 'asc' }],
    });

    res.json(skus);
  } catch (err) {
    console.error('GET /project-skus failed', err);
    res.status(500).json({ error: 'Failed to fetch SKUs' });
  }
});

/**
 * POST /api/project-skus
 * Body: { projectId, poNumber?, code, name?, color?, type?, orderQty?, attributes? }
 */
router.post('/project-skus', async (req, res) => {
  try {
    const {
      projectId,
      poNumber = null,
      code,
      name = null,
      color = null,
      type = null,
      orderQty = null,
      attributes = null,
    } = req.body || {};

    const pid = Number(projectId);
    if (!Number.isFinite(pid)) return res.status(400).json({ error: 'projectId is required' });
    if (!code || !String(code).trim()) return res.status(400).json({ error: 'code is required' });

    const created = await prisma.projectSku.create({
      data: {
        projectId: pid,
        poNumber: poNumber ? String(poNumber) : null,
        code: String(code),
        name: name ? String(name) : null,
        color: color ? String(color) : null,
        type: type ? String(type) : null,
        orderQty: orderQty !== null && orderQty !== undefined ? Number(orderQty) : null,
        attributes: attributes ?? null, // can be object or null
      },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error('POST /project-skus failed', err);
    // Likely unique/constraint error: surface a friendly message
    if (err?.code === 'P2002') {
      return res.status(409).json({ error: 'Duplicate SKU code for this project' });
    }
    res.status(500).json({ error: 'Failed to create SKU' });
  }
});

/**
 * PUT /api/project-skus/:id
 * Body: partial fields { poNumber?, name?, color?, type?, orderQty?, attributes? }
 */
router.put('/project-skus/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

    const {
      poNumber,
      code, // optional (only if you want to allow renaming the SKU code)
      name,
      color,
      type,
      orderQty,
      attributes,
    } = req.body || {};

    const updated = await prisma.projectSku.update({
      where: { id },
      data: {
        ...(poNumber !== undefined ? { poNumber: poNumber ? String(poNumber) : null } : {}),
        ...(code !== undefined ? { code: String(code) } : {}),
        ...(name !== undefined ? { name: name ? String(name) : null } : {}),
        ...(color !== undefined ? { color: color ? String(color) : null } : {}),
        ...(type !== undefined ? { type: type ? String(type) : null } : {}),
        ...(orderQty !== undefined
          ? { orderQty: orderQty !== null && orderQty !== undefined ? Number(orderQty) : null }
          : {}),
        ...(attributes !== undefined ? { attributes: attributes ?? null } : {}),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('PUT /project-skus/:id failed', err);
    res.status(500).json({ error: 'Failed to update SKU' });
  }
});

/**
 * DELETE /api/project-skus/:id
 */
router.delete('/project-skus/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

    await prisma.projectSku.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /project-skus/:id failed', err);
    res.status(500).json({ error: 'Failed to delete SKU' });
  }
});

module.exports = router;