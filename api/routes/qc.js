// api/routes/qc.js
const express = require('express');
const router = express.Router();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authGuard = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');
const { getPresignedPutUrl } = require('../lib/storage');

function severityToLevel(sev) {
  switch (sev) {
    case 'CRITICAL': return 'RED';
    case 'MAJOR': return 'AMBER';
    case 'MINOR': return 'AMBER';
    default: return 'INFO';
  }
}

// ---- Templates ----
router.get('/qc/templates', authGuard, permissionGuard('QC_VIEW'), async (req, res) => {
  try {
    const where = {};
    if (req.query.projectId) where.projectId = Number(req.query.projectId);
    if (req.query.stationId) where.stationId = Number(req.query.stationId);
    if (req.query.projectSkuId) where.projectSkuId = Number(req.query.projectSkuId);
    const list = await prisma.qCChecklistTemplate.findMany({ where, include: { items: true }, orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }] });
    res.json(list);
  } catch (e) {
    console.error('qc:templates:list', e);
    res.status(500).json({ error: 'Failed to load templates' });
  }
});

router.post('/qc/templates', authGuard, permissionGuard('QC_EDIT'), async (req, res) => {
  try {
    const { name, projectId, stationId, projectSkuId, notes, items } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const tpl = await prisma.qCChecklistTemplate.create({
      data: {
        name: String(name),
        projectId: projectId ? Number(projectId) : null,
        stationId: stationId ? Number(stationId) : null,
        projectSkuId: projectSkuId ? Number(projectSkuId) : null,
        notes: notes ? String(notes) : null,
        items: items && Array.isArray(items) ? {
          create: items.map((i, idx) => ({
            code: String(i.code || `ITEM_${idx + 1}`),
            label: String(i.label || `Item ${idx + 1}`),
            type: String(i.type || 'boolean'),
            required: !!i.required,
            unit: i.unit || null,
            min: i.min ?? null,
            max: i.max ?? null,
            tolerance: i.tolerance ?? null,
            options: Array.isArray(i.options) ? i.options.map(String) : [],
            severity: String(i.severity || 'MINOR'),
            photoRequired: !!i.photoRequired,
            order: i.order ?? idx,
            condition: i.condition ?? null,
            alertKey: i.alertKey || null,
            helpText: i.helpText || null,
          }))
        } : undefined
      },
      include: { items: true }
    });
    res.json(tpl);
  } catch (e) {
    console.error('qc:templates:create', e);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

router.put('/qc/templates/:id', authGuard, permissionGuard('QC_EDIT'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, active, notes } = req.body || {};
    const tpl = await prisma.qCChecklistTemplate.update({ where: { id }, data: {
      ...(name !== undefined ? { name: String(name) } : {}),
      ...(active !== undefined ? { active: !!active } : {}),
      ...(notes !== undefined ? { notes: notes ? String(notes) : null } : {}),
    }, include: { items: true } });
    res.json(tpl);
  } catch (e) {
    console.error('qc:templates:update', e);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

router.delete('/qc/templates/:id', authGuard, permissionGuard('QC_EDIT'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.qCChecklistTemplate.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('qc:templates:delete', e);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Items
router.post('/qc/templates/:id/items', authGuard, permissionGuard('QC_EDIT'), async (req, res) => {
  try {
    const { id } = req.params;
    const i = req.body || {};
    const item = await prisma.qCItemTemplate.create({ data: {
      templateId: id,
      code: String(i.code || `ITEM_${Date.now()}`),
      label: String(i.label || 'Item'),
      type: String(i.type || 'boolean'),
      required: !!i.required,
      unit: i.unit || null,
      min: i.min ?? null,
      max: i.max ?? null,
      tolerance: i.tolerance ?? null,
      options: Array.isArray(i.options) ? i.options.map(String) : [],
      severity: String(i.severity || 'MINOR'),
      photoRequired: !!i.photoRequired,
      order: i.order ?? 0,
      condition: i.condition ?? null,
      alertKey: i.alertKey || null,
      helpText: i.helpText || null,
    }});
    res.json(item);
  } catch (e) {
    console.error('qc:items:create', e);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

router.patch('/qc/items/:id', authGuard, permissionGuard('QC_EDIT'), async (req, res) => {
  try {
    const { id } = req.params;
    const i = req.body || {};
    const item = await prisma.qCItemTemplate.update({ where: { id }, data: {
      ...(i.code !== undefined ? { code: String(i.code) } : {}),
      ...(i.label !== undefined ? { label: String(i.label) } : {}),
      ...(i.type !== undefined ? { type: String(i.type) } : {}),
      ...(i.required !== undefined ? { required: !!i.required } : {}),
      ...(i.unit !== undefined ? { unit: i.unit || null } : {}),
      ...(i.min !== undefined ? { min: i.min ?? null } : {}),
      ...(i.max !== undefined ? { max: i.max ?? null } : {}),
      ...(i.tolerance !== undefined ? { tolerance: i.tolerance ?? null } : {}),
      ...(i.options !== undefined ? { options: Array.isArray(i.options) ? i.options.map(String) : [] } : {}),
      ...(i.severity !== undefined ? { severity: String(i.severity) } : {}),
      ...(i.photoRequired !== undefined ? { photoRequired: !!i.photoRequired } : {}),
      ...(i.order !== undefined ? { order: Number(i.order || 0) } : {}),
      ...(i.condition !== undefined ? { condition: i.condition ?? null } : {}),
      ...(i.alertKey !== undefined ? { alertKey: i.alertKey || null } : {}),
      ...(i.helpText !== undefined ? { helpText: i.helpText || null } : {}),
    }});
    res.json(item);
  } catch (e) {
    console.error('qc:items:update', e);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

router.delete('/qc/items/:id', authGuard, permissionGuard('QC_EDIT'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.qCItemTemplate.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('qc:items:delete', e);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Photo presign for QC (reuses S3/MinIO storage)
router.post('/qc/presign', authGuard, permissionGuard('QC_CREATE'), async (req, res) => {
  try {
    const { projectId, filename, contentType, sizeBytes } = req.body || {};
    if (!projectId || !filename) return res.status(400).json({ error: 'projectId and filename required' });
    const { url, key } = await getPresignedPutUrl({ projectId: Number(projectId), filename, contentType, sizeBytes });
    res.json({ putUrl: url, key });
  } catch (e) {
    console.error('qc:presign', e);
    res.status(500).json({ error: 'Failed to presign photo upload' });
  }
});

// ---- Submissions ----
router.post('/qc/submissions', authGuard, permissionGuard('QC_CREATE'), async (req, res) => {
  try {
    const { templateId, projectId, stationId, projectSkuId, batchCode, shift, operatorId, notes, photos = [], items = [], submittedBy } = req.body || {};
    if (!templateId || !projectId || !stationId) return res.status(400).json({ error: 'templateId, projectId, stationId required' });

    // Load template and validate
    const tpl = await prisma.qCChecklistTemplate.findUnique({ where: { id: String(templateId) }, include: { items: true } });
    if (!tpl) return res.status(404).json({ error: 'Template not found' });

    // Build a map for validation rules
    const rules = new Map(tpl.items.map(i => [i.code, i]));
    let overallPass = true;

    const resultCreates = [];
    for (const r of Array.isArray(items) ? items : []) {
      const code = String(r.code);
      const t = rules.get(code);
      if (!t) continue; // skip unknown codes

      // Derive pass/fail based on type and constraints
      let pass = true;
      let record = { code, type: t.type, valueString: null, valueNumber: null, valueBool: null, valueEnum: null, valueJson: null, photoKeys: Array.isArray(r.photoKeys) ? r.photoKeys.map(String) : [] };
      switch (t.type) {
        case 'boolean':
          record.valueBool = !!r.valueBool;
          pass = r.valueBool === true; // boolean items pass when true unless required false? keep simple
          break;
        case 'number':
          record.valueNumber = r.valueNumber != null ? Number(r.valueNumber) : null;
          if (record.valueNumber == null) pass = !t.required;
          else {
            const min = t.min ?? (t.tolerance != null && t.max != null ? t.max - t.tolerance : undefined);
            const max = t.max ?? (t.tolerance != null && t.min != null ? t.min + t.tolerance : undefined);
            if (min != null && record.valueNumber < min) pass = false;
            if (max != null && record.valueNumber > max) pass = false;
          }
          break;
        case 'enum':
          record.valueEnum = r.valueEnum ? String(r.valueEnum) : null;
          pass = record.valueEnum != null && t.options.includes(record.valueEnum);
          if (!record.valueEnum && !t.required) pass = true;
          break;
        case 'text':
          record.valueString = r.valueString != null ? String(r.valueString) : null;
          pass = !!record.valueString || !t.required;
          break;
        case 'photo':
          pass = (record.photoKeys || []).length > 0 || !t.required;
          break;
        case 'color':
          record.valueString = r.valueString != null ? String(r.valueString) : null; // store color code
          pass = !!record.valueString || !t.required;
          break;
        default:
          record.valueJson = r.valueJson ?? null;
          pass = !t.required || !!record.valueJson;
      }

      if (!pass) overallPass = false;
      resultCreates.push({ ...record, pass, itemTemplateId: t.id });
    }

    const sub = await prisma.qCSubmission.create({
      data: {
        templateId: String(templateId),
        projectId: Number(projectId),
        stationId: Number(stationId),
        projectSkuId: projectSkuId ? Number(projectSkuId) : null,
        batchCode: batchCode ? String(batchCode) : null,
        shift: shift ? String(shift) : null,
        operatorId: operatorId ? String(operatorId) : null,
        notes: notes ? String(notes) : null,
        overallPass,
        photos: photos.map(String),
        submittedBy: submittedBy ? String(submittedBy) : null,
        items: { create: resultCreates },
      },
      include: { items: true }
    });

    // Alerts for failed items with severity
    const failed = resultCreates.filter(r => r.pass === false);
    if (failed.length) {
      for (const r of failed) {
        const t = tpl.items.find(i => i.id === r.itemTemplateId);
        const level = severityToLevel(t?.severity || 'MINOR');
        await prisma.alert.create({
          data: {
            projectId: sub.projectId,
            level,
            message: `QC failed: ${t?.label || r.code} at station ${sub.stationId}${sub.batchCode ? ' (batch ' + sub.batchCode + ')' : ''}`,
            status: 'OPEN',
          }
        }).catch(() => {});
      }
    }

    res.status(201).json(sub);
  } catch (e) {
    console.error('qc:submissions:create', e);
    res.status(500).json({ error: 'Failed to submit QC checklist' });
  }
});

router.get('/qc/submissions', authGuard, permissionGuard('QC_VIEW'), async (req, res) => {
  try {
    const where = {};
    if (req.query.projectId) where.projectId = Number(req.query.projectId);
    if (req.query.stationId) where.stationId = Number(req.query.stationId);
    if (req.query.from || req.query.to) where.submittedAt = {
      ...(req.query.from ? { gte: new Date(String(req.query.from)) } : {}),
      ...(req.query.to ? { lte: new Date(String(req.query.to)) } : {}),
    };
    const list = await prisma.qCSubmission.findMany({ where, orderBy: { submittedAt: 'desc' }, include: { items: true, template: true } });
    res.json(list);
  } catch (e) {
    console.error('qc:submissions:list', e);
    res.status(500).json({ error: 'Failed to load submissions' });
  }
});

router.get('/qc/submissions/:id', authGuard, permissionGuard('QC_VIEW'), async (req, res) => {
  try {
    const { id } = req.params;
    const sub = await prisma.qCSubmission.findUnique({ where: { id }, include: { items: true, template: { include: { items: true } } } });
    if (!sub) return res.status(404).json({ error: 'Not found' });
    res.json(sub);
  } catch (e) {
    console.error('qc:submissions:get', e);
    res.status(500).json({ error: 'Failed to load submission' });
  }
});

module.exports = { qcRouter: router };
