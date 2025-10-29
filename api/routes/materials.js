const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(requireAuth);

// GET /api/materials - List all materials with filters
router.get('/', async (req, res) => {
  try {
    const { type, status, lowStock } = req.query;
    
    const where = {};
    if (type) where.type = type;
    
    // Filter by low stock
    if (lowStock === 'true') {
      where.stockQty = { lte: prisma.material.fields.minStock };
    }
    
    const materials = await prisma.material.findMany({
      where,
      include: {
        lots: {
          where: { status: 'active' },
          orderBy: { receivedDate: 'desc' },
          take: 5
        },
        _count: {
          select: {
            consumptions: true,
            reservations: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    // Calculate derived fields
    const enrichedMaterials = materials.map(m => ({
      ...m,
      availableQty: m.stockQty - (m.reservedQty || 0),
      isLowStock: m.minStock ? m.stockQty <= m.minStock : false,
      needsReorder: m.reorderPoint ? m.stockQty <= m.reorderPoint : false
    }));
    
    res.json({ materials: enrichedMaterials });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// GET /api/materials/:id - Get single material
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const material = await prisma.material.findUnique({
      where: { id },
      include: {
        lots: {
          orderBy: { receivedDate: 'desc' }
        },
        consumptions: {
          orderBy: { consumedAt: 'desc' },
          take: 20,
          include: {
            Project: {
              select: { projectCode: true, projectName: true }
            }
          }
        },
        reservations: {
          where: { status: 'active' },
          include: {
            DailyPlan: {
              select: { id: true, date: true }
            }
          }
        },
        movements: {
          orderBy: { timestamp: 'desc' },
          take: 50
        }
      }
    });
    
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    res.json({
      material: {
        ...material,
        availableQty: material.stockQty - (material.reservedQty || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({ error: 'Failed to fetch material' });
  }
});

// POST /api/materials - Create new material
router.post('/', async (req, res) => {
  try {
    const {
      name,
      type,
      unit,
      costPerUnit,
      stockQty,
      minStock,
      reorderPoint,
      leadTimeDays,
      expiryTracking,
      supplier
    } = req.body;
    
    if (!name || !type || !unit) {
      return res.status(400).json({ error: 'Name, type, and unit are required' });
    }
    
    const material = await prisma.material.create({
      data: {
        name,
        type,
        unit,
        costPerUnit: costPerUnit || null,
        stockQty: stockQty || 0,
        reservedQty: 0,
        minStock: minStock || null,
        reorderPoint: reorderPoint || null,
        leadTimeDays: leadTimeDays || null,
        expiryTracking: expiryTracking || false,
        supplier: supplier || null
      }
    });
    
    res.status(201).json({ material });
  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({ error: 'Failed to create material' });
  }
});

// PUT /api/materials/:id - Update material
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {};
    
    const fields = ['name', 'type', 'unit', 'costPerUnit', 'minStock', 
                    'reorderPoint', 'leadTimeDays', 'expiryTracking', 'supplier'];
    
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    const material = await prisma.material.update({
      where: { id },
      data: updateData
    });
    
    res.json({ material });
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({ error: 'Failed to update material' });
  }
});

// DELETE /api/materials/:id - Delete material
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.material.delete({
      where: { id }
    });
    
    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

// POST /api/materials/:id/receive - Receive material shipment
router.post('/:id/receive', async (req, res) => {
  try {
    const { id } = req.params;
    const { qty, lotNumber, supplier, expiryDate, notes } = req.body;
    
    if (!qty || qty <= 0) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }
    
    // Update stock
    const material = await prisma.material.update({
      where: { id },
      data: {
        stockQty: { increment: qty }
      }
    });
    
    // Create stock movement
    await prisma.stockMovement.create({
      data: {
        materialId: id,
        lotNumber: lotNumber || null,
        movementType: 'receipt',
        qty,
        notes: notes || null,
        performedBy: req.user?.id || 'system'
      }
    });
    
    // Create material lot if lot number provided
    if (lotNumber && material.expiryTracking) {
      await prisma.materialLot.create({
        data: {
          materialId: id,
          lotNumber,
          supplier: supplier || material.supplier,
          receivedDate: new Date(),
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          initialQty: qty,
          currentQty: qty,
          status: 'active'
        }
      });
    }
    
    res.json({ 
      material,
      message: `Received ${qty} ${material.unit}` 
    });
  } catch (error) {
    console.error('Error receiving material:', error);
    res.status(500).json({ error: 'Failed to receive material' });
  }
});

// POST /api/materials/:id/adjust - Manual stock adjustment
router.post('/:id/adjust', async (req, res) => {
  try {
    const { id } = req.params;
    const { qty, reason, notes } = req.body;
    
    if (!qty || !reason) {
      return res.status(400).json({ error: 'Quantity and reason are required' });
    }
    
    const material = await prisma.material.update({
      where: { id },
      data: {
        stockQty: { increment: qty }
      }
    });
    
    await prisma.stockMovement.create({
      data: {
        materialId: id,
        movementType: 'adjustment',
        qty,
        notes: `${reason}${notes ? ': ' + notes : ''}`,
        performedBy: req.user?.id || 'system'
      }
    });
    
    res.json({ material, message: 'Stock adjusted successfully' });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({ error: 'Failed to adjust stock' });
  }
});

// POST /api/materials/reserve - Reserve materials for daily plan
router.post('/reserve', async (req, res) => {
  try {
    const { materialId, qty, dailyPlanId, stationId } = req.body;
    
    if (!materialId || !qty) {
      return res.status(400).json({ error: 'Material ID and quantity are required' });
    }
    
    // Check availability
    const material = await prisma.material.findUnique({
      where: { id: materialId }
    });
    
    const availableQty = material.stockQty - (material.reservedQty || 0);
    if (availableQty < qty) {
      return res.status(400).json({ 
        error: 'Insufficient stock',
        available: availableQty,
        requested: qty
      });
    }
    
    // Create reservation
    const reservation = await prisma.materialReservation.create({
      data: {
        materialId,
        dailyPlanId: dailyPlanId || null,
        stationId: stationId ? parseInt(stationId) : null,
        reservedQty: qty,
        reservedBy: req.user?.id || 'system',
        status: 'active'
      }
    });
    
    // Update reserved quantity
    await prisma.material.update({
      where: { id: materialId },
      data: {
        reservedQty: { increment: qty }
      }
    });
    
    res.status(201).json({ reservation });
  } catch (error) {
    console.error('Error reserving material:', error);
    res.status(500).json({ error: 'Failed to reserve material' });
  }
});

// POST /api/materials/reservations/:id/release - Release reservation
router.post('/reservations/:id/release', async (req, res) => {
  try {
    const { id } = req.params;
    
    const reservation = await prisma.materialReservation.findUnique({
      where: { id }
    });
    
    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    
    // Update reservation status
    await prisma.materialReservation.update({
      where: { id },
      data: {
        status: 'released',
        releasedAt: new Date()
      }
    });
    
    // Update material reserved quantity
    await prisma.material.update({
      where: { id: reservation.materialId },
      data: {
        reservedQty: { decrement: reservation.reservedQty }
      }
    });
    
    res.json({ message: 'Reservation released successfully' });
  } catch (error) {
    console.error('Error releasing reservation:', error);
    res.status(500).json({ error: 'Failed to release reservation' });
  }
});

// GET /api/materials/alerts - Get material alerts
router.get('/alerts/summary', async (req, res) => {
  try {
    // Low stock materials
    const lowStock = await prisma.material.findMany({
      where: {
        stockQty: { lte: prisma.material.fields.minStock }
      },
      select: {
        id: true,
        name: true,
        stockQty: true,
        minStock: true,
        unit: true
      }
    });
    
    // Materials needing reorder
    const needsReorder = await prisma.material.findMany({
      where: {
        stockQty: { lte: prisma.material.fields.reorderPoint }
      },
      select: {
        id: true,
        name: true,
        stockQty: true,
        reorderPoint: true,
        leadTimeDays: true,
        unit: true
      }
    });
    
    // Expiring materials (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringSoon = await prisma.materialLot.findMany({
      where: {
        status: 'active',
        expiryDate: {
          lte: thirtyDaysFromNow,
          gte: new Date()
        }
      },
      include: {
        Material: {
          select: { name: true, unit: true }
        }
      }
    });
    
    res.json({
      lowStock,
      needsReorder,
      expiringSoon,
      summary: {
        lowStockCount: lowStock.length,
        reorderCount: needsReorder.length,
        expiringCount: expiringSoon.length
      }
    });
  } catch (error) {
    console.error('Error fetching material alerts:', error);
    res.status(500).json({ error: 'Failed to fetch material alerts' });
  }
});

// GET /api/materials/forecast - Material consumption forecast
router.get('/forecast', async (req, res) => {
  try {
    const { days = 30, materialId } = req.query;
    
    const where = materialId ? { materialId } : {};
    
    const forecasts = await prisma.materialForecast.findMany({
      where: {
        ...where,
        forecastDate: {
          gte: new Date(),
          lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        Material: {
          select: {
            id: true,
            name: true,
            unit: true,
            stockQty: true
          }
        }
      },
      orderBy: { forecastDate: 'asc' }
    });
    
    res.json({ forecasts });
  } catch (error) {
    console.error('Error fetching material forecast:', error);
    res.status(500).json({ error: 'Failed to fetch material forecast' });
  }
});

// GET /api/materials/movements - Stock movement history
router.get('/movements', async (req, res) => {
  try {
    const { materialId, movementType, limit = 100 } = req.query;
    
    const where = {};
    if (materialId) where.materialId = materialId;
    if (movementType) where.movementType = movementType;
    
    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        Material: {
          select: {
            name: true,
            unit: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit)
    });
    
    res.json({ movements });
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ error: 'Failed to fetch stock movements' });
  }
});

// GET /api/materials/dashboard - Dashboard summary
router.get('/dashboard/summary', async (req, res) => {
  try {
    const totalMaterials = await prisma.material.count();
    
    const byType = await prisma.material.groupBy({
      by: ['type'],
      _count: true,
      _sum: {
        stockQty: true
      }
    });
    
    const totalValue = await prisma.material.aggregate({
      _sum: {
        stockQty: true
      },
      where: {
        costPerUnit: { not: null }
      }
    });
    
    const lowStockCount = await prisma.material.count({
      where: {
        stockQty: { lte: prisma.material.fields.minStock }
      }
    });
    
    const activeReservations = await prisma.materialReservation.count({
      where: { status: 'active' }
    });
    
    res.json({
      totalMaterials,
      byType,
      totalValue: totalValue._sum.stockQty || 0,
      lowStockCount,
      activeReservations
    });
  } catch (error) {
    console.error('Error fetching material dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch material dashboard' });
  }
});

module.exports = router;
