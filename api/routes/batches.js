const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authGuard } = require('../middleware/authGuard');
const router = express.Router();
const prisma = new PrismaClient();

function pad(n) { return n.toString().padStart(2, '0'); }

async function generateBatchCode({ project, poNumber, sku, shift = 'D', date = new Date() }, seq) {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${project.code || 'PRJ'}-${poNumber || 'NA'}-${sku.code}-${y}${m}${d}-${shift}-${seq}`;
}

// Create batch (auto-generate code)
router.post('/', authGuard, async (req, res) => {
  try {
    const { projectId, poNumber, projectSkuId, targetQty, shift = 'D', materialLots = {} } = req.body;
    if (!projectId || !projectSkuId || !targetQty) return res.status(400).json({ error: 'projectId, projectSkuId, targetQty required' });

    const [project, sku] = await Promise.all([
      prisma.project.findUnique({ where: { id: parseInt(projectId) } }),
      prisma.projectSku.findUnique({ where: { id: parseInt(projectSkuId) } }),
    ]);
    if (!project || !sku) return res.status(404).json({ error: 'Project or SKU not found' });

    // Determine sequence for today + shift
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const countToday = await prisma.batch.count({ where: { createdAt: { gte: today, lt: tomorrow }, projectId: parseInt(projectId) } });
    const seq = countToday + 1;
    const batchCode = await generateBatchCode({ project, poNumber, sku, shift, date: today }, seq);

    const created = await prisma.batch.create({
      data: {
        batchCode,
        projectId: parseInt(projectId),
        poNumber: poNumber || null,
        projectSkuId: parseInt(projectSkuId),
        targetQty: parseInt(targetQty),
        currentQty: 0,
        materialLots,
        status: 'in_progress',
        createdBy: req.auth?.user?.id || 'system',
      },
    });

    res.status(201).json(created);
  } catch (e) {
    console.error('batches:create', e);
    res.status(500).json({ error: 'Failed to create batch' });
  }
});

// Get batches
router.get('/', authGuard, async (req, res) => {
  try {
    const { projectId, status, currentStationId } = req.query;
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (status) where.status = String(status);
    if (currentStationId) where.currentStationId = parseInt(currentStationId);
    const batches = await prisma.batch.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(batches);
  } catch (e) {
    console.error('batches:list', e);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

// Get batch details + history
router.get('/:id', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await prisma.batch.findUnique({
      where: { id: String(id) },
      include: { movements: true },
    });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    const qcRecords = await prisma.qCSubmission.findMany({ where: { batchCode: batch.batchCode }, orderBy: { submittedAt: 'desc' } });
    res.json({ ...batch, qcRecords });
  } catch (e) {
    console.error('batches:get', e);
    res.status(500).json({ error: 'Failed to fetch batch' });
  }
});

// Record movement
router.post('/:id/move', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const { toStationId, qty, operatorId, condition, photos = [], notes } = req.body;
    if (!toStationId || !qty) return res.status(400).json({ error: 'toStationId and qty required' });
    const batch = await prisma.batch.findUnique({ where: { id: String(id) } });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const movement = await prisma.batchMovement.create({
      data: {
        batchId: batch.id,
        fromStationId: batch.currentStationId || null,
        toStationId: parseInt(toStationId),
        qty: parseInt(qty),
        operatorId: operatorId || req.auth?.user?.id || null,
        condition: condition || null,
        photos,
        notes: notes || null,
      },
    });

    const updated = await prisma.batch.update({ where: { id: batch.id }, data: { currentStationId: parseInt(toStationId) } });
    res.json({ movement, batch: updated });
  } catch (e) {
    console.error('batches:move', e);
    res.status(500).json({ error: 'Failed to record movement' });
  }
});

// Reject batch
router.put('/:id/reject', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, rejectedQty = 0 } = req.body;
    const updated = await prisma.batch.update({ where: { id: String(id) }, data: { status: 'rejected', rejectedQty: parseInt(rejectedQty), notes: reason || null } });
    res.json(updated);
  } catch (e) {
    console.error('batches:reject', e);
    res.status(500).json({ error: 'Failed to reject batch' });
  }
});

// Traceability queries
router.get('/trace/:batchCode', authGuard, async (req, res) => {
  try {
    const { batchCode } = req.params;
    const batch = await prisma.batch.findFirst({ where: { batchCode: String(batchCode) }, include: { movements: true } });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    const qcRecords = await prisma.qCSubmission.findMany({ where: { batchCode: batch.batchCode } });
    res.json({ batch, qcRecords });
  } catch (e) {
    console.error('batches:trace', e);
    res.status(500).json({ error: 'Failed to trace batch' });
  }
});

router.get('/trace-material/:lotNumber', authGuard, async (req, res) => {
  try {
    const { lotNumber } = req.params;
    const lot = await prisma.materialLot.findFirst({ where: { lotNumber: String(lotNumber) } });
    if (!lot) return res.status(404).json({ error: 'Material lot not found' });
    const batches = await prisma.batch.findMany({ where: { id: { in: lot.usedInBatches || [] } } });
    res.json({ lot, batches });
  } catch (e) {
    console.error('batches:trace-material', e);
    res.status(500).json({ error: 'Failed to trace material lot' });
  }
});

router.get('/trace-operator/:operatorId', authGuard, async (req, res) => {
  try {
    const { operatorId } = req.params;
    const movements = await prisma.batchMovement.findMany({ where: { operatorId: String(operatorId) } });
    const batchIds = [...new Set(movements.map(m => m.batchId))];
    const batches = await prisma.batch.findMany({ where: { id: { in: batchIds } } });
    res.json({ movements, batches });
  } catch (e) {
    console.error('batches:trace-operator', e);
    res.status(500).json({ error: 'Failed to trace operator' });
  }
});

// Handover sheet (printable)
router.get('/:id/handover-sheet', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await prisma.batch.findUnique({ where: { id: String(id) }, include: { movements: { orderBy: { timestamp: 'asc' } } } });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    const html = `
      <html><body>
      <h1>Batch Handover Sheet</h1>
      <p><strong>Batch:</strong> ${batch.batchCode}</p>
      <p><strong>Project ID:</strong> ${batch.projectId}</p>
      <p><strong>SKU ID:</strong> ${batch.projectSkuId}</p>
      <p><strong>Status:</strong> ${batch.status}</p>
      <h2>Movements</h2>
      <ul>
        ${batch.movements.map(m => `<li>${new Date(m.timestamp).toLocaleString()} - ${m.fromStationId || '-'} -> ${m.toStationId} - Qty ${m.qty}</li>`).join('')}
      </ul>
      </body></html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (e) {
    console.error('batches:handover-sheet', e);
    res.status(500).json({ error: 'Failed to generate handover sheet' });
  }
});

// Label (QR code)
router.get('/:id/label', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await prisma.batch.findUnique({ where: { id: String(id) } });
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    // Return basic label payload (QR generation is frontend responsibility)
    res.json({
      code: batch.batchCode,
      text: `BATCH ${batch.batchCode}`,
      qrData: `batch:${batch.batchCode}`,
    });
  } catch (e) {
    console.error('batches:label', e);
    res.status(500).json({ error: 'Failed to generate label' });
  }
});

module.exports = router;
