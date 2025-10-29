const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/authMiddleware');

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
        ProjectSku: { select: { id: true, skuCode: true, name: true } },
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
        ProjectSku: { select: { id: true, skuCode: true, name: true } },
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
            submissionDate: true,
            result: true,
            status: true,
            inspector: { select: { id: true, name: true } },
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

// POST /api/batches - Create new batch
router.post('/', async (req, res) => {
  try {
    const {
      projectId,
      projectSkuId,
      poNumber,
      targetQty,
      batchCode,
      materialLots,
      machineId,
    } = req.body;

    const generatedBatchCode = batchCode || `BATCH-${Date.now()}`;

    const batch = await prisma.batch.create({
      data: {
        id: `B-${Date.now()}`,
        batchCode: generatedBatchCode,
        projectId: parseInt(projectId),
        projectSkuId: parseInt(projectSkuId),
        poNumber,
        targetQty: parseInt(targetQty),
        currentQty: 0,
        rejectedQty: 0,
        status: 'in_progress',
        materialLots: materialLots || {},
        machineId,
        createdBy: req.user.id,
      },
      include: {
        Project: { select: { id: true, name: true } },
        ProjectSku: { select: { id: true, skuCode: true, name: true } },
      },
    });

    res.status(201).json(batch);
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ error: 'Failed to create batch' });
  }
});

// PUT /api/batches/:id - Update batch
router.put('/:id', async (req, res) => {
  try {
    const {
      currentQty,
      rejectedQty,
      currentStationId,
      status,
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

    if (status === 'completed' || status === 'closed') {
      updateData.completedAt = new Date();
    }

    const batch = await prisma.batch.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        Project: { select: { id: true, name: true } },
        ProjectSku: { select: { id: true, skuCode: true, name: true } },
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
