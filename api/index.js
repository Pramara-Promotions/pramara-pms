// api/index.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/', (_req, res) => {
  res.send('✅  API is running and DB is connected');
});

const PORT = process.env.PORT || 4000;

// ---------- helpers ----------
async function ensureRules(projectId) {
  const count = await prisma.alertRule.count({ where: { projectId } });
  if (count === 0) {
    await prisma.alertRule.createMany({
      data: [
        { projectId, key: 'QC.rejected',          level: 'AMBER', threshold: 1,    recipients: 'lead@local',                enabled: true },
        { projectId, key: 'QC.rejected',          level: 'RED',   threshold: 1000, recipients: 'ops@local,admin@local',     enabled: true },
        { projectId, key: 'Inventory.shortfall',  level: 'AMBER', threshold: 1,    recipients: 'lead@local',                enabled: true },
        { projectId, key: 'Inventory.shortfall',  level: 'RED',   threshold: 3000, recipients: 'ops@local,admin@local',     enabled: true },
        { projectId, key: 'Pantone.mismatch',     level: 'AMBER', threshold: 0,    recipients: 'lead@local',                enabled: true },
      ],
    });
  }
}

function toCents(n) {
  if (n === null || n === undefined || n === '') return null;
  const parsed = Number(n);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed * 100);
}

// ---------- DEV seed ----------
app.post('/api/dev/seed', async (_req, res) => {
  try {
    let project = await prisma.project.findFirst();
    if (!project) {
      project = await prisma.project.create({
        data: {
          code: 'PRJ-0001',
          name: 'Figurine – Wave A',
          sku: 'FG-A-75MM',
          quantity: 50000,
          cutoffDate: new Date('2025-10-28T00:00:00.000Z'),
          pantoneCode: '186C',
        },
      });
    }
    await ensureRules(project.id);
    res.json({ ok: true, projectId: project.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Seeding failed' });
  }
});

// ---------- projects ----------
app.get('/api/projects', async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({ orderBy: { id: 'asc' } });
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// CREATE project  (Step 2A)
app.post('/api/projects', async (req, res) => {
  try {
    const { code, name, sku, quantity, cutoffDate, pantoneCode, status } = req.body || {};
    const proj = await prisma.project.create({
      data: {
        code: String(code),
        name: String(name),
        sku: String(sku || ''),
        quantity: Number(quantity || 0),
        cutoffDate: cutoffDate ? new Date(cutoffDate) : new Date(),
        pantoneCode: pantoneCode ?? null,
        ...(status !== undefined ? { status: String(status) } : {}), // only if column exists
      },
    });
    res.json(proj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Create project failed' });
  }
});

// UPDATE project  (Step 2A)
app.put('/api/projects/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { code, name, sku, quantity, cutoffDate, pantoneCode, status } = req.body || {};
    const proj = await prisma.project.update({
      where: { id },
      data: {
        ...(code !== undefined ? { code: String(code) } : {}),
        ...(name !== undefined ? { name: String(name) } : {}),
        ...(sku !== undefined ? { sku: String(sku) } : {}),
        ...(quantity !== undefined ? { quantity: Number(quantity) } : {}),
        ...(cutoffDate !== undefined ? { cutoffDate: new Date(cutoffDate) } : {}),
        ...(pantoneCode !== undefined ? { pantoneCode } : {}),
        ...(status !== undefined ? { status: String(status) } : {}), // only if column exists
      },
    });
    res.json(proj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update project failed' });
  }
});

// DELETE project  (Step 2A)
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.project.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete project failed' });
  }
});

