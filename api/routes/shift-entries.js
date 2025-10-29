// api/routes/shift-entries.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/authenticate');

const router = express.Router();
const prisma = new PrismaClient();

// Get all shift entries
router.get('/', authenticate, async (req, res) => {
  try {
    const { projectId, stationId, shiftDate, status, supervisorId } = req.query;
    const where = {};
    
    if (projectId) where.projectId = parseInt(projectId);
    if (stationId) where.stationId = parseInt(stationId);
    if (shiftDate) where.shiftDate = new Date(shiftDate);
    if (status) where.status = status;
    if (supervisorId) where.supervisorId = supervisorId;

    const entries = await prisma.shiftEntry.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        station: { select: { id: true, name: true, code: true } },
        supervisor: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } }
      },
      orderBy: { shiftDate: 'desc' }
    });

    res.json(entries);
  } catch (error) {
    console.error('Error fetching shift entries:', error);
    res.status(500).json({ error: 'Failed to fetch shift entries' });
  }
});

// Get single shift entry
router.get('/:id', authenticate, async (req, res) => {
  try {
    const entry = await prisma.shiftEntry.findUnique({
      where: { id: req.params.id },
      include: {
        project: { select: { id: true, name: true } },
        station: { select: { id: true, name: true, code: true } },
        supervisor: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } }
      }
    });

    if (!entry) {
      return res.status(404).json({ error: 'Shift entry not found' });
    }

    res.json(entry);
  } catch (error) {
    console.error('Error fetching shift entry:', error);
    res.status(500).json({ error: 'Failed to fetch shift entry' });
  }
});

// Create new shift entry
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      projectId,
      stationId,
      shiftDate,
      shiftType,
      shiftStartTime,
      shiftEndTime,
      supervisorId,
      workersPresent,
      workersAbsent,
      totalProduced,
      targetProduction,
      qualityPassed,
      qualityRejected,
      downtimeMinutes,
      downtimeReason,
      machineStatus,
      materialsUsed,
      issues,
      achievements,
      handoverNotes
    } = req.body;

    // Calculate efficiency if target is provided
    let efficiency = null;
    if (targetProduction && totalProduced) {
      efficiency = (totalProduced / targetProduction) * 100;
    }

    const entry = await prisma.shiftEntry.create({
      data: {
        projectId: parseInt(projectId),
        stationId: stationId ? parseInt(stationId) : null,
        shiftDate: new Date(shiftDate),
        shiftType,
        shiftStartTime: new Date(shiftStartTime),
        shiftEndTime: new Date(shiftEndTime),
        supervisorId,
        workersPresent: parseInt(workersPresent) || 0,
        workersAbsent: parseInt(workersAbsent) || 0,
        totalProduced: parseInt(totalProduced) || 0,
        targetProduction: targetProduction ? parseInt(targetProduction) : null,
        qualityPassed: parseInt(qualityPassed) || 0,
        qualityRejected: parseInt(qualityRejected) || 0,
        downtimeMinutes: parseInt(downtimeMinutes) || 0,
        downtimeReason,
        machineStatus: machineStatus || [],
        materialsUsed: materialsUsed || [],
        issues: issues || [],
        achievements,
        handoverNotes,
        efficiency,
        status: 'draft',
        createdBy: req.user.id
      },
      include: {
        project: { select: { id: true, name: true } },
        station: { select: { id: true, name: true, code: true } },
        supervisor: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } }
      }
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error('Error creating shift entry:', error);
    res.status(500).json({ error: 'Failed to create shift entry' });
  }
});

