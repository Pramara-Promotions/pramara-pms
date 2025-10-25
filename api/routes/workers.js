// api/routes/workers.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authGuard } = require('../middleware/authGuard');
const { getWorkerPerformance, suggestWorkersForStation } = require('../lib/learningEngine');

const router = express.Router();
const prisma = new PrismaClient();

// Get all workers
router.get('/', authGuard, async (req, res) => {
  try {
    const { type, skill, providerId, status } = req.query;
    const where = {};
    if (type) where.workerType = type;
    if (skill) where.skills = { has: skill };
    if (providerId) where.providerId = providerId;
    if (status) where.status = status;
    
    const workers = await prisma.worker.findMany({
      where,
      include: { Provider: true },
      orderBy: { name: 'asc' },
    });
    
    res.json(workers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workers' });
  }
});

// Create worker
router.post('/', authGuard, async (req, res) => {
  try {
    const worker = await prisma.worker.create({
      data: req.body,
      include: { Provider: true },
    });
    res.status(201).json(worker);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create worker' });
  }
});

// Update worker
router.put('/:id', authGuard, async (req, res) => {
  try {
    const worker = await prisma.worker.update({
      where: { id: req.params.id },
      data: req.body,
      include: { Provider: true },
    });
    res.json(worker);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update worker' });
  }
});

// Get worker performance
router.get('/:id/performance', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;
    
    const performance = await getWorkerPerformance(id, parseInt(days));
    res.json(performance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch performance' });
  }
});

// Suggest workers for station
router.get('/suggest', authGuard, async (req, res) => {
  try {
    const { stationId, shiftId, date, limit = 3 } = req.query;
    
    const suggestions = await suggestWorkersForStation(
      parseInt(stationId),
      shiftId,
      new Date(date),
      parseInt(limit)
    );
    
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// Get all providers
router.get('/providers', authGuard, async (req, res) => {
  try {
    const providers = await prisma.thirdPartyProvider.findMany({
      include: {
        _count: { select: { workers: true } },
      },
      orderBy: { stabilityScore: 'desc' },
    });
    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// Create provider
router.post('/providers', authGuard, async (req, res) => {
  try {
    const provider = await prisma.thirdPartyProvider.create({
      data: req.body,
    });
    res.status(201).json(provider);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create provider' });
  }
});

// Update provider metrics
router.put('/providers/:id/metrics', authGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const { turnoverRate, attendanceRate, performanceScore, consistencyRating } = req.body;
    
    const stabilityScore = (
      (100 - turnoverRate) * 0.3 +
      attendanceRate * 0.3 +
      performanceScore * 0.3 +
      consistencyRating * 0.1
    );
    
    const provider = await prisma.thirdPartyProvider.update({
      where: { id },
      data: {
        turnoverRate,
        attendanceRate,
        performanceScore,
        consistencyRating,
        stabilityScore,
      },
    });
    
    res.json(provider);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update metrics' });
  }
});

// Get all shifts
router.get('/shifts', authGuard, async (req, res) => {
  try {
    const shifts = await prisma.shift.findMany({
      where: { active: true },
      orderBy: { startTime: 'asc' },
    });
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

// Create shift
router.post('/shifts', authGuard, async (req, res) => {
  try {
    const shift = await prisma.shift.create({
      data: req.body,
    });
    res.status(201).json(shift);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create shift' });
  }
});

// Log worker performance
router.post('/performance', authGuard, async (req, res) => {
  try {
    const { workerId, projectId, stationId, date, shiftId, targetQty, actualQty, rejectedQty, completionTime } = req.body;
    
    const efficiency = (actualQty / targetQty) * 100;
    const qualityRate = actualQty > 0 ? ((actualQty - rejectedQty) / actualQty) * 100 : 100;
    
    const performance = await prisma.workerPerformance.create({
      data: {
        workerId,
        projectId,
        stationId,
        date: new Date(date),
        shiftId,
        targetQty,
        actualQty,
        rejectedQty,
        efficiency,
        qualityRate,
        completionTime,
      },
    });
    
    // Update station learning metrics
    const { updateStationLearningMetrics } = require('../lib/learningEngine');
    await updateStationLearningMetrics(stationId);
    
    res.status(201).json(performance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log performance' });
  }
});

// Get performance leaderboard
router.get('/performance/leaderboard', authGuard, async (req, res) => {
  try {
    const { skill, days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));
    
    const where = { date: { gte: since } };
    
    // Get all workers with their average performance
    const performances = await prisma.workerPerformance.groupBy({
      by: ['workerId'],
      where,
      _avg: {
        efficiency: true,
        qualityRate: true,
      },
      _count: {
        id: true,
      },
    });
    
    // Get worker details
    const workersWithPerf = await Promise.all(
      performances.map(async (p) => {
        const worker = await prisma.worker.findUnique({
          where: { id: p.workerId },
          select: { id: true, name: true, workerType: true, skills: true },
        });
        
        if (skill && !worker.skills.includes(skill)) return null;
        
        return {
          ...worker,
          avgEfficiency: Math.round(p._avg.efficiency * 10) / 10,
          avgQualityRate: Math.round(p._avg.qualityRate * 10) / 10,
          totalShifts: p._count.id,
          score: Math.round((p._avg.efficiency * 0.6 + p._avg.qualityRate * 0.4) * 10) / 10,
        };
      })
    );
    
    const filtered = workersWithPerf.filter(w => w !== null);
    filtered.sort((a, b) => b.score - a.score);
    
    res.json(filtered);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Create shift handover
router.post('/handovers', authGuard, async (req, res) => {
  try {
    const handover = await prisma.shiftHandover.create({
      data: req.body,
    });
    res.status(201).json(handover);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create handover' });
  }
});

module.exports = router;
