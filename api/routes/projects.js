// api/routes/projects.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authGuard } = require('../middleware/authGuard');

const prisma = new PrismaClient();
const router = express.Router();

/** Utility: check if a Prisma model exists in this client */
function hasModel(name) {
  return prisma[name] && typeof prisma[name].findMany === 'function';
}

/** Utility: toInt */
const toInt = (v) => Number.parseInt(v, 10);

/** ============= Projects: list / create / update / delete ============= */

router.get('/projects', authGuard, async (_req, res) => {
  try {
    const items = await prisma.project.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('GET /projects failed:', e);
    res.json([]); // don’t 500 the UI
  }
});

router.post('/projects', authGuard, async (req, res) => {
  try {
    const { code, name, sku, quantity, cutoffDate, pantoneCode } = req.body || {};
    const created = await prisma.project.create({
      data: {
        code,
        name,
        sku: sku || null,
        quantity: Number(quantity || 0),
        cutoffDate: cutoffDate ? new Date(cutoffDate) : null,
        pantoneCode: pantoneCode || null,
      },
    });
    res.json(created);
  } catch (e) {
    console.error('POST /projects failed:', e);
    res.status(400).json({ error: 'Create project failed' });
  }
});

router.put('/projects/:id', authGuard, async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const updated = await prisma.project.update({
      where: { id },
      data: req.body || {},
    });
    res.json(updated);
  } catch (e) {
    console.error('PUT /projects/:id failed:', e);
    res.status(400).json({ error: 'Update project failed' });
  }
});

router.delete('/projects/:id', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  try {
    // Best-effort clean up if related tables exist
    try { if (hasModel('alert')) await prisma.alert.deleteMany({ where: { projectId: id } }); } catch {}
    try { if (hasModel('alertRule')) await prisma.alertRule.deleteMany({ where: { projectId: id } }); } catch {}
    try { if (hasModel('complianceItem')) await prisma.complianceItem.deleteMany({ where: { projectId: id } }); } catch {}
    try { if (hasModel('preProdStep')) await prisma.preProdStep.deleteMany({ where: { projectId: id } }); } catch {}
    try { if (hasModel('qcRecord')) await prisma.qcRecord.deleteMany({ where: { projectId: id } }); } catch {}
    try { if (hasModel('projectDocument')) await prisma.projectDocument.deleteMany({ where: { projectId: id } }); } catch {}
    try { if (hasModel('varianceItem')) await prisma.varianceItem.deleteMany({ where: { projectId: id } }); } catch {}
    try { if (hasModel('inventoryNeed')) await prisma.inventoryNeed.deleteMany({ where: { projectId: id } }); } catch {}
    try { if (hasModel('changeLog')) await prisma.changeLog.deleteMany({ where: { projectId: id } }); } catch {}

    const out = await prisma.project.delete({ where: { id } });
    res.json({ ok: true, project: out });
  } catch (e) {
    console.error('DELETE /projects/:id failed:', e);
    res.status(400).json({ error: 'Delete failed' });
  }
});

/** ======================= Alerts & Alert Rules ======================= */

