const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// GET /api/batches - List all batches
router.get('/', async (req, res) => {
  try {
    const { projectId, status, search } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { batchCode: { contains: search, mode: 'insensitive' } },
        { poNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const batches = await prisma.batch.findMany({
      where,
      include: {
        Project: { select: { id: true, name: true } },
        ProjectSku: { select: { id: true, code: true, name: true } },
        Station: { select: { id: true, name: true, code: true } },
        _count: {
          select: {
            BatchMovement: true,
            QCSubmission: true,
            wipLedgers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(batches);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

// GET /api/batches/:id - Get single batch with full genealogy
router.get('/:id', async (req, res) => {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: req.params.id },
      include: {
        Project: { select: { id: true, name: true } },
        ProjectSku: { select: { id: true, code: true, name: true } },
        Station: { select: { id: true, name: true, code: true } },
        BatchMovement: {
          include: {
            Station_BatchMovement_fromStationIdToStation: { select: { id: true, name: true } },
            Station_BatchMovement_toStationIdToStation: { select: { id: true, name: true } },
          },
          orderBy: { timestamp: 'asc' },
        },
        QCSubmission: {
          select: {
            id: true,
            submittedAt: true,
            overallPass: true,
          },
          orderBy: { submittedAt: 'desc' },
        },
        wipLedgers: {
          select: {
            id: true,
            transactionDate: true,
            transactionType: true,
            quantity: true,
            balanceQuantity: true,
          },
          orderBy: { transactionDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    res.json(batch);
  } catch (error) {
    console.error('Error fetching batch:', error);
    res.status(500).json({ error: 'Failed to fetch batch' });
  }
});

// POST /api/batches - Create new batch (Phase 2 spec)
const batchUtils = require('../lib/batchUtils');
router.post('/', async (req, res) => {
  try {
    const {
      projectId,
      projectSkuId,
      stationId,
      quantity,
      operatorId,
      materialLots,
      totalWeight,
      containerWeight,
      unitWeight,
      quantityMethod,
      subSkuIdentifier
    } = req.body;

    // Generate batch code using utility
    // For demo, sequenceNumber is timestamp, replace with daily sequence logic
    const sequenceNumber = Date.now() % 1000;
    const projectCode = projectId ? String(projectId) : 'PRJ';
    const skuCode = projectSkuId ? String(projectSkuId) : 'SKU';
    const batchCode = batchUtils.generateBatchCode(projectCode, skuCode, sequenceNumber);

    // Calculate quantity if weight provided
    let calculatedQty = quantity;
    if (quantityMethod === 'weighed' && totalWeight && containerWeight && unitWeight) {
      calculatedQty = batchUtils.calculateQuantityFromWeight(totalWeight, containerWeight, unitWeight).calculatedQty;
    }

    // Create batch record
    const batch = await prisma.batch.create({
      data: {
        id: `B-${Date.now()}`,
        batchCode,
        projectId: Number(projectId),
        projectSkuId: Number(projectSkuId),
        currentStationId: Number(stationId),
        targetQty: Number(quantity),
        currentQty: 0,
        rejectedQty: 0,
        totalWeight: totalWeight || null,
        containerWeight: containerWeight || null,
        calculatedQty: calculatedQty || null,
        quantityMethod: quantityMethod || 'count',
        materialLots: materialLots || {},
        subBatchIdentifier: subSkuIdentifier || null,
        status: 'in_progress',
        createdBy: operatorId || req.user?.id || 'system',
      },
    });

    // Create initial BatchMovement record
    await prisma.batchMovement.create({
      data: {
        id: `BM-${Date.now()}`,
        batchId: batch.id,
        fromStationId: null,
        toStationId: Number(stationId),
        qty: Number(quantity),
        operatorId: operatorId || req.user?.id || 'system',
        timestamp: new Date(),
        condition: 'good',
        photos: [],
      },
    });

    // Generate handover sheet URL
    const handoverSheetUrl = batchUtils.generateHandoverSheet(batch, stationId);

    res.status(201).json({
      success: true,
      batch: {
        id: batch.id,
        batchCode,
        projectId,
        quantity,
        calculatedQty,
        quantityMethod,
        currentStationId: stationId,
        status: 'in_progress',
        handoverSheetUrl
      }
    });
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ error: 'Failed to create batch', details: error.message });
  }
});

// POST /api/batches/:id/move - Record batch movement (Phase 2 spec)
router.post('/:id/move', async (req, res) => {
  try {
    const { toStationId, operatorId, quantity, condition, notes, photos, isPartialMove, remainingQuantity } = req.body;
    const batchId = req.params.id;

    // Get current station for fromStationId
    const currentBatch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { currentStationId: true }
    });

    // Create movement record
    const movement = await prisma.batchMovement.create({
      data: {
        id: `BM-${Date.now()}`,
        batchId,
        fromStationId: currentBatch?.currentStationId || null,
        toStationId: Number(toStationId),
        qty: Number(quantity),
        operatorId: operatorId || req.user?.id || 'system',
        condition,
        notes,
        photos: photos || [],
        timestamp: new Date(),
      },
    });

    // Update batch current station
    await prisma.batch.update({
      where: { id: batchId },
      data: { currentStationId: Number(toStationId) },
    });

    // If partial move, create sub-batch (stub)
    let subBatch = null;
    if (isPartialMove && remainingQuantity) {
      // Implement sub-batch creation logic here
      subBatch = { id: 'sub-batch-stub', quantity: remainingQuantity };
    }

    res.json({
      success: true,
      movement,
      batch: { id: batchId, currentStationId: toStationId, status: 'in_production' },
      subBatch
    });
  } catch (error) {
    console.error('Error recording batch movement:', error);
    res.status(500).json({ error: 'Failed to record batch movement' });
  }
});

// POST /api/batches/:id/split - Sub-batch creation (stub)
router.post('/:id/split', async (req, res) => {
  // Implement sub-batch creation logic as per spec
  res.json({ success: true, message: 'Sub-batch creation endpoint stub' });
});

// POST /api/batches/:id/reject - Rejection endpoint (stub)
router.post('/:id/reject', async (req, res) => {
  // Implement rejection logic as per spec
  res.json({ success: true, message: 'Rejection endpoint stub' });
});

// POST /api/batches/:id/rework-complete - Rework complete endpoint (stub)
router.post('/:id/rework-complete', async (req, res) => {
  // Implement rework complete logic as per spec
  res.json({ success: true, message: 'Rework complete endpoint stub' });
});

// POST /api/batches/assemble - Assembly endpoint (stub)
router.post('/assemble', async (req, res) => {
  // Implement assembly logic as per spec
  res.json({ success: true, message: 'Assembly endpoint stub' });
});

// GET /api/batches/:id/trace-forward - Traceability endpoint (stub)
router.get('/:id/trace-forward', async (req, res) => {
  // Implement trace-forward logic as per spec
  res.json({ success: true, message: 'Trace-forward endpoint stub' });
});

// GET /api/batches/:id/trace-backward - Traceability endpoint (stub)
router.get('/:id/trace-backward', async (req, res) => {
  // Implement trace-backward logic as per spec
  res.json({ success: true, message: 'Trace-backward endpoint stub' });
});

// GET /api/batches/material-recall - Material recall endpoint (stub)
router.get('/material-recall', async (req, res) => {
  // Implement material recall logic as per spec
  res.json({ success: true, message: 'Material recall endpoint stub' });
});

// GET /api/batches/operator-tracking - Operator tracking endpoint (stub)
router.get('/operator-tracking', async (req, res) => {
  // Implement operator tracking logic as per spec
  res.json({ success: true, message: 'Operator tracking endpoint stub' });
});

// GET /api/batches/:id/handover-sheet - Printable handover sheet (stub)
router.get('/:id/handover-sheet', async (req, res) => {
  // Implement handover sheet generation as per spec
  res.json({ success: true, message: 'Handover sheet endpoint stub' });
});

// GET /api/batches/:id/qr-code - QR code generation (stub)
router.get('/:id/qr-code', async (req, res) => {
  // Implement QR code generation as per spec
  res.json({ success: true, message: 'QR code endpoint stub' });
});

// PUT /api/batches/:id - Update batch
router.put('/:id', async (req, res) => {
  try {
    const {
      currentQty,
      rejectedQty,
      currentStationId,
      status,
      completedQuantity,
      machineId,
      materialLots,
    } = req.body;

    const updateData = {};
    if (currentQty !== undefined) updateData.currentQty = parseInt(currentQty);
    if (rejectedQty !== undefined) updateData.rejectedQty = parseInt(rejectedQty);
    if (currentStationId !== undefined) updateData.currentStationId = currentStationId ? parseInt(currentStationId) : null;
    if (status !== undefined) updateData.status = status;
    if (machineId !== undefined) updateData.machineId = machineId;
    if (materialLots !== undefined) updateData.materialLots = materialLots;
    if (completedQuantity !== undefined) updateData.currentQty = parseInt(completedQuantity);

    if (status === 'completed' || status === 'closed') {
      updateData.completedAt = new Date();
    }

    const batch = await prisma.batch.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        Project: { select: { id: true, name: true } },
        ProjectSku: { select: { id: true, code: true, name: true } },
        Station: { select: { id: true, name: true } },
      },
    });

    res.json(batch);
  } catch (error) {
    console.error('Error updating batch:', error);
    res.status(500).json({ error: 'Failed to update batch' });
  }
});

// POST /api/batches/:id/move - Record batch movement
router.post('/:id/move', async (req, res) => {
  try {
    const { fromStationId, toStationId, qty, condition, notes, photos } = req.body;
    const batchId = req.params.id;

    const movement = await prisma.batchMovement.create({
      data: {
        id: `BM-${Date.now()}`,
        batchId,
        fromStationId: fromStationId ? parseInt(fromStationId) : null,
        toStationId: parseInt(toStationId),
        qty: parseInt(qty),
        operatorId: req.user.id,
        condition,
        notes,
        photos: photos || [],
      },
      include: {
        Station_BatchMovement_fromStationIdToStation: { select: { id: true, name: true } },
        Station_BatchMovement_toStationIdToStation: { select: { id: true, name: true } },
      },
    });

    // Update batch current station
    await prisma.batch.update({
      where: { id: batchId },
      data: { currentStationId: parseInt(toStationId) },
    });

    res.status(201).json(movement);
  } catch (error) {
    console.error('Error recording batch movement:', error);
    res.status(500).json({ error: 'Failed to record batch movement' });
  }
});

// DELETE /api/batches/:id - Delete batch
router.delete('/:id', async (req, res) => {
  try {
    await prisma.batch.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    console.error('Error deleting batch:', error);
    res.status(500).json({ error: 'Failed to delete batch' });
  }
});

// GET /api/batches/analytics/summary - Batch analytics
router.get('/analytics/summary', async (req, res) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;

    const [totalBatches, byStatus, productionStats] = await Promise.all([
      prisma.batch.count({ where }),
      prisma.batch.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      prisma.batch.aggregate({
        where,
        _sum: {
          targetQty: true,
          currentQty: true,
          rejectedQty: true,
        },
        _avg: {
          currentQty: true,
        },
      }),
    ]);

    const statusCounts = byStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {});

    const totalTarget = productionStats._sum.targetQty || 0;
    const totalProduced = productionStats._sum.currentQty || 0;
    const totalRejected = productionStats._sum.rejectedQty || 0;
    const completionRate = totalTarget > 0 ? (totalProduced / totalTarget) * 100 : 0;

    res.json({
      totalBatches,
      byStatus: statusCounts,
      totalTarget,
      totalProduced,
      totalRejected,
      completionRate,
      avgProduced: productionStats._avg.currentQty || 0,
    });
  } catch (error) {
    console.error('Error fetching batch analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
