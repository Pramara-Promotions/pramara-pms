// api/routes/wip-ledger.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();
const prisma = new PrismaClient();

// Get all WIP transactions
router.get('/', authenticate, async (req, res) => {
  try {
    const { projectId, stationId, batchId, itemCode, transactionType, startDate, endDate, status } = req.query;
    const where = {};
    
    if (projectId) where.projectId = parseInt(projectId);
    if (stationId) where.stationId = parseInt(stationId);
    if (batchId) where.batchId = batchId;
    if (itemCode) where.itemCode = { contains: itemCode, mode: 'insensitive' };
    if (transactionType) where.transactionType = transactionType;
    if (status) where.status = status;
    
    if (startDate && endDate) {
      where.transactionDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const transactions = await prisma.wIPLedger.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        station: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, batchCode: true } },
        fromStation: { select: { id: true, name: true, code: true } },
        toStation: { select: { id: true, name: true, code: true } },
        operator: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } }
      },
      orderBy: { transactionDate: 'desc' },
      take: 100
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching WIP transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get single transaction
router.get('/:id', authenticate, async (req, res) => {
  try {
    const transaction = await prisma.wIPLedger.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, name: true } },
        station: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, batchCode: true } },
        fromStation: { select: { id: true, name: true, code: true } },
        toStation: { select: { id: true, name: true, code: true } },
        operator: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } }
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Create new WIP transaction
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      projectId,
      stationId,
      batchId,
      transactionType,
      itemCode,
      itemDescription,
      quantity,
      unit,
      fromLocation,
      toLocation,
      fromStationId,
      toStationId,
      referenceType,
      referenceId,
      operationCode,
      operatorId,
      qualityStatus,
      remarks,
      costPerUnit,
      totalCost
    } = req.body;

    // Calculate running balance for this item
    const lastTransaction = await prisma.wIPLedger.findFirst({
      where: {
        projectId: parseInt(projectId),
        itemCode,
        status: 'active'
      },
      orderBy: { transactionDate: 'desc' }
    });

    let balanceQuantity = parseFloat(quantity);
    if (lastTransaction) {
      const lastBalance = lastTransaction.balanceQuantity || 0;
      // Add for input/output based on type
      if (transactionType === 'input') {
        balanceQuantity = lastBalance + parseFloat(quantity);
      } else if (transactionType === 'output' || transactionType === 'scrap') {
        balanceQuantity = lastBalance - parseFloat(quantity);
      } else if (transactionType === 'adjustment') {
        balanceQuantity = lastBalance + parseFloat(quantity); // Can be negative for reduction
      } else {
        balanceQuantity = lastBalance; // Transfer doesn't change total
      }
    }

    const transaction = await prisma.wIPLedger.create({
      data: {
        projectId: parseInt(projectId),
        stationId: stationId ? parseInt(stationId) : null,
        batchId: batchId || null,
        transactionType,
        itemCode,
        itemDescription,
        quantity: parseFloat(quantity),
        unit: unit || 'pcs',
        fromLocation,
        toLocation,
        fromStationId: fromStationId ? parseInt(fromStationId) : null,
        toStationId: toStationId ? parseInt(toStationId) : null,
        referenceType,
        referenceId,
        operationCode,
        operatorId,
        qualityStatus,
        remarks,
        costPerUnit: costPerUnit ? parseFloat(costPerUnit) : null,
        totalCost: totalCost ? parseFloat(totalCost) : null,
        balanceQuantity,
        status: 'active',
        createdBy: req.user.id
      },
      include: {
        project: { select: { id: true, name: true } },
        station: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, batchCode: true } },
        creator: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating WIP transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Cancel transaction
router.post('/:id/cancel', authenticate, async (req, res) => {
  try {
    const { cancelReason } = req.body;

    const transaction = await prisma.wIPLedger.update({
      where: { id: req.params.id },
      data: {
        status: 'cancelled',
        cancelledBy: req.user.id,
        cancelledAt: new Date(),
        cancelReason
      },
      include: {
        project: { select: { id: true, name: true } },
        station: { select: { id: true, name: true, code: true } }
      }
    });

    res.json(transaction);
  } catch (error) {
    console.error('Error cancelling transaction:', error);
    res.status(500).json({ error: 'Failed to cancel transaction' });
  }
});

// Get WIP balance summary
router.get('/balance/summary', authenticate, async (req, res) => {
  try {
    const { projectId, stationId } = req.query;
    const where = { status: 'active' };
    
    if (projectId) where.projectId = parseInt(projectId);
    if (stationId) where.stationId = parseInt(stationId);

    const transactions = await prisma.wIPLedger.findMany({ where });

    // Group by itemCode and calculate current balance
    const balances = {};
    transactions.forEach(t => {
      if (!balances[t.itemCode]) {
        balances[t.itemCode] = {
          itemCode: t.itemCode,
          itemDescription: t.itemDescription,
          unit: t.unit,
          currentBalance: 0,
          totalInput: 0,
          totalOutput: 0,
          totalScrap: 0,
          transactions: []
        };
      }
      
      if (t.transactionType === 'input') {
        balances[t.itemCode].totalInput += t.quantity;
        balances[t.itemCode].currentBalance += t.quantity;
      } else if (t.transactionType === 'output') {
        balances[t.itemCode].totalOutput += t.quantity;
        balances[t.itemCode].currentBalance -= t.quantity;
      } else if (t.transactionType === 'scrap') {
        balances[t.itemCode].totalScrap += t.quantity;
        balances[t.itemCode].currentBalance -= t.quantity;
      }
      
      balances[t.itemCode].transactions.push({
        id: t.id,
        date: t.transactionDate,
        type: t.transactionType,
        quantity: t.quantity
      });
    });

    res.json(Object.values(balances));
  } catch (error) {
    console.error('Error fetching WIP balance:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// Get transaction history for item
router.get('/history/:itemCode', authenticate, async (req, res) => {
  try {
    const { itemCode } = req.params;
    const { projectId } = req.query;
    const where = { itemCode };
    
    if (projectId) where.projectId = parseInt(projectId);

    const transactions = await prisma.wIPLedger.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        station: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, batchCode: true } },
        operator: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } }
      },
      orderBy: { transactionDate: 'desc' }
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Delete transaction
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.wIPLedger.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

module.exports = router;
