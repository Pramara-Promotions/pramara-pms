// api/index.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Routers (import each ONCE)
const { authRouter } = require('./routes/auth');
const { meRouter } = require('./routes/me');
const { projectsRouter } = require('./routes/projects'); // <-- only here
const { uploadsRouter } = require('./routes/uploads');
const { documentsRouter } = require('./routes/documents');
const { adminRouter } = require('./routes/admin'); // if you have one
const { projectSkusRouter } = require('./routes/projectSkus');
const { sessionsRouter } = require("./routes/sessions");
const { auditRouter } = require("./routes/audit");
const { healthRouter } = require("./routes/health");
const app = express(); // must be before app.use(...)

// Security / middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(bodyParser.json());

// Rate limit only auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/auth', authLimiter);
app.use('/api', uploadsRouter);
app.use('/api', documentsRouter);
app.use('/api', projectSkusRouter);
app.use("/api", sessionsRouter);
app.use("/api", auditRouter);
app.use("/", healthRouter);

// Mount routers (each ONCE)
app.use('/api/auth', authRouter);
app.use('/api', meRouter);
app.use('/api', projectsRouter);
// app.use('/api', adminRouter);

// Healthcheck
app.get('/', (_req, res) => {
  res.send('✅ API is running and DB is connected');
});

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
// ---------- pre-production workflow ----------

// List all pre-production steps for a project
app.get('/api/projects/:id/preprod', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const steps = await prisma.preProdStep.findMany({
      where: { projectId },
      orderBy: { dueDate: 'asc' },
    });
    res.json(steps);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pre-production steps' });
  }
});
// ---------- compliance tracker ----------

// List compliance items for a project
app.get('/api/projects/:id/compliance', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const items = await prisma.complianceItem.findMany({
      where: { projectId },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
    });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch compliance items' });
  }
});

// Create a compliance item
app.post('/api/projects/:id/compliance', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const {
      type, status = 'PLANNED', owner, labName,
      dueDate, requestedAt, submittedAt, approvedAt,
      documentUrl, remarks
    } = req.body || {};

    const item = await prisma.complianceItem.create({
      data: {
        projectId,
        type: String(type),
        status: String(status),
        owner: owner || null,
        labName: labName || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        requestedAt: requestedAt ? new Date(requestedAt) : null,
        submittedAt: submittedAt ? new Date(submittedAt) : null,
        approvedAt: approvedAt ? new Date(approvedAt) : null,
        documentUrl: documentUrl || null,
        remarks: remarks || null,
      }
    });

    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create compliance item' });
  }
});

// Update a compliance item (+ auto timestamps + alert on APPROVED/REJECTED)
app.put('/api/compliance/:itemId', async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    const {
      type, status, owner, labName,
      dueDate, requestedAt, submittedAt, approvedAt,
      documentUrl, remarks
    } = req.body || {};

    const existing = await prisma.complianceItem.findUnique({ where: { id: itemId } });
    if (!existing) return res.status(404).json({ error: 'Compliance item not found' });

    // auto timestamps when status flips (idempotent)
    const patch = {
      ...(type !== undefined ? { type: String(type) } : {}),
      ...(status !== undefined ? { status: String(status) } : {}),
      ...(owner !== undefined ? { owner: owner || null } : {}),
      ...(labName !== undefined ? { labName: labName || null } : {}),
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      ...(requestedAt !== undefined ? { requestedAt: requestedAt ? new Date(requestedAt) : null } : {}),
      ...(submittedAt !== undefined ? { submittedAt: submittedAt ? new Date(submittedAt) : null } : {}),
      ...(approvedAt !== undefined ? { approvedAt: approvedAt ? new Date(approvedAt) : null } : {}),
      ...(documentUrl !== undefined ? { documentUrl: documentUrl || null } : {}),
      ...(remarks !== undefined ? { remarks: remarks || null } : {}),
    };

    // auto set submitted/approved timestamps if status changed and timestamp not provided
    if (status === 'SUBMITTED' && !existing.submittedAt && !submittedAt) {
      patch.submittedAt = new Date();
    }
    if (status === 'APPROVED' && !existing.approvedAt && !approvedAt) {
      patch.approvedAt = new Date();
    }

    const updated = await prisma.complianceItem.update({ where: { id: itemId }, data: patch });

    // fire alert when APPROVED or REJECTED → "visible in flow"
    if (existing.status !== updated.status && (updated.status === 'APPROVED' || updated.status === 'REJECTED')) {
      await prisma.alert.create({
        data: {
          projectId: updated.projectId,
          level: updated.status === 'REJECTED' ? 'RED' : 'AMBER',
          message: `Compliance ${updated.type} marked ${updated.status}${updated.documentUrl ? ` — doc: ${updated.documentUrl}` : ''}.`,
        }
      });
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update compliance item' });
  }
});

