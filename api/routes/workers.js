const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(requireAuth);

// GET /api/workers - List all workers with filters
router.get('/', async (req, res) => {
  try {
    const { workerType, providerId, skill, status } = req.query;
    
    const where = {};
    if (workerType) where.workerType = workerType;
    if (providerId) where.providerId = providerId;
    if (status) where.status = status;
    if (skill) where.skills = { has: skill };
    
    const workers = await prisma.worker.findMany({
      where,
      include: {
        Provider: {
          select: {
            id: true,
            name: true,
            stabilityScore: true
          }
        },
        _count: {
          select: {
            shiftPlans: true,
            performance: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    res.json({ workers });
  } catch (error) {
    console.error('Error fetching workers:', error);
    res.status(500).json({ error: 'Failed to fetch workers' });
  }
});

// GET /api/workers/:id - Get single worker
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const worker = await prisma.worker.findUnique({
      where: { id },
      include: {
        Provider: true,
        shiftPlans: {
          orderBy: { date: 'desc' },
          take: 20,
          include: {
            Shift: {
              select: { name: true, startTime: true, endTime: true }
            },
            Station: {
              select: { code: true, name: true }
            }
          }
        },
        performance: {
          orderBy: { date: 'desc' },
          take: 30,
          include: {
            Project: {
              select: { projectCode: true, projectName: true }
            },
            Station: {
              select: { code: true, name: true }
            }
          }
        }
      }
    });
    
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    
    // Calculate average performance
    const avgEfficiency = worker.performance.length > 0
      ? worker.performance.reduce((sum, p) => sum + p.efficiency, 0) / worker.performance.length
      : 0;
    
    const avgQuality = worker.performance.length > 0
      ? worker.performance.reduce((sum, p) => sum + p.qualityRate, 0) / worker.performance.length
      : 0;
    
    res.json({
      worker: {
        ...worker,
        averageEfficiency: avgEfficiency.toFixed(2),
        averageQuality: avgQuality.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error fetching worker:', error);
    res.status(500).json({ error: 'Failed to fetch worker' });
  }
});

// POST /api/workers - Create new worker
router.post('/', async (req, res) => {
  try {
    const {
      name,
      workerType,
      providerId,
      skills,
      certifications,
      shiftPreference,
      hireDate,
      contractEnd,
      hourlyRate,
      status
    } = req.body;
    
    if (!name || !workerType) {
      return res.status(400).json({ error: 'Name and worker type are required' });
    }
    
    const worker = await prisma.worker.create({
      data: {
        name,
        workerType,
        providerId: providerId || null,
        skills: skills || [],
        certifications: certifications || null,
        shiftPreference: shiftPreference || null,
        hireDate: hireDate ? new Date(hireDate) : null,
        contractEnd: contractEnd ? new Date(contractEnd) : null,
        hourlyRate: hourlyRate || null,
        status: status || 'active'
      },
      include: {
        Provider: true
      }
    });
    
    res.status(201).json({ worker });
  } catch (error) {
    console.error('Error creating worker:', error);
    res.status(500).json({ error: 'Failed to create worker' });
  }
});

// PUT /api/workers/:id - Update worker
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {};
    
    const fields = ['name', 'skills', 'certifications', 'shiftPreference', 
                    'hireDate', 'contractEnd', 'hourlyRate', 'status'];
    
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'hireDate' || field === 'contractEnd') {
          updateData[field] = req.body[field] ? new Date(req.body[field]) : null;
        } else {
          updateData[field] = req.body[field];
        }
      }
    });
    
    const worker = await prisma.worker.update({
      where: { id },
      data: updateData,
      include: {
        Provider: true
      }
    });
    
    res.json({ worker });
  } catch (error) {
    console.error('Error updating worker:', error);
    res.status(500).json({ error: 'Failed to update worker' });
  }
});

// DELETE /api/workers/:id - Delete/deactivate worker
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Soft delete by setting status to inactive
    await prisma.worker.update({
      where: { id },
      data: { status: 'inactive' }
    });
    
    res.json({ message: 'Worker deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating worker:', error);
    res.status(500).json({ error: 'Failed to deactivate worker' });
  }
});

