// Lot API endpoints for Phase 2 implementation
const express = require('express');
const router = express.Router();

// Placeholder for database models (replace with actual ORM imports)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/lots - Create new lot
router.post('/', async (req, res) => {
  try {
    const {
      projectId,
      poNumber,
      packingStationId,
      packingOperators,
      batchIds,
      cartonCount,
      palletCount,
      shippingDestination,
      customerPO
    } = req.body;

    // Validation layer 1: Required fields
    if (!projectId || !packingStationId || !Array.isArray(batchIds) || batchIds.length === 0) {
      return res.status(400).json({ 
        error: 'projectId, packingStationId, and batchIds (non-empty array) are required' 
      });
    }

    // Fetch project
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) }
    });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Fetch packing station
    const station = await prisma.station.findUnique({
      where: { id: parseInt(packingStationId) }
    });
    if (!station) {
      return res.status(404).json({ error: 'Packing station not found' });
    }

    // Fetch all batches
    const batches = await prisma.batch.findMany({
      where: {
        id: { in: batchIds },
        projectId: parseInt(projectId)
      },
      include: {
        ProjectSku: { select: { id: true, code: true, name: true } }
      }
    });

    // Validate all batches found and belong to project
    if (batches.length !== batchIds.length) {
      const foundIds = batches.map(b => b.id);
      const missingIds = batchIds.filter(id => !foundIds.includes(id));
      return res.status(404).json({ 
        error: 'Some batches not found or do not belong to project',
        missingBatchIds: missingIds
      });
    }

    // Validate batches not already in a lot
    const alreadyPacked = batches.filter(b => b.lotId !== null);
    if (alreadyPacked.length > 0) {
      return res.status(400).json({
        error: 'Some batches are already packed in lots',
        alreadyPackedBatches: alreadyPacked.map(b => ({ id: b.id, batchCode: b.batchCode, lotId: b.lotId }))
      });
    }

    // Calculate total quantity
    const totalQuantity = batches.reduce((sum, batch) => sum + batch.currentQty, 0);

    // Generate lot code
    const lotCode = `LOT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create lot record
    const lot = await prisma.lot.create({
      data: {
        lotCode,
        projectId: parseInt(projectId),
        poNumber: poNumber || null,
        packingStationId: parseInt(packingStationId),
        packingOperators: packingOperators || [],
        batchCount: batches.length,
        totalQuantity,
        cartonCount: cartonCount || 0,
        palletCount: palletCount || 0,
        shippingDestination: shippingDestination || null,
        customerPO: customerPO || null,
        status: 'packed',
        packedAt: new Date()
      },
      include: {
        Project: { select: { id: true, name: true } },
        Station: { select: { id: true, name: true, code: true } }
      }
    });

    // Update batches: set lotId and status
    await prisma.batch.updateMany({
      where: { id: { in: batchIds } },
      data: {
        lotId: lot.id,
        status: 'packed'
      }
    });

    // Fetch updated batches
    const updatedBatches = await prisma.batch.findMany({
      where: { id: { in: batchIds } },
      include: {
        ProjectSku: { select: { id: true, code: true, name: true } }
      }
    });

    res.status(201).json({
      lot,
      batches: updatedBatches
    });
  } catch (error) {
    console.error('Error creating lot:', error);
    res.status(500).json({ error: 'Failed to create lot' });
  }
});

// GET /api/lots - List lots with filters
router.get('/', async (req, res) => {
  try {
    const { projectId, poNumber, status, startDate, endDate, page = 1, limit = 50 } = req.query;

    const where = {};

    if (projectId) {
      where.projectId = parseInt(projectId);
    }
    if (poNumber) {
      where.poNumber = { contains: poNumber, mode: 'insensitive' };
    }
    if (status) {
      where.status = status;
    }
    if (startDate || endDate) {
      where.packedAt = {};
      if (startDate) where.packedAt.gte = new Date(startDate);
      if (endDate) where.packedAt.lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [lots, total] = await Promise.all([
      prisma.lot.findMany({
        where,
        include: {
          Project: { select: { id: true, name: true } },
          Station: { select: { id: true, name: true, code: true } }
        },
        orderBy: { packedAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.lot.count({ where })
    ]);

    res.json({
      lots,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching lots:', error);
    res.status(500).json({ error: 'Failed to fetch lots' });
  }
});

// GET /api/lots/:id - Get lot details (stub)
router.get('/:id', async (req, res) => {
  try {
    const lotId = parseInt(req.params.id);

    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: {
        Project: { select: { id: true, name: true } },
        Station: { select: { id: true, name: true, code: true } },
        batches: {
          include: {
            ProjectSku: { select: { id: true, code: true, name: true } },
            Station: { select: { id: true, name: true, code: true } }
          }
        }
      }
    });

    if (!lot) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    res.json(lot);
  } catch (error) {
    console.error('Error fetching lot:', error);
    res.status(500).json({ error: 'Failed to fetch lot' });
  }
});

// POST /api/lots/:id/add-batch - Add batch to lot (stub)
router.post('/:id/add-batch', async (req, res) => {
  // Implement add batch to lot logic as per spec
  res.json({ success: true, message: 'Add batch to lot endpoint stub' });
});

// PUT /api/lots/:id/ship - Ship lot
router.put('/:id/ship', async (req, res) => {
  try {
    const lotId = parseInt(req.params.id);
    const { shippedDate, trackingNumber, carrier } = req.body;

    // Fetch lot
    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: { batches: { select: { id: true } } }
    });

    if (!lot) {
      return res.status(404).json({ error: 'Lot not found' });
    }

    if (lot.status === 'shipped') {
      return res.status(400).json({ error: 'Lot already shipped' });
    }

    // Update lot status
    const updatedLot = await prisma.lot.update({
      where: { id: lotId },
      data: {
        status: 'shipped',
        shippedAt: shippedDate ? new Date(shippedDate) : new Date(),
        trackingNumber: trackingNumber || null,
        carrier: carrier || null
      },
      include: {
        Project: { select: { id: true, name: true } },
        Station: { select: { id: true, name: true, code: true } }
      }
    });

    // Update all batches in lot to shipped status
    await prisma.batch.updateMany({
      where: { lotId: lotId },
      data: { status: 'shipped' }
    });

    // Fetch updated batches
    const updatedBatches = await prisma.batch.findMany({
      where: { lotId: lotId },
      include: {
        ProjectSku: { select: { id: true, code: true, name: true } }
      }
    });

    res.json({
      lot: updatedLot,
      batches: updatedBatches
    });
  } catch (error) {
    console.error('Error shipping lot:', error);
    res.status(500).json({ error: 'Failed to ship lot' });
  }
});

// GET /api/lots/:id/packing-list - Packing list PDF (stub)
router.get('/:id/packing-list', async (req, res) => {
  // Implement packing list PDF generation as per spec
  res.json({ success: true, message: 'Packing list endpoint stub' });
});

module.exports = router;
