// api/routes/docIntelligence.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authGuard = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');
const { documentIntelligence } = require('../lib/documentIntelligence');
const { getPresignedGetUrl } = require('../lib/storage');

const prisma = new PrismaClient();
const router = express.Router();

router.use(authGuard);

// Feature flag: disable Document Intelligence endpoints unless explicitly enabled
const DI_ENABLED = process.env.DOC_INTELLIGENCE_ENABLED === 'true';
router.use((req, res, next) => {
  if (!DI_ENABLED) {
    return res.status(200).json({ disabled: true });
  }
  next();
});

// POST /api/doc-intelligence/extract
// Body: { entity, entityId, filename, mimeType, sizeBytes, storageKey?, filePath?, fileBase64? }
router.post('/doc-intelligence/extract', permissionGuard('DOC_UPLOAD'), async (req, res) => {
  try {
    const { entity = 'ProjectDocument', entityId = null, filename, mimeType, sizeBytes, storageKey = null, filePath = null, fileBase64 = null, meta = null } = req.body || {};
    if (!filename || (!storageKey && !filePath && !fileBase64)) {
      return res.status(400).json({ error: 'filename and (storageKey or filePath or fileBase64) are required' });
    }

    // Create job
    const job = await documentIntelligence.createJob({
      entity,
      entityId,
      filename,
      mimeType,
      sizeBytes: Number(sizeBytes || 0),
      sourceType: 'upload',
      sourceId: null,
      fileKey: storageKey,
      filePath,
      meta,
    });

    // Immediate processing: download/read buffer and process now
    if (job.processingMode === 'immediate') {
      let buffer;
      if (storageKey) {
        const { url } = await getPresignedGetUrl({ key: storageKey });
        const resp = await fetch(url);
        buffer = Buffer.from(await resp.arrayBuffer());
      } else if (filePath) {
        buffer = require('fs').readFileSync(filePath);
      } else if (fileBase64) {
        buffer = Buffer.from(String(fileBase64), 'base64');
      } else {
        return res.status(400).json({ error: 'No storageKey or filePath provided' });
      }

      const result = await documentIntelligence.processJob(job.id, buffer);
      return res.json({ job, result });
    }

    // For queued/background, return job info
    res.json({ job, result: { status: job.status } });
  } catch (error) {
    console.error('[doc-intelligence:extract]', error);
    res.status(500).json({ error: 'Extraction failed' });
  }
});

// GET /api/doc-intelligence/jobs
router.get('/doc-intelligence/jobs', permissionGuard.role('Super Admin'), async (req, res) => {
  try {
    const items = await prisma.documentExtractionJob.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list jobs' });
  }
});

// GET /api/doc-intelligence/jobs/:id
router.get('/doc-intelligence/jobs/:id', permissionGuard('DOC_VIEW'), async (req, res) => {
  try {
    const job = await prisma.documentExtractionJob.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: 'Not found' });
    const fields = await prisma.documentExtractionField.findMany({ where: { jobId: job.id }, orderBy: { confidence: 'desc' } });
    res.json({ job, fields });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get job' });
  }
});

// GET /api/doc-intelligence/jobs/:id/source-url
router.get('/doc-intelligence/jobs/:id/source-url', permissionGuard('DOC_VIEW'), async (req, res) => {
  try {
    const job = await prisma.documentExtractionJob.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: 'Not found' });
    if (!job.fileKey) return res.status(400).json({ error: 'No fileKey' });
    const { url } = await getPresignedGetUrl({ key: job.fileKey });
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get source URL' });
  }
});

// POST /api/doc-intelligence/jobs/:id/retry
// Requeue or immediately reprocess a job
router.post('/doc-intelligence/jobs/:id/retry', permissionGuard.role('Super Admin'), async (req, res) => {
  try {
    const id = req.params.id;
    const job = await prisma.documentExtractionJob.findUnique({ where: { id } });
    if (!job) return res.status(404).json({ error: 'Not found' });

    // Reset status
    await prisma.documentExtractionJob.update({ where: { id }, data: { status: 'queued', error: null, startedAt: new Date(), completedAt: null } });

    // If immediate and we have the fileKey, process synchronously
    if (job.processingMode === 'immediate' && job.fileKey) {
      const { url } = await getPresignedGetUrl({ key: job.fileKey });
      const resp = await fetch(url);
      const buffer = Buffer.from(await resp.arrayBuffer());
      const result = await documentIntelligence.processJob(job.id, buffer);
      return res.json({ ok: true, jobId: job.id, result });
    }

    // Otherwise, the background worker will pick it up
    res.json({ ok: true, jobId: job.id, status: 'queued' });
  } catch (error) {
    console.error('[doc-intelligence:retry] error', error);
    res.status(500).json({ error: 'Retry failed' });
  }
});

module.exports = { docIntelligenceRouter: router };

// POST /api/doc-intelligence/jobs/:id/approve
// Body: { approvedFields: Array<{name,value}>, apply?: boolean }
router.post('/doc-intelligence/jobs/:id/approve', permissionGuard('DOC_VERIFY'), async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedFields = [], apply = true } = req.body || {};
    const job = await prisma.documentExtractionJob.findUnique({ where: { id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const approval = await prisma.documentExtractionApproval.create({
      data: {
        jobId: id,
        approvedFields,
        approvedBy: req.auth?.user?.id || null,
        applied: false,
      }
    });

    let appliedPatch = null;
    if (apply) {
      // Minimal apply for ProjectDocument: store as tags/notes for traceability
      if (job.entity === 'ProjectDocument' && job.entityId) {
        try {
          const docId = Number(job.entityId);
          const doc = await prisma.projectDocument.findUnique({ where: { id: docId } });
          if (doc) {
            const noteLines = (approvedFields || []).map(f => `${f.name}: ${f.value}`);
            const newNotes = [doc.notes || '', `Extracted (${new Date().toISOString()}):`, ...noteLines].filter(Boolean).join('\n');
            appliedPatch = await prisma.projectDocument.update({
              where: { id: docId },
              data: {
                notes: newNotes,
                tags: Array.isArray(doc.tags) ? Array.from(new Set([...(doc.tags || []), ...approvedFields.map(f => f.name)])) : approvedFields.map(f => f.name)
              }
            });
            await prisma.documentExtractionApproval.update({ where: { id: approval.id }, data: { applied: true, appliedAt: new Date() } });
          }
        } catch (e) {
          console.warn('[doc-intelligence:apply] failed:', e?.message);
        }
      } else if (job.entity === 'PurchaseOrder') {
        try {
          const meta = job.meta || {};
          const projectId = Number(meta.projectId || 0);
          const poNumber = (meta.poNumber || job.entityId || '').toString();
          if (Number.isFinite(projectId) && poNumber) {
            const existing = await prisma.purchaseOrder.findFirst({ where: { projectId, poNumber } });
            if (existing) {
              appliedPatch = await prisma.purchaseOrder.update({ where: { id: existing.id }, data: { fileKey: job.fileKey || existing.fileKey } });
            } else {
              appliedPatch = await prisma.purchaseOrder.create({ data: { projectId, poNumber, fileKey: job.fileKey || '' } });
            }
            await prisma.documentExtractionApproval.update({ where: { id: approval.id }, data: { applied: true, appliedAt: new Date() } });
          }
        } catch (e) {
          console.warn('[doc-intelligence:apply:po] failed:', e?.message);
        }
      }
    }

    res.json({ ok: true, approvalId: approval.id, applied: !!appliedPatch });
  } catch (error) {
    console.error('[doc-intelligence:approve] error', error);
    res.status(500).json({ error: 'Approval failed' });
  }
});