// GET /api/workers/performance/leaderboard - Worker leaderboard
router.get('/performance/leaderboard', async (req, res) => {
  try {
    const { skill, days = 30 } = req.query;
    
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));
    
    const where = { date: { gte: dateFrom } };
    
    // Get performance data
    const performances = await prisma.workerPerformance.findMany({
      where,
      include: {
        Worker: {
          select: {
            id: true,
            name: true,
            skills: true,
            workerType: true,
            Provider: {
              select: { name: true }
            }
          }
        }
      }
    });
    
    // Filter by skill if provided
    const filteredPerformances = skill
      ? performances.filter(p => p.Worker.skills.includes(skill))
      : performances;
    
    // Calculate averages per worker
    const workerStats = {};
    filteredPerformances.forEach(p => {
      if (!workerStats[p.workerId]) {
        workerStats[p.workerId] = {
          worker: p.Worker,
          efficiencies: [],
          qualityRates: [],
          totalShifts: 0
        };
      }
      workerStats[p.workerId].efficiencies.push(p.efficiency);
      workerStats[p.workerId].qualityRates.push(p.qualityRate);
      workerStats[p.workerId].totalShifts++;
    });
    
    // Calculate averages and sort
    const leaderboard = Object.values(workerStats).map(stats => ({
      worker: stats.worker,
      avgEfficiency: stats.efficiencies.reduce((a, b) => a + b, 0) / stats.efficiencies.length,
      avgQuality: stats.qualityRates.reduce((a, b) => a + b, 0) / stats.qualityRates.length,
      totalShifts: stats.totalShifts,
      overallScore: ((stats.efficiencies.reduce((a, b) => a + b, 0) / stats.efficiencies.length) + 
                     (stats.qualityRates.reduce((a, b) => a + b, 0) / stats.qualityRates.length)) / 2
    })).sort((a, b) => b.overallScore - a.overallScore);
    
    res.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/workers/suggest - Suggest workers for station/shift
router.get('/suggest', async (req, res) => {
  try {
    const { stationId, shiftId, date, requiredSkills } = req.query;
    
    if (!stationId) {
      return res.status(400).json({ error: 'Station ID is required' });
    }
    
    // Get all active workers
    const workers = await prisma.worker.findMany({
      where: { status: 'active' },
      include: {
        Provider: {
          select: { stabilityScore: true }
        },
        performance: {
          where: {
            stationId: parseInt(stationId),
            date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          },
          orderBy: { date: 'desc' }
        }
      }
    });
    
    // Score each worker
    const scoredWorkers = workers.map(worker => {
      let score = 0;
      const reasons = [];
      
      // Skill match
      const skills = requiredSkills ? JSON.parse(requiredSkills) : [];
      const skillMatch = skills.filter(s => worker.skills.includes(s)).length;
      if (skillMatch > 0) {
        score += skillMatch * 20;
        reasons.push(`Has ${skillMatch}/${skills.length} required skills`);
      }
      
      // Recent performance at this station
      if (worker.performance.length > 0) {
        const avgEff = worker.performance.reduce((s, p) => s + p.efficiency, 0) / worker.performance.length;
        const avgQual = worker.performance.reduce((s, p) => s + p.qualityRate, 0) / worker.performance.length;
        score += (avgEff + avgQual) / 2;
        reasons.push(`${avgEff.toFixed(0)}% efficiency, ${avgQual.toFixed(0)}% quality at this station`);
      }
      
      // Provider stability (if third party)
      if (worker.workerType === 'third_party' && worker.Provider) {
        score += (worker.Provider.stabilityScore || 0) * 10;
        if (worker.Provider.stabilityScore > 80) {
          reasons.push('From highly stable provider');
        }
      }
      
      // Shift preference match
      if (shiftId && worker.shiftPreference) {
        // TODO: Check if shift matches preference
        // score += 10;
      }
      
      return {
        worker,
        score,
        reasons,
        recentPerformance: worker.performance.slice(0, 5)
      };
    }).sort((a, b) => b.score - a.score).slice(0, 5);
    
    res.json({ suggestions: scoredWorkers });
  } catch (error) {
    console.error('Error suggesting workers:', error);
    res.status(500).json({ error: 'Failed to suggest workers' });
  }
});

// GET /api/workers/providers - List 3rd party providers
router.get('/providers/list', async (req, res) => {
  try {
    const { sortBy = 'stabilityScore' } = req.query;
    
    const providers = await prisma.thirdPartyProvider.findMany({
      include: {
        workers: {
          where: { status: 'active' },
          select: {
            id: true,
            name: true,
            skills: true
          }
        }
      },
      orderBy: { [sortBy]: 'desc' }
    });
    
    res.json({ providers });
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

// POST /api/workers/providers - Create provider
router.post('/providers', async (req, res) => {
  try {
    const {
      name,
      contactPerson,
      phone,
      email,
      location,
      contractStart,
      contractEnd,
      rateStructure
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Provider name is required' });
    }
    
    const provider = await prisma.thirdPartyProvider.create({
      data: {
        name,
        contactPerson: contactPerson || null,
        phone: phone || null,
        email: email || null,
        location: location || null,
        contractStart: contractStart ? new Date(contractStart) : null,
        contractEnd: contractEnd ? new Date(contractEnd) : null,
        rateStructure: rateStructure || null
      }
    });
    
    res.status(201).json({ provider });
  } catch (error) {
    console.error('Error creating provider:', error);
    res.status(500).json({ error: 'Failed to create provider' });
  }
});

// PUT /api/workers/providers/:id/metrics - Recalculate provider metrics
router.put('/providers/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get all workers from this provider
    const workers = await prisma.worker.findMany({
      where: { providerId: id },
      include: {
        performance: {
          where: {
            date: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
          }
        }
      }
    });
    
    if (workers.length === 0) {
      return res.status(400).json({ error: 'No workers found for this provider' });
    }
    
    // Calculate metrics
    const allPerformances = workers.flatMap(w => w.performance);
    const performanceScore = allPerformances.length > 0
      ? allPerformances.reduce((sum, p) => sum + (p.efficiency + p.qualityRate) / 2, 0) / allPerformances.length
      : 0;
    
    // Calculate consistency (lower variance = higher consistency)
    const efficiencies = allPerformances.map(p => p.efficiency);
    const avgEff = efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length;
    const variance = efficiencies.reduce((sum, e) => sum + Math.pow(e - avgEff, 2), 0) / efficiencies.length;
    const consistencyRating = Math.max(0, 100 - Math.sqrt(variance));
    
    // Calculate turnover rate (workers who left in last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const inactiveWorkers = await prisma.worker.count({
      where: {
        providerId: id,
        status: 'inactive',
        updatedAt: { gte: sixMonthsAgo }
      }
    });
    const turnoverRate = workers.length > 0 ? (inactiveWorkers / workers.length) * 100 : 0;
    
    // Attendance rate (placeholder - would need actual attendance tracking)
    const attendanceRate = 95; // Default
    
    // Overall stability score
    const stabilityScore = (
      (performanceScore * 0.4) +
      (consistencyRating * 0.3) +
      ((100 - turnoverRate) * 0.2) +
      (attendanceRate * 0.1)
    );
    
    // Update provider
    const provider = await prisma.thirdPartyProvider.update({
      where: { id },
      data: {
        turnoverRate,
        attendanceRate,
        performanceScore,
        consistencyRating,
        stabilityScore
      }
    });
    
    res.json({ provider });
  } catch (error) {
    console.error('Error updating provider metrics:', error);
    res.status(500).json({ error: 'Failed to update provider metrics' });
  }
});

// GET /api/workers/dashboard - Workers dashboard summary
router.get('/dashboard/summary', async (req, res) => {
  try {
    const totalWorkers = await prisma.worker.count({ where: { status: 'active' } });
    
    const byType = await prisma.worker.groupBy({
      by: ['workerType'],
      where: { status: 'active' },
      _count: true
    });
    
    const totalProviders = await prisma.thirdPartyProvider.count({ where: { active: true } });
    
    const avgPerformance = await prisma.workerPerformance.aggregate({
      _avg: {
        efficiency: true,
        qualityRate: true
      },
      where: {
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    });
    
    res.json({
      totalWorkers,
      byType: byType.reduce((acc, item) => {
        acc[item.workerType] = item._count;
        return acc;
      }, {}),
      totalProviders,
      avgEfficiency: avgPerformance._avg.efficiency?.toFixed(2) || 0,
      avgQuality: avgPerformance._avg.qualityRate?.toFixed(2) || 0
    });
  } catch (error) {
    console.error('Error fetching workers dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch workers dashboard' });
  }
});

module.exports = router;