router.get('/projects/:id/alerts', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('alert')) return res.json([]);
  try {
    const items = await prisma.alert.findMany({
      where: { projectId: id },
      orderBy: [{ createdAt: 'desc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('GET /alerts failed:', e);
    res.json([]);
  }
});

router.get('/projects/:id/alert-rules', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('alertRule')) return res.json([]);
  try {
    const items = await prisma.alertRule.findMany({
      where: { projectId: id },
      orderBy: [{ id: 'asc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('GET /alert-rules failed:', e);
    res.json([]);
  }
});

router.put('/projects/:id/alert-rules', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('alertRule')) return res.json(req.body || []);
  try {
    const rows = Array.isArray(req.body) ? req.body : [];
    await prisma.$transaction([
      prisma.alertRule.deleteMany({ where: { projectId: id } }),
      prisma.alertRule.createMany({
        data: rows.map((r) => ({
          projectId: id,
          key: r.key,
          level: r.level || 'INFO',
          threshold: Number(r.threshold || 0),
          recipients: Array.isArray(r.recipients) ? r.recipients : [],
          enabled: !!r.enabled,
        })),
      }),
    ]);
    const items = await prisma.alertRule.findMany({ where: { projectId: id } });
    res.json(items);
  } catch (e) {
    console.error('PUT /alert-rules failed:', e);
    res.status(400).json({ error: 'Save rules failed' });
  }
});

/** ======================= Inventory Needs ======================= */

router.get('/projects/:id/inventory/needs', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('inventoryNeed')) return res.json([]); // schema may not have this table yet
  try {
    const items = await prisma.inventoryNeed.findMany({
      where: { projectId: id },
      orderBy: [{ createdAt: 'desc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('GET /inventory/needs failed:', e);
    res.json([]); // keep UI working
  }
});

router.post('/projects/:id/inventory/recompute', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  const { needs } = req.body || { needs: [] };
  const rows = Array.isArray(needs) ? needs : [];

  // If you don't have an InventoryNeed model yet, just return the computed rows.
  if (!hasModel('inventoryNeed')) {
    try {
      // Optionally, create alerts if there are gaps and Alert model exists
      if (hasModel('alert')) {
        const anyGap = rows.some((r) => (r.requiredQty || 0) > (r.availableQty || 0));
        if (anyGap) {
          await prisma.alert.create({
            data: {
              projectId: id,
              type: 'INVENTORY_GAP',
              level: 'AMBER',
              message: 'Inventory gaps detected from recompute.',
            },
          });
        }
      }
    } catch {}
    return res.json(rows);
  }

  try {
    // replace current snapshot
    await prisma.inventoryNeed.deleteMany({ where: { projectId: id } });
    await prisma.inventoryNeed.createMany({
      data: rows.map((n) => ({
        projectId: id,
        material: n.material,
        requiredQty: Number(n.requiredQty || 0),
        availableQty: Number(n.availableQty || 0),
      })),
    });

    if (hasModel('alert')) {
      const anyGap = rows.some((r) => (r.requiredQty || 0) > (r.availableQty || 0));
      if (anyGap) {
        await prisma.alert.create({
          data: {
            projectId: id,
            type: 'INVENTORY_GAP',
            level: 'AMBER',
            message: 'Inventory gaps detected from recompute.',
          },
        });
      }
    }

    const items = await prisma.inventoryNeed.findMany({ where: { projectId: id } });
    res.json(items);
  } catch (e) {
    console.error('POST /inventory/recompute failed:', e);
    res.status(400).json({ error: 'Recompute failed' });
  }
});

/** ======================= Pre-Production / Compliance ======================= */

router.get('/projects/:id/preprod', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('preProdStep')) return res.json([]);
  try {
    const items = await prisma.preProdStep.findMany({
      where: { projectId: id },
      orderBy: [{ order: 'asc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('GET /preprod failed:', e);
    res.json([]);
  }
});

router.get('/projects/:id/compliance', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('complianceItem')) return res.json([]);
  try {
    const items = await prisma.complianceItem.findMany({
      where: { projectId: id },
      orderBy: [{ dueDate: 'asc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('GET /compliance failed:', e);
    res.json([]);
  }
});

/** ======================= Change Log / Documents / Variances ======================= */

router.get('/projects/:id/changes', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('changeLog')) return res.json([]);
  try {
    const items = await prisma.changeLog.findMany({
      where: { projectId: id },
      orderBy: [{ createdAt: 'desc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('GET /changes failed:', e);
    res.json([]);
  }
});

router.get('/projects/:id/documents', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('projectDocument')) return res.json([]);
  try {
    const items = await prisma.projectDocument.findMany({
      where: { projectId: id },
      orderBy: [{ version: 'desc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('GET /documents failed:', e);
    res.json([]);
  }
});

router.get('/projects/:id/variances', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('varianceItem')) return res.json([]);
  try {
    const items = await prisma.varianceItem.findMany({
      where: { projectId: id },
      include: { document: hasModel('projectDocument') ? true : false },
      orderBy: [{ createdAt: 'desc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('GET /variances failed:', e);
    res.json([]);
  }
});
/** ======================= Create: Change Log ======================= */
router.post('/projects/:id/changes', authGuard, async (req, res) => {
  const id = Number(req.params.id);
  const { type, description, requestedBy } = req.body || {};
  if (!hasModel('changeLog')) return res.status(200).json({
    id: Date.now(), projectId: id, type, description, requestedBy: requestedBy || null, createdAt: new Date()
  });
  try {
    const row = await prisma.changeLog.create({
      data: { projectId: id, type, description, requestedBy: requestedBy || null }
    });
    res.json(row);
  } catch (e) {
    console.error('POST /changes failed:', e);
    res.status(400).json({ error: 'Create change failed' });
  }
});
// DELETE change log item
router.delete('/projects/:id/changes/:changeId', authGuard, async (req, res) => {
  try {
    const changeId = Number(req.params.changeId);
    await prisma.changeLog.delete({ where: { id: changeId } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Delete failed' });
  }
});


/** ======================= Create: Document ======================= */
router.post('/projects/:id/documents', authGuard, async (req, res) => {
  const id = Number(req.params.id);
  const { kind, title, url, version } = req.body || {};
  if (!hasModel('projectDocument')) return res.status(200).json({
    id: Date.now(), projectId: id, kind, title, url, version: Number(version || 1)
  });
  try {
    const row = await prisma.projectDocument.create({
      data: { projectId: id, kind, title, url, version: Number(version || 1) }
    });
    res.json(row);
  } catch (e) {
    console.error('POST /documents failed:', e);
    res.status(400).json({ error: 'Create document failed' });
  }
});

/** ======================= Create: Variance ======================= */
router.post('/projects/:id/variances', authGuard, async (req, res) => {
  const id = Number(req.params.id);
  const { documentId, description } = req.body || {};
  if (!hasModel('varianceItem')) return res.status(200).json({
    id: Date.now(), projectId: id, documentId: documentId || null, description, createdAt: new Date()
  });
  try {
    const row = await prisma.varianceItem.create({
      data: { projectId: id, documentId: documentId || null, description }
    });
    res.json(row);
  } catch (e) {
    console.error('POST /variances failed:', e);
    res.status(400).json({ error: 'Create variance failed' });
  }
});

/** ======================= Create: Pre-Prod Step ======================= */
router.post('/projects/:id/preprod', authGuard, async (req, res) => {
  const id = Number(req.params.id);
  const { name, owner, status, dueDate, order } = req.body || {};
  if (!hasModel('preProdStep')) return res.status(200).json({
    id: Date.now(), projectId: id, name, owner: owner || null, status: status || 'PLANNED',
    dueDate: dueDate ? new Date(dueDate) : null, completedAt: null, order: Number(order || 0)
  });
  try {
    const row = await prisma.preProdStep.create({
      data: {
        projectId: id,
        name,
        owner: owner || null,
        status: status || 'PLANNED',
        dueDate: dueDate ? new Date(dueDate) : null,
        order: Number(order || 0),
      }
    });
    res.json(row);
  } catch (e) {
    console.error('POST /preprod failed:', e);
    res.status(400).json({ error: 'Create step failed' });
  }
});

/** ======================= Create: Compliance Item ======================= */
router.post('/projects/:id/compliance', authGuard, async (req, res) => {
  const id = Number(req.params.id);
  const { type, status, dueDate, remarks } = req.body || {};
  if (!hasModel('complianceItem')) return res.status(200).json({
    id: Date.now(), projectId: id, type, status: status || 'PLANNED',
    dueDate: dueDate ? new Date(dueDate) : null, remarks: remarks || null
  });
  try {
    const row = await prisma.complianceItem.create({
      data: {
        projectId: id,
        type,
        status: status || 'PLANNED',
        dueDate: dueDate ? new Date(dueDate) : null,
        remarks: remarks || null,
      }
    });
    res.json(row);
  } catch (e) {
    console.error('POST /compliance failed:', e);
    res.status(400).json({ error: 'Create compliance item failed' });
  }
});
// ---- SKUs: list / add (single or batch) / delete ----

// GET /api/projects/:id/skus
router.get('/projects/:id/skus', authGuard, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const rows = await prisma.projectSku.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load SKUs' });
  }
});

// POST /api/projects/:id/skus
// Accepts { code: "ABC" } or { codes: ["A","B","C"] }
router.post('/projects/:id/skus', authGuard, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    let codes = [];

    if (Array.isArray(req.body?.codes)) {
      codes = req.body.codes;
    } else if (typeof req.body?.code === 'string') {
      codes = [req.body.code];
    }

    codes = codes
      .map(s => String(s || '').trim())
      .filter(Boolean);

    if (codes.length === 0) {
      return res.status(400).json({ error: 'No SKU codes provided' });
    }

    // insert unique per project (ignore duplicates)
    const created = [];
    for (const code of codes) {
      try {
        const row = await prisma.projectSku.create({
          data: { projectId, code },
        });
        created.push(row);
      } catch (err) {
        // likely unique violation; skip
        if (process.env.NODE_ENV !== 'production') console.log('SKU skip:', code, err?.code);
      }
    }

    res.status(201).json(created.length === 1 ? created[0] : created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to add SKUs' });
  }
});

// DELETE /api/projects/:id/skus/:skuId
router.delete('/projects/:id/skus/:skuId', authGuard, async (req, res) => {
  try {
    const skuId = Number(req.params.skuId);
    await prisma.projectSku.delete({ where: { id: skuId } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete SKU' });
  }
});

/** ======================= QC ======================= */

router.get('/projects/:id/qc', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  if (!hasModel('qcRecord')) return res.json([]);
  try {
    const items = await prisma.qcRecord.findMany({
      where: { projectId: id },
      orderBy: [{ createdAt: 'desc' }],
    });
    res.json(items);
  } catch (e) {
    console.error('GET /qc failed:', e);
    res.json([]);
  }
});

router.post('/projects/:id/qc', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  const { batchCode, passed, rejected, reason, pantoneMatch } = req.body || {};

  if (!hasModel('qcRecord')) {
    // If schema lacks qcRecord, just bounce back a pseudo-row so UI proceeds
    const mock = {
      id: Date.now(),
      projectId: id,
      batchCode: batchCode || null,
      passed: Number(passed || 0),
      rejected: Number(rejected || 0),
      reason: reason || null,
      pantoneMatch: pantoneMatch || 'NA',
      createdAt: new Date().toISOString(),
    };
    try {
      if (hasModel('alert') && Number(rejected || 0) > 0) {
        await prisma.alert.create({
          data: { projectId: id, type: 'QC_REJECT', level: 'AMBER', message: `QC rejected: ${reason || 'n/a'}` },
        });
      }
    } catch {}
    return res.json(mock);
  }

  try {
    const row = await prisma.qcRecord.create({
      data: {
        projectId: id,
        batchCode: batchCode || null,
        passed: Number(passed || 0),
        rejected: Number(rejected || 0),
        reason: reason || null,
        pantoneMatch: pantoneMatch || 'NA',
      },
    });

    if (hasModel('alert') && Number(rejected || 0) > 0) {
      await prisma.alert.create({
        data: { projectId: id, type: 'QC_REJECT', level: 'AMBER', message: `QC rejected: ${reason || 'n/a'}` },
      });
    }

    res.json(row);
  } catch (e) {
    console.error('POST /qc failed:', e);
    res.status(400).json({ error: 'QC save failed' });
  }
});

/** ======================= Plan simulate ======================= */

router.post('/projects/:id/plan/simulate', authGuard, async (req, res) => {
  const id = toInt(req.params.id);
  try {
    const { quantity = 0, cutoffDate, buffers = {}, stages = [] } = req.body || {};
    const qty = Number(quantity || 0);
    const cutoff = cutoffDate ? new Date(cutoffDate) : new Date();
    const shipBuf = Number(buffers.shippingDays || 2);
    const qcBuf = Number(buffers.qcDays || 1);

    // trivial reverse plan: each stage needs qty / unitsPerDay days
    function makePlan(multiplier = 1) {
      let cursor = new Date(cutoff);
      cursor.setDate(cursor.getDate() - shipBuf - qcBuf); // reserve buffers
      const plan = [];
      for (let i = stages.length - 1; i >= 0; i--) {
        const s = stages[i];
        const upd = Math.max(1, Number(s.unitsPerDay || 1) * multiplier);
        const days = Math.ceil(qty / upd);
        const end = new Date(cursor);
        const start = new Date(cursor);
        start.setDate(start.getDate() - days);
        plan.unshift({
          stage: s.name,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          daysNeeded: days,
          unitsPerDay: upd,
        });
        cursor = start;
      }
      const slackDays = Math.max(0, Math.floor((cursor - new Date()) / (1000 * 60 * 60 * 24)));
      const risk = slackDays <= 0 ? 'RED' : slackDays < 3 ? 'AMBER' : 'GREEN';
      return { multiplier, risk, slackDays, plan };
    }

    const scenarios = [makePlan(1), makePlan(1.1), makePlan(1.2)];
    res.json({ projectId: id, quantity: qty, cutoffDate: cutoff.toISOString(), scenarios });
  } catch (e) {
    console.error('POST /plan/simulate failed:', e);
    res.status(400).json({ error: 'Plan simulate failed' });
  }
});

module.exports = { projectsRouter: router };