// ---------- alert rules ----------
app.get('/api/projects/:id/alert-rules', async (req, res) => {
  try {
    const id = Number(req.params.id);
    await ensureRules(id);
    const rules = await prisma.alertRule.findMany({
      where: { projectId: id },
      orderBy: [{ key: 'asc' }, { level: 'asc' }],
    });
    // return recipients as array for UI convenience
    const mapped = rules.map(r => ({
      ...r,
      recipients: r.recipients ? r.recipients.split(',').map(s => s.trim()).filter(Boolean) : [],
    }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch alert rules' });
  }
});

app.put('/api/projects/:id/alert-rules', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const incoming = Array.isArray(req.body) ? req.body : [];
    await prisma.alertRule.deleteMany({ where: { projectId: id } });
    for (const r of incoming) {
      await prisma.alertRule.create({
        data: {
          projectId: id,
          key: String(r.key),
          level: String(r.level),
          threshold: Number(r.threshold ?? 0),
          recipients: (Array.isArray(r.recipients) ? r.recipients : String(r.recipients || '').split(','))
            .map(s => String(s).trim())
            .filter(Boolean)
            .join(','),
          enabled: Boolean(r.enabled ?? true),
        },
      });
    }
    const rules = await prisma.alertRule.findMany({ where: { projectId: id } });
    res.json(rules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save alert rules' });
  }
});

// ---------- alerts list ----------
app.get('/api/projects/:id/alerts', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const openOnly = String(req.query.openOnly || 'false').toLowerCase() === 'true';
    const alerts = await prisma.alert.findMany({
      where: { projectId: id, ...(openOnly ? { status: { in: ['OPEN', 'ACKNOWLEDGED'] } } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { actions: true },
    });
    res.json(alerts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// ---------- QC intake (triggers alerts) ----------
app.post('/api/projects/:id/qc', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const {
      batchCode,
      passed = 0,
      rejected = 0,
      reason = 'unspecified',
      pantoneMatch = 'Match',
    } = req.body || {};

    const record = await prisma.qCRecord.create({
      data: {
        projectId,
        batchCode,
        passed: Number(passed),
        rejected: Number(rejected),
        reason,
        pantoneMatch,
      },
    });

    // QC.rejected rules
    const rules = await prisma.alertRule.findMany({
      where: { projectId, key: 'QC.rejected', enabled: true },
    });
    for (const rule of rules) {
      const threshold = Number(rule.threshold ?? 0);
      if (rejected >= threshold) {
        await prisma.alert.create({
          data: {
            projectId,
            level: rule.level,
            message: `QC rejected ${rejected} unit(s) in ${batchCode} (reason: ${reason}).`,
          },
        });
      }
    }

    // Pantone mismatch rules
    if (pantoneMatch === 'Mismatch') {
      const pRules = await prisma.alertRule.findMany({
        where: { projectId, key: 'Pantone.mismatch', enabled: true },
      });
      const proj = await prisma.project.findUnique({ where: { id: projectId } });
      const expected = proj?.pantoneCode || 'N/A';
      for (const rule of pRules) {
        await prisma.alert.create({
          data: {
            projectId,
            level: rule.level,
            message: `Pantone mismatch in ${batchCode} — expected ${expected}.`,
          },
        });
      }
    }

    res.json({ ok: true, recordId: record.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'QC save failed' });
  }
});

// ---------- qc list (needed by frontend) ----------
app.get('/api/projects/:id/qc', async (req, res) => {
  const projectId = Number(req.params.id);
  try {
    const records = await prisma.qCRecord.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch QC records' });
  }
});

// ---------- alert actions ----------
app.post('/api/alerts/:alertId/ack', async (req, res) => {
  try {
    const alertId = Number(req.params.alertId);
    const { by = 'unknown', note = '' } = req.body || {};

    const found = await prisma.alert.findUnique({ where: { id: alertId } });
    if (!found) return res.status(404).json({ error: 'Alert not found' });

    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'ACKNOWLEDGED',
        actions: { create: { action: 'ACK', by, note } },
      },
      include: { actions: true },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ack failed' });
  }
});

app.post('/api/alerts/:alertId/resolve', async (req, res) => {
  try {
    const alertId = Number(req.params.alertId);
    const {
      by = 'unknown',
      note = '',
      correctiveActions = '',
      preventRecurrence = '',
      costImpact = null,
      costNote = '',
      close = true,
    } = req.body || {};

    const found = await prisma.alert.findUnique({ where: { id: alertId } });
    if (!found) return res.status(404).json({ error: 'Alert not found' });

    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: close ? 'RESOLVED' : 'ACKNOWLEDGED',
        actions: {
          create: {
            action: 'RESOLVE',
            by,
            note,
            correctiveActions,
            preventRecurrence,
            costImpactCents: toCents(costImpact),
            costNote,
          },
        },
      },
      include: { actions: true },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Resolve failed' });
  }
});

app.post('/api/alerts/:alertId/comment', async (req, res) => {
  try {
    const alertId = Number(req.params.alertId);
    const { by = 'unknown', note = '' } = req.body || {};

    const found = await prisma.alert.findUnique({ where: { id: alertId } });
    if (!found) return res.status(404).json({ error: 'Alert not found' });

    const updated = await prisma.alert.update({
      where: { id: alertId },
      data: { actions: { create: { action: 'COMMENT', by, note } } },
      include: { actions: true },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Comment failed' });
  }
});

// ---------- inventory: needs list ----------
app.get('/api/projects/:id/inventory/needs', async (req, res) => {
  const projectId = Number(req.params.id);
  try {
    const needs = await prisma.inventoryNeed.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(needs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch inventory needs' });
  }
});

// ---------- inventory: recompute ----------
app.post('/api/projects/:id/inventory/recompute', async (req, res) => {
  const projectId = Number(req.params.id);
  const payload = req.body || {};
  const items = Array.isArray(payload.needs) ? payload.needs : [];

  try {
    const rows = items
      .map(r => ({
        material: String(r.material || '').trim(),
        requiredQty: Number(r.requiredQty || 0),
        availableQty: Number(r.availableQty || 0),
      }))
      .filter(r => r.material.length > 0)
      .map(r => ({ ...r, shortfall: Math.max(0, r.requiredQty - r.availableQty) }));

    await prisma.$transaction([
      prisma.inventoryNeed.deleteMany({ where: { projectId } }),
      prisma.inventoryNeed.createMany({
        data: rows.map(r => ({
          projectId,
          material: r.material,
          requiredQty: r.requiredQty,
          availableQty: r.availableQty,
          shortfall: r.shortfall,
          updatedAt: new Date(),
        })),
      }),
    ]);

    const totalShortfall = rows.reduce((s, r) => s + r.shortfall, 0);
    if (totalShortfall > 0) {
      const rules = await prisma.alertRule.findMany({
        where: { projectId, key: 'Inventory.shortfall', enabled: true },
      });
      for (const rule of rules) {
        const threshold = Number(rule.threshold ?? 0);
        if (totalShortfall >= threshold) {
          await prisma.alert.create({
            data: {
              projectId,
              level: rule.level,
              message: `Inventory shortfall detected — total ${totalShortfall} unit(s) across ${rows.length} item(s).`,
            },
          });
        }
      }
    }

    res.json({ ok: true, totalShortfall, items: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Recompute failed' });
  }
});

// ---------- planning: simulate backward from cutoff ----------
app.post('/api/projects/:id/plan/simulate', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const proj = await prisma.project.findUnique({ where: { id: projectId } });
    if (!proj) return res.status(404).json({ error: 'Project not found' });

    const {
      quantity = proj.quantity,
      cutoffDate = proj.cutoffDate,
      buffers = { shippingDays: 2, qcDays: 1 },
      stages = [], // [{ name, unitsPerDay }]
    } = req.body || {};

    if (!Array.isArray(stages) || stages.length === 0) {
      return res.status(400).json({ error: 'stages[] required' });
    }

    // Compute production end = cutoff - shipping buffer - final QC buffer
    const cutoff = new Date(cutoffDate);
    const afterShipping = new Date(cutoff);
    afterShipping.setDate(afterShipping.getDate() - Number(buffers.shippingDays || 0));
    const productionEnd = new Date(afterShipping);
    productionEnd.setDate(productionEnd.getDate() - Number(buffers.qcDays || 0));

    // Try a few capacity multipliers to show risk/sensitivity
    const multipliers = [1.0, 1.1, 1.25];

    const scenarios = multipliers.map(mult => {
      const plan = [];
      let cursor = new Date(productionEnd);

      // Plan stages backward (Packing ← Assembly ← Painting ← Molding)
      for (let i = stages.length - 1; i >= 0; i--) {
        const s = stages[i];
        const upd = Math.max(0, Number(s.unitsPerDay || 0)) * mult;
        const daysNeeded = upd > 0 ? Math.ceil(Number(quantity) / upd) : Infinity;

        const stageEnd = new Date(cursor);
        const stageStart = new Date(cursor);
        stageStart.setDate(stageStart.getDate() - (isFinite(daysNeeded) ? daysNeeded : 0));

        plan.unshift({
          stage: s.name || `Stage${i + 1}`,
          startDate: stageStart.toISOString(),
          endDate: stageEnd.toISOString(),
          daysNeeded: isFinite(daysNeeded) ? daysNeeded : 0,
          unitsPerDay: Math.floor(upd),
        });

        cursor = stageStart;
      }

      // Risk: if start already past => RED; if <3 days slack => AMBER; else GREEN
      const startOfFirst = new Date(plan[0].startDate);
      const today = new Date();
      const diffDays = Math.floor((startOfFirst - today) / (24 * 3600 * 1000));
      const risk = diffDays < 0 ? 'RED' : diffDays < 3 ? 'AMBER' : 'GREEN';

      return { multiplier: mult, risk, slackDays: diffDays, plan };
    });

    res.json({
      projectId,
      quantity,
      cutoffDate: new Date(cutoffDate).toISOString(),
      buffers,
      scenarios,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Plan simulate failed' });
  }
});

// ---------- start server ----------
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