// Delete a compliance item
app.delete('/api/compliance/:itemId', async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);
    await prisma.complianceItem.delete({ where: { id: itemId } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete compliance item' });
  }
});
// ---------- change & version control ----------

// List all changes for a project
app.get('/api/projects/:id/changes', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const items = await prisma.changeLog.findMany({
      where: { projectId },
      orderBy: [{ requestedAt: 'desc' }],
    });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch changes' });
  }
});

// Create a change request
app.post('/api/projects/:id/changes', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { type, description, requestedBy, impact, approver } = req.body || {};

    const item = await prisma.changeLog.create({
      data: {
        projectId,
        type: String(type),
        description: description || null,
        requestedBy: requestedBy || "UNKNOWN",
        impact: Array.isArray(impact) ? impact : null,
        approver: approver || null,
        approvalRequired: true,
        approvalStatus: "PENDING",
      }
    });

    // create alert
    await prisma.alert.create({
      data: {
        projectId,
        level: "AMBER",
        message: `Change requested: ${item.type} (Pending Approval)`,
      }
    });

    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create change request' });
  }
});

// Approve / Reject a change
app.put('/api/changes/:changeId/approve', async (req, res) => {
  try {
    const changeId = Number(req.params.changeId);
    const { approvedBy, approvalStatus, approvalProof } = req.body || {};

    const existing = await prisma.changeLog.findUnique({ where: { id: changeId } });
    if (!existing) return res.status(404).json({ error: 'Change not found' });

    if (!["APPROVED","REJECTED"].includes(approvalStatus)) {
      return res.status(400).json({ error: 'Invalid approval status' });
    }

    const updated = await prisma.changeLog.update({
      where: { id: changeId },
      data: {
        approvalStatus,
        approvedBy: approvedBy || null,
        approvalProof: approvalProof || null,
        approvalDate: new Date(),
      }
    });

    // create alert
    await prisma.alert.create({
      data: {
        projectId: existing.projectId,
        level: approvalStatus === "REJECTED" ? "RED" : "GREEN",
        message: `Change ${approvalStatus}: ${existing.type}${approvalProof ? ` — proof: ${approvalProof}` : ''}`,
      }
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update approval' });
  }
});
// Update change meta (description / impacts / approver)
app.put('/api/changes/:changeId', async (req, res) => {
  try {
    const changeId = Number(req.params.changeId);
    const { description, impact, approver } = req.body || {};

    const existing = await prisma.changeLog.findUnique({ where: { id: changeId } });
    if (!existing) return res.status(404).json({ error: 'Change not found' });

    const updated = await prisma.changeLog.update({
      where: { id: changeId },
      data: {
        ...(description !== undefined ? { description: description || null } : {}),
        ...(impact !== undefined ? { impact: Array.isArray(impact) ? impact : null } : {}),
        ...(approver !== undefined ? { approver: approver || null } : {}),
      }
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update change' });
  }
});

// Delete a change
app.delete('/api/changes/:changeId', async (req, res) => {
  try {
    const changeId = Number(req.params.changeId);
    const existing = await prisma.changeLog.findUnique({ where: { id: changeId } });
    if (!existing) return res.status(404).json({ error: 'Change not found' });

    await prisma.changeLog.delete({ where: { id: changeId } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete change' });
  }
});
// ---------- document repository ----------

// List docs
app.get('/api/projects/:id/documents', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const items = await prisma.projectDocument.findMany({
      where: { projectId },
      orderBy: [{ kind: 'asc' }, { title: 'asc' }, { version: 'desc' }]
    });
    res.json(items);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch documents' }); }
});

// Create doc (new version or new title)
// - inactive by default unless explicitly activated
// - auto-increment version if not provided
app.post('/api/projects/:id/documents', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const {
      kind, title, url, version, active, tags, notes, uploadedBy,
      approvedBy, approverRole, approvedAt, approvalProof,
      verifiedBy, verifierRole, verifiedAt, verificationProof,
      affectedTeams, isStandard, sourceChangeId
    } = req.body || {};

    const k = String(kind);
    const t = String(title);

    const siblings = await prisma.projectDocument.findMany({
      where: { projectId, kind: k, title: t },
      select: { version: true, active: true }
    });
    const nextVersion = version ? Number(version)
      : (siblings.length ? Math.max(...siblings.map(s => s.version)) + 1 : 1);

    const willActivate = active === true;

    if (willActivate && siblings.length) {
      await prisma.projectDocument.updateMany({
        where: { projectId, kind: k, title: t, active: true },
        data: { active: false }
      });
    }

    const item = await prisma.projectDocument.create({
      data: {
        projectId,
        kind: k,
        title: t,
        url: String(url),
        version: nextVersion,
        active: willActivate,
        tags: Array.isArray(tags) ? tags : null,
        notes: notes || null,
        uploadedBy: uploadedBy || null,

        approvedBy: approvedBy || null,
        approverRole: approverRole || null,
        approvedAt: approvedAt ? new Date(approvedAt) : null,
        approvalProof: approvalProof || null,

        verifiedBy: verifiedBy || null,
        verifierRole: verifierRole || null,
        verifiedAt: verifiedAt ? new Date(verifiedAt) : null,
        verificationProof: verificationProof || null,

        affectedTeams: Array.isArray(affectedTeams) ? affectedTeams : null,
        isStandard: Boolean(isStandard) || false,
        sourceChangeId: sourceChangeId ? Number(sourceChangeId) : null
      }
    });

    res.json(item);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to create document' }); }
});

// Update doc metadata (does NOT auto-activate unless active:true explicitly provided)
app.put('/api/documents/:docId', async (req, res) => {
  try {
    const docId = Number(req.params.docId);
    const {
      active, notes, tags, url, title,
      approvedBy, approverRole, approvedAt, approvalProof,
      verifiedBy, verifierRole, verifiedAt, verificationProof,
      affectedTeams, isStandard, sourceChangeId
    } = req.body || {};

    const existing = await prisma.projectDocument.findUnique({ where: { id: docId } });
    if (!existing) return res.status(404).json({ error: 'Document not found' });

    if (active === true) {
      await prisma.projectDocument.updateMany({
        where: { projectId: existing.projectId, kind: existing.kind, title: title ?? existing.title, active: true },
        data: { active: false }
      });
    }

    const updated = await prisma.projectDocument.update({
      where: { id: docId },
      data: {
        ...(active !== undefined ? { active: Boolean(active) } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
        ...(url !== undefined ? { url: url || existing.url } : {}),
        ...(tags !== undefined ? { tags: Array.isArray(tags) ? tags : null } : {}),
        ...(title !== undefined ? { title: title || existing.title } : {}),

        ...(approvedBy !== undefined ? { approvedBy: approvedBy || null } : {}),
        ...(approverRole !== undefined ? { approverRole: approverRole || null } : {}),
        ...(approvedAt !== undefined ? { approvedAt: approvedAt ? new Date(approvedAt) : null } : {}),
        ...(approvalProof !== undefined ? { approvalProof: approvalProof || null } : {}),

        ...(verifiedBy !== undefined ? { verifiedBy: verifiedBy || null } : {}),
        ...(verifierRole !== undefined ? { verifierRole: verifierRole || null } : {}),
        ...(verifiedAt !== undefined ? { verifiedAt: verifiedAt ? new Date(verifiedAt) : null } : {}),
        ...(verificationProof !== undefined ? { verificationProof: verificationProof || null } : {}),

        ...(affectedTeams !== undefined ? { affectedTeams: Array.isArray(affectedTeams) ? affectedTeams : null } : {}),
        ...(isStandard !== undefined ? { isStandard: Boolean(isStandard) } : {}),
        ...(sourceChangeId !== undefined ? { sourceChangeId: sourceChangeId ? Number(sourceChangeId) : null } : {})
      }
    });

    res.json(updated);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update document' }); }
});

// Delete doc
app.delete('/api/documents/:docId', async (req, res) => {
  try {
    const docId = Number(req.params.docId);
    const existing = await prisma.projectDocument.findUnique({ where: { id: docId } });
    if (!existing) return res.status(404).json({ error: 'Document not found' });

    await prisma.projectDocument.delete({ where: { id: docId } });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to delete document' }); }
});


// ---------- variance check ----------

// List variances
app.get('/api/projects/:id/variances', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const items = await prisma.varianceItem.findMany({
      where: { projectId },
      orderBy: [{ createdAt: 'desc' }]
    });
    res.json(items);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch variances' }); }
});

// Create variance (DEVIATION)
app.post('/api/projects/:id/variances', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { category, field, expected, actual, sourceDocId, remarks } = req.body || {};

    // basic validation
    if (!category || !field || !expected || !actual) {
      return res.status(400).json({ error: 'category, field, expected, actual are required' });
    }

    // validate sourceDocId if provided
    let linkDocId = null;
    if (sourceDocId !== undefined && sourceDocId !== null && sourceDocId !== '') {
      const sId = Number(sourceDocId);
      if (Number.isNaN(sId) || sId <= 0) {
        return res.status(400).json({ error: 'sourceDocId must be a valid numeric id' });
      }
      const doc = await prisma.projectDocument.findUnique({ where: { id: sId } });
      if (!doc || doc.projectId !== projectId) {
        return res.status(400).json({ error: 'sourceDocId does not exist for this project' });
      }
      linkDocId = sId;
    }

    const item = await prisma.varianceItem.create({
      data: {
        projectId,
        category: String(category),
        field: String(field),
        expected: String(expected),
        actual: String(actual),
        sourceDocId: linkDocId,
        remarks: remarks || null,
        status: 'DEVIATION'
      }
    });

    // alert (RED by default for new deviation)
    await prisma.alert.create({
      data: {
        projectId,
        level: 'RED',
        message: `Variance logged: ${item.category} / ${item.field} — expected "${item.expected}", got "${item.actual}".`
      }
    });

    res.json(item);
  } catch (e) {
    console.error('Create variance failed:', e);
    // map Prisma FK error -> 400
    if (e?.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid sourceDocId (foreign key not found)' });
    }
    res.status(500).json({ error: 'Failed to create variance' });
  }
});


// Update variance (resolve / waiver / edit)
app.put('/api/variances/:varId', async (req, res) => {
  try {
    const varId = Number(req.params.varId);
    const { status, remarks, resolvedAt } = req.body || {};
    const existing = await prisma.varianceItem.findUnique({ where: { id: varId } });
    if (!existing) return res.status(404).json({ error: 'Variance not found' });

    const updated = await prisma.varianceItem.update({
      where: { id: varId },
      data: {
        ...(status !== undefined ? { status: String(status) } : {}),
        ...(remarks !== undefined ? { remarks: remarks || null } : {}),
        ...(resolvedAt !== undefined ? { resolvedAt: resolvedAt ? new Date(resolvedAt) : null } : {}),
        ...(status && (status === 'WAIVER' || status === 'RESOLVED') && !resolvedAt ? { resolvedAt: new Date() } : {})
      }
    });

    // alert when resolved or waived
    if (existing.status !== updated.status && (updated.status === 'WAIVER' || updated.status === 'RESOLVED')) {
      await prisma.alert.create({
        data: {
          projectId: updated.projectId,
          level: 'AMBER',
          message: `Variance ${updated.status}: ${updated.category} / ${updated.field}.`
        }
      });
    }

    res.json(updated);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update variance' }); }
});

// Delete variance
app.delete('/api/variances/:varId', async (req, res) => {
  try {
    const varId = Number(req.params.varId);
    const existing = await prisma.varianceItem.findUnique({ where: { id: varId } });
    if (!existing) return res.status(404).json({ error: 'Variance not found' });
    await prisma.varianceItem.delete({ where: { id: varId } });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to delete variance' }); }
});

// Create a new pre-production step
app.post('/api/projects/:id/preprod', async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { title, description, status, owner, dueDate, notify, impacts, documentUrl } = req.body || {};
    const step = await prisma.preProdStep.create({
      data: {
        projectId,
        title: String(title),
        description: description || null,
        status: status || 'PLANNED',
        owner: owner || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        notify: Array.isArray(notify) ? notify : null,
        impacts: Array.isArray(impacts) ? impacts : null,
        documentUrl: documentUrl || null,
      },
    });
    res.json(step);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create pre-production step' });
  }
});

// Update an existing pre-production step
app.put('/api/preprod/:stepId', async (req, res) => {
  try {
    const stepId = Number(req.params.stepId);
    const { title, description, status, owner, dueDate, completedAt, notify, impacts, documentUrl } = req.body || {};

    // Fetch existing step (for projectId and to check previous status)
    const existing = await prisma.preProdStep.findUnique({ where: { id: stepId } });
    if (!existing) return res.status(404).json({ error: 'Step not found' });

    const updated = await prisma.preProdStep.update({
      where: { id: stepId },
      data: {
        ...(title !== undefined ? { title: String(title) } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status !== undefined ? { status: String(status) } : {}),
        ...(owner !== undefined ? { owner } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(completedAt !== undefined ? { completedAt: completedAt ? new Date(completedAt) : null } : {}),
        ...(notify !== undefined ? { notify: Array.isArray(notify) ? notify : null } : {}),
        ...(impacts !== undefined ? { impacts: Array.isArray(impacts) ? impacts : null } : {}),
        ...(documentUrl !== undefined ? { documentUrl: documentUrl || null } : {}),
      },
    });

    // If status moved to DONE (and wasn't DONE before), create an alert so it's "visible in flow"
    if (existing.status !== 'DONE' && updated.status === 'DONE') {
      const impactText = Array.isArray(updated.impacts) && updated.impacts.length
        ? ` Impacts: ${updated.impacts.join(', ')}.`
        : '';
      const notifyText = Array.isArray(updated.notify) && updated.notify.length
        ? ` Notify: ${updated.notify.join(', ')}.`
        : '';

      await prisma.alert.create({
        data: {
          projectId: existing.projectId,
          level: 'AMBER', // informational; upgrade to RED/AMBER if you want urgency logic
          message: `Pre-Production step DONE: ${updated.title}.${impactText}${notifyText}`,
        },
      });
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update pre-production step' });
  }
});

// Delete a pre-production step
app.delete('/api/preprod/:stepId', async (req, res) => {
  try {
    const stepId = Number(req.params.stepId);
    await prisma.preProdStep.delete({ where: { id: stepId } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete pre-production step' });
  }
});

// ---- single listen block at the very end of api/index.js ----
const PORT = process.env.PORT || 4000;
// Prevent double-start if this file is imported somewhere
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
  });
}

module.exports = app;

