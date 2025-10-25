// api/routes/materials.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authGuard } = require('../middleware/authGuard');

const router = express.Router();
const prisma = new PrismaClient();

// Get all materials
router.get('/', authGuard, async (req, res) => {
  try {
    const { type, lowStock } = req.query;
    const where = {};
    if (type) where.type = type;
    if (lowStock === 'true') {
      where.stockQty = { lte: prisma.raw('minStock') };
    }
    
    const materials = await prisma.material.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    
    res.json(materials);
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// Create material
router.post('/', authGuard, async (req, res) => {
  try {
    const material = await prisma.material.create({
      data: req.body,
    });
    res.status(201).json(material);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create material' });
  }
});

// Update material stock
router.put('/:id/stock', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const { qty, type, notes, performedBy } = req.body; // type: 'add' or 'subtract'
    
    const material = await prisma.material.findUnique({ where: { id } });
    const newQty = type === 'add' ? material.stockQty + qty : material.stockQty - qty;
    
    const updated = await prisma.material.update({
      where: { id },
      data: { stockQty: newQty },
    });
    
    // Log movement
    await prisma.stockMovement.create({
      data: {
        materialId: id,
        movementType: type === 'add' ? 'receipt' : 'consumption',
        qty,
        notes,
        performedBy,
        timestamp: new Date(),
      },
    });
    
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Get material lots
router.get('/:materialId/lots', authGuard, async (req, res) => {
  try {
    const { materialId } = req.params;
    const lots = await prisma.materialLot.findMany({
      where: { materialId },
      orderBy: { receivedDate: 'desc' },
    });
    res.json(lots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lots' });
  }
});

// Create material lot
router.post('/lots', authGuard, async (req, res) => {
  try {
    const lot = await prisma.materialLot.create({
      data: req.body,
    });
    res.status(201).json(lot);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create lot' });
  }
});

// Get stock movements
router.get('/:materialId/movements', authGuard, async (req, res) => {
  try {
    const { materialId } = req.params;
    const movements = await prisma.stockMovement.findMany({
      where: { materialId },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    res.json(movements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch movements' });
  }
});

// Check material availability for daily plan
router.post('/check-availability', authGuard, async (req, res) => {
  try {
    const { materialsRequired } = req.body; // { materialId: qty }
    
    const results = {};
    for (const [materialId, requiredQty] of Object.entries(materialsRequired)) {
      const material = await prisma.material.findUnique({ where: { id: materialId } });
      const availableQty = material.stockQty - material.reservedQty;
      
      results[materialId] = {
        required: requiredQty,
        available: availableQty,
        shortage: Math.max(0, requiredQty - availableQty),
        status: availableQty >= requiredQty ? 'ok' : 'shortage',
      };
    }
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// Reserve materials
router.post('/reserve', authGuard, async (req, res) => {
  try {
    const { materialId, dailyPlanId, reservedQty, reservedBy } = req.body;
    
    const reservation = await prisma.materialReservation.create({
      data: {
        materialId,
        dailyPlanId,
        reservedQty,
        reservedBy,
      },
    });
    
    // Update material reserved qty
    await prisma.material.update({
      where: { id: materialId },
      data: { reservedQty: { increment: reservedQty } },
    });
    
    res.status(201).json(reservation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reserve material' });
  }
});

// Release reservation
router.post('/release/:reservationId', authGuard, async (req, res) => {
  try {
    const { reservationId } = req.params;
    
    const reservation = await prisma.materialReservation.findUnique({
      where: { id: reservationId },
    });
    
    await prisma.materialReservation.update({
      where: { id: reservationId },
      data: { status: 'released', releasedAt: new Date() },
    });
    
    await prisma.material.update({
      where: { id: reservation.materialId },
      data: { reservedQty: { decrement: reservation.reservedQty } },
    });
    
    res.json({ message: 'Reservation released' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to release reservation' });
  }
});

module.exports = router;