// Update shift entry
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      shiftDate,
      shiftType,
      shiftStartTime,
      shiftEndTime,
      supervisorId,
      workersPresent,
      workersAbsent,
      totalProduced,
      targetProduction,
      qualityPassed,
      qualityRejected,
      downtimeMinutes,
      downtimeReason,
      machineStatus,
      materialsUsed,
      issues,
      achievements,
      handoverNotes
    } = req.body;

    // Calculate efficiency if target is provided
    let efficiency = undefined;
    if (targetProduction !== undefined && totalProduced !== undefined) {
      efficiency = targetProduction > 0 ? (totalProduced / targetProduction) * 100 : null;
    }

    const entry = await prisma.shiftEntry.update({
      where: { id: req.params.id },
      data: {
        shiftDate: shiftDate ? new Date(shiftDate) : undefined,
        shiftType,
        shiftStartTime: shiftStartTime ? new Date(shiftStartTime) : undefined,
        shiftEndTime: shiftEndTime ? new Date(shiftEndTime) : undefined,
        supervisorId,
        workersPresent: workersPresent !== undefined ? parseInt(workersPresent) : undefined,
        workersAbsent: workersAbsent !== undefined ? parseInt(workersAbsent) : undefined,
        totalProduced: totalProduced !== undefined ? parseInt(totalProduced) : undefined,
        targetProduction: targetProduction ? parseInt(targetProduction) : null,
        qualityPassed: qualityPassed !== undefined ? parseInt(qualityPassed) : undefined,
        qualityRejected: qualityRejected !== undefined ? parseInt(qualityRejected) : undefined,
        downtimeMinutes: downtimeMinutes !== undefined ? parseInt(downtimeMinutes) : undefined,
        downtimeReason,
        machineStatus,
        materialsUsed,
        issues,
        achievements,
        handoverNotes,
        efficiency
      },
      include: {
        project: { select: { id: true, name: true } },
        station: { select: { id: true, name: true, code: true } },
        supervisor: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } }
      }
    });

    res.json(entry);
  } catch (error) {
    console.error('Error updating shift entry:', error);
    res.status(500).json({ error: 'Failed to update shift entry' });
  }
});

// Submit shift entry for approval
router.post('/:id/submit', authenticate, async (req, res) => {
  try {
    const entry = await prisma.shiftEntry.update({
      where: { id: req.params.id },
      data: { status: 'submitted' },
      include: {
        project: { select: { id: true, name: true } },
        station: { select: { id: true, name: true, code: true } },
        supervisor: { select: { id: true, name: true, email: true } }
      }
    });

    res.json(entry);
  } catch (error) {
    console.error('Error submitting shift entry:', error);
    res.status(500).json({ error: 'Failed to submit shift entry' });
  }
});

// Approve shift entry
router.post('/:id/approve', authenticate, async (req, res) => {
  try {
    const entry = await prisma.shiftEntry.update({
      where: { id: req.params.id },
      data: {
        status: 'approved',
        approvedBy: req.user.id,
        approvedAt: new Date()
      },
      include: {
        project: { select: { id: true, name: true } },
        station: { select: { id: true, name: true, code: true } },
        supervisor: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } }
      }
    });

    res.json(entry);
  } catch (error) {
    console.error('Error approving shift entry:', error);
    res.status(500).json({ error: 'Failed to approve shift entry' });
  }
});

// Get shift analytics
router.get('/analytics/summary', authenticate, async (req, res) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    const where = { status: 'approved' };
    
    if (projectId) where.projectId = parseInt(projectId);
    if (startDate && endDate) {
      where.shiftDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const entries = await prisma.shiftEntry.findMany({ where });

    const summary = {
      totalShifts: entries.length,
      totalProduced: entries.reduce((sum, e) => sum + e.totalProduced, 0),
      totalPassed: entries.reduce((sum, e) => sum + e.qualityPassed, 0),
      totalRejected: entries.reduce((sum, e) => sum + e.qualityRejected, 0),
      totalDowntime: entries.reduce((sum, e) => sum + e.downtimeMinutes, 0),
      avgEfficiency: entries.length > 0 
        ? entries.reduce((sum, e) => sum + (e.efficiency || 0), 0) / entries.length 
        : 0,
      avgWorkersPresent: entries.length > 0
        ? entries.reduce((sum, e) => sum + e.workersPresent, 0) / entries.length
        : 0
    };

    res.json(summary);
  } catch (error) {
    console.error('Error fetching shift analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Delete shift entry
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await prisma.shiftEntry.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Shift entry deleted' });
  } catch (error) {
    console.error('Error deleting shift entry:', error);
    res.status(500).json({ error: 'Failed to delete shift entry' });
  }
});

module.exports = router;
