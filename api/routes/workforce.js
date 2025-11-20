/**
 * Workforce Management Routes
 * Handles workforce operations including workers, providers/contractors, and performance tracking
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const authGuard = require('../middleware/authGuard');
const { permissionGuard } = require('../middleware/permissionGuard');

// ============================================================================
// WORKERS MANAGEMENT
// ============================================================================

/**
 * GET /api/workforce/workers
 * List workers with filters
 */
router.get('/workers', authGuard, async (req, res) => {
  try {
    const { 
      workerType,  // 'company' or '3rd-party'
      providerId, 
      skill, 
      status, 
      search 
    } = req.query;
    
    const where = {};
    if (workerType) where.workerType = workerType;
    if (providerId) where.providerId = providerId;
    if (status) where.status = status;
    else where.status = 'active'; // Default to active only
    
    if (skill) {
      where.skills = { has: skill };
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    const workers = await prisma.worker.findMany({
      where,
      include: {
        ThirdPartyProvider: { 
          select: { id: true, name: true, contactPerson: true } 
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(workers);
  } catch (error) {
    console.error('[workforce] Error fetching workers:', error);
    res.status(500).json({ error: 'Failed to fetch workers' });
  }
});

/**
 * POST /api/workforce/workers
 * Create new worker
 */
router.post('/workers', authGuard, permissionGuard('WORKFORCE_MANAGE'), async (req, res) => {
  try {
    const {
      name,
      employeeCode,
      email,
      phone,
      workerType,  // 'company' or '3rd-party'
      providerId,
      skills,
      certifications,
      shiftPreference,
      hireDate,
      contractEnd,
      hourlyRate,
      overtimeRate,
    } = req.body;
    
    if (!name || !workerType) {
      return res.status(400).json({ error: 'Name and workerType are required' });
    }
    
    if (workerType === '3rd-party' && !providerId) {
      return res.status(400).json({ error: 'Provider ID required for 3rd-party workers' });
    }
    
    const worker = await prisma.worker.create({
      data: {
        id: `WKR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        employeeCode,
        email,
        phone,
        workerType,
        providerId: workerType === '3rd-party' ? providerId : null,
        skills: skills || [],
        certifications: certifications || null,
        shiftPreference,
        hireDate: hireDate ? new Date(hireDate) : null,
        contractEnd: contractEnd ? new Date(contractEnd) : null,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        overtimeRate: overtimeRate ? parseFloat(overtimeRate) : null,
        updatedAt: new Date(),
      },
      include: {
        ThirdPartyProvider: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[workforce] Worker created: ${name} (${workerType}) by ${req.user.email}`);
    res.status(201).json(worker);
  } catch (error) {
    console.error('[workforce] Error creating worker:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Worker with this employee code already exists' });
    }
    res.status(500).json({ error: 'Failed to create worker' });
  }
});

/**
 * PUT /api/workforce/workers/:id
 * Update worker
 */
router.put('/workers/:id', authGuard, permissionGuard('WORKFORCE_MANAGE'), async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: new Date() };
    
    // Convert date strings to Date objects
    if (req.body.hireDate) updateData.hireDate = new Date(req.body.hireDate);
    if (req.body.contractEnd) updateData.contractEnd = new Date(req.body.contractEnd);
    if (req.body.hourlyRate) updateData.hourlyRate = parseFloat(req.body.hourlyRate);
    if (req.body.overtimeRate) updateData.overtimeRate = parseFloat(req.body.overtimeRate);
    
    const worker = await prisma.worker.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        ThirdPartyProvider: { select: { id: true, name: true } },
      },
    });
    
    console.log(`[workforce] Worker updated: ${req.params.id} by ${req.user.email}`);
    res.json(worker);
  } catch (error) {
    console.error('[workforce] Error updating worker:', error);
    res.status(500).json({ error: 'Failed to update worker' });
  }
});

/**
 * DELETE /api/workforce/workers/:id
 * Deactivate worker (soft delete)
 */
router.delete('/workers/:id', authGuard, permissionGuard('WORKFORCE_MANAGE'), async (req, res) => {
  try {
    const worker = await prisma.worker.update({
      where: { id: req.params.id },
      data: { status: 'inactive', updatedAt: new Date() },
    });
    
    console.log(`[workforce] Worker deactivated: ${req.params.id} by ${req.user.email}`);
    res.json({ message: 'Worker deactivated successfully', worker });
  } catch (error) {
    console.error('[workforce] Error deactivating worker:', error);
    res.status(500).json({ error: 'Failed to deactivate worker' });
  }
});

// ============================================================================
// PROVIDERS / CONTRACTORS
// ============================================================================

/**
 * GET /api/workforce/providers
 * List third-party providers/contractors
 */
router.get('/providers', authGuard, async (req, res) => {
  try {
    const { active } = req.query;
    
    const where = {};
    if (active !== undefined) {
      where.active = active === 'true';
    }
    
    const providers = await prisma.thirdPartyProvider.findMany({
      where,
      include: {
        Worker: {
          where: { status: 'active' },
          select: { id: true, name: true, workerType: true },
        },
        _count: {
          select: { Worker: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Calculate metrics for each provider
    const providersWithMetrics = providers.map(provider => ({
      ...provider,
      activeWorkerCount: provider.Worker.length,
      totalWorkerCount: provider._count.Worker,
      stabilityScore: provider.stabilityScore || 0,
      performanceScore: provider.performanceScore || 0,
      attendanceRate: provider.attendanceRate || 100,
    }));
    
    res.json(providersWithMetrics);
  } catch (error) {
    console.error('[workforce] Error fetching providers:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

/**
 * POST /api/workforce/providers
 * Create new provider
 */
router.post('/providers', authGuard, permissionGuard('WORKFORCE_MANAGE'), async (req, res) => {
  try {
    const {
      name,
      contactPerson,
      email,
      phone,
      location,
      contractStart,
      contractEnd,
      rateStructure,
    } = req.body;
    
    if (!name || !contactPerson) {
      return res.status(400).json({ error: 'Name and contact person are required' });
    }
    
    const provider = await prisma.thirdPartyProvider.create({
      data: {
        id: `PRV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        contactPerson,
        email,
        phone,
        location,
        contractStart: contractStart ? new Date(contractStart) : null,
        contractEnd: contractEnd ? new Date(contractEnd) : null,
        rateStructure,
        updatedAt: new Date(),
      },
    });
    
    console.log(`[workforce] Provider created: ${name} by ${req.user.email}`);
    res.status(201).json(provider);
  } catch (error) {
    console.error('[workforce] Error creating provider:', error);
    res.status(500).json({ error: 'Failed to create provider' });
  }
});

/**
 * PUT /api/workforce/providers/:id
 * Update provider
 */
router.put('/providers/:id', authGuard, permissionGuard('WORKFORCE_MANAGE'), async (req, res) => {
  try {
    const updateData = { ...req.body, updatedAt: new Date() };
    
    // Convert date strings
    if (req.body.contractStart) updateData.contractStart = new Date(req.body.contractStart);
    if (req.body.contractEnd) updateData.contractEnd = new Date(req.body.contractEnd);
    
    const provider = await prisma.thirdPartyProvider.update({
      where: { id: req.params.id },
      data: updateData,
    });
    
    console.log(`[workforce] Provider updated: ${req.params.id} by ${req.user.email}`);
    res.json(provider);
  } catch (error) {
    console.error('[workforce] Error updating provider:', error);
    res.status(500).json({ error: 'Failed to update provider' });
  }
});

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

/**
 * GET /api/workforce/performance/leaderboard
 * Get worker performance leaderboard
 */
router.get('/performance/leaderboard', authGuard, async (req, res) => {
  try {
    const { days = 30, projectId, limit = 20 } = req.query;
    
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));
    
    const where = { date: { gte: dateFrom } };
    if (projectId) where.projectId = parseInt(projectId);
    
    const performanceRecords = await prisma.workerPerformance.findMany({
      where,
      include: {
        Worker: { select: { id: true, name: true, workerType: true } },
      },
    });
    
    // Aggregate by worker
    const workerStats = {};
    performanceRecords.forEach(record => {
      if (!workerStats[record.workerId]) {
        workerStats[record.workerId] = {
          workerId: record.workerId,
          workerName: record.Worker.name,
          workerType: record.Worker.workerType,
          totalTasks: 0,
          totalOutput: 0,
          totalHours: 0,
          avgQuality: 0,
          recordCount: 0,
        };
      }
      
      const stats = workerStats[record.workerId];
      stats.totalTasks += record.tasksCompleted || 0;
      stats.totalOutput += record.actualQty || 0;
      stats.totalHours += record.hoursWorked || 0;
      stats.avgQuality += record.qualityRate || 0;
      stats.recordCount++;
    });
    
    // Calculate averages and scores
    const leaderboard = Object.values(workerStats).map(stats => {
      stats.avgQuality = stats.avgQuality / stats.recordCount;
      stats.performanceScore = (stats.totalTasks * 0.3) + (stats.avgQuality * 0.7);
      return stats;
    });
    
    // Sort and limit
    leaderboard.sort((a, b) => b.performanceScore - a.performanceScore);
    const topPerformers = leaderboard.slice(0, parseInt(limit));
    
    res.json(topPerformers);
  } catch (error) {
    console.error('[workforce] Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * POST /api/workforce/performance/record
 * Record worker performance
 */
router.post('/performance/record', authGuard, permissionGuard('WORKFORCE_MANAGE'), async (req, res) => {
  try {
    const {
      workerId,
      projectId,
      stationId,
      date,
      shiftId,
      shiftType,
      hoursWorked,
      tasksCompleted,
      targetQty,
      actualQty,
      rejectedQty,
    } = req.body;
    
    if (!workerId || !projectId || !stationId || !date) {
      return res.status(400).json({ 
        error: 'Worker ID, project ID, station ID, and date are required' 
      });
    }
    
    // Calculate metrics
    const efficiency = targetQty > 0 ? (actualQty / targetQty) * 100 : 0;
    const qualityRate = actualQty > 0 ? ((actualQty - rejectedQty) / actualQty) * 100 : 0;
    
    const performance = await prisma.workerPerformance.create({
      data: {
        id: `PRF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workerId,
        projectId: parseInt(projectId),
        stationId: parseInt(stationId),
        date: new Date(date),
        shiftId: shiftId || `SHIFT-${Date.now()}`,
        shiftType,
        hoursWorked: hoursWorked ? parseFloat(hoursWorked) : null,
        tasksCompleted: tasksCompleted ? parseInt(tasksCompleted) : null,
        targetQty: parseInt(targetQty) || 0,
        actualQty: parseInt(actualQty) || 0,
        rejectedQty: parseInt(rejectedQty) || 0,
        efficiency,
        qualityRate,
      },
    });
    
    console.log(`[workforce] Performance recorded for worker ${workerId} by ${req.user.email}`);
    res.status(201).json(performance);
  } catch (error) {
    console.error('[workforce] Error recording performance:', error);
    res.status(500).json({ error: 'Failed to record performance' });
  }
});

/**
 * GET /api/workforce/performance/:workerId
 * Get worker performance history
 */
router.get('/performance/:workerId', authGuard, async (req, res) => {
  try {
    const { days = 30, projectId } = req.query;
    
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));
    
    const where = { 
      workerId: req.params.workerId,
      date: { gte: dateFrom },
    };
    if (projectId) where.projectId = parseInt(projectId);
    
    const performance = await prisma.workerPerformance.findMany({
      where,
      include: {
        Project: { select: { id: true, name: true } },
        Station: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
    
    res.json(performance);
  } catch (error) {
    console.error('[workforce] Error fetching performance:', error);
    res.status(500).json({ error: 'Failed to fetch performance' });
  }
});

// ============================================================================
// PROVIDER PERFORMANCE
// ============================================================================

/**
 * GET /api/workforce/provider-performance
 * Get provider performance metrics
 */
router.get('/provider-performance', authGuard, async (req, res) => {
  try {
    const { providerId, months = 6 } = req.query;
    
    const where = {};
    if (providerId) where.providerId = providerId;
    
    const performance = await prisma.providerPerformance.findMany({
      where,
      include: {
        ThirdPartyProvider: { select: { id: true, name: true } },
      },
      orderBy: { monthYear: 'desc' },
      take: parseInt(months),
    });
    
    res.json(performance);
  } catch (error) {
    console.error('[workforce] Error fetching provider performance:', error);
    res.status(500).json({ error: 'Failed to fetch provider performance' });
  }
});

/**
 * POST /api/workforce/provider-performance
 * Record provider monthly performance
 */
router.post('/provider-performance', authGuard, permissionGuard('WORKFORCE_MANAGE'), async (req, res) => {
  try {
    const {
      providerId,
      monthYear,
      totalWorkers,
      avgAttendance,
      stabilityScore,
      qualityScore,
      incidents,
    } = req.body;
    
    if (!providerId || !monthYear) {
      return res.status(400).json({ error: 'Provider ID and month/year are required' });
    }
    
    const performance = await prisma.providerPerformance.create({
      data: {
        id: `PPF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        providerId,
        monthYear,
        totalWorkers: parseInt(totalWorkers) || 0,
        avgAttendance: parseFloat(avgAttendance) || 0,
        stabilityScore: parseFloat(stabilityScore) || 0,
        qualityScore: parseFloat(qualityScore) || 0,
        incidents: parseInt(incidents) || 0,
        updatedAt: new Date(),
      },
    });
    
    console.log(`[workforce] Provider performance recorded for ${providerId} by ${req.user.email}`);
    res.status(201).json(performance);
  } catch (error) {
    console.error('[workforce] Error recording provider performance:', error);
    res.status(500).json({ error: 'Failed to record provider performance' });
  }
});

// ============================================================================
// DASHBOARD / SUMMARY
// ============================================================================

/**
 * GET /api/workforce/dashboard
 * Get workforce dashboard summary
 */
router.get('/dashboard', authGuard, async (req, res) => {
  try {
    const [
      totalWorkers,
      activeWorkers,
      companyWorkers,
      contractorWorkers,
      totalProviders,
      activeProviders,
    ] = await Promise.all([
      prisma.worker.count(),
      prisma.worker.count({ where: { status: 'active' } }),
      prisma.worker.count({ where: { workerType: 'company', status: 'active' } }),
      prisma.worker.count({ where: { workerType: 'contractor', status: 'active' } }),
      prisma.thirdPartyProvider.count(),
      prisma.thirdPartyProvider.count({ where: { active: true } }),
    ]);
    
    // Recent performance (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentPerformance = await prisma.workerPerformance.findMany({
      where: { date: { gte: sevenDaysAgo } },
    });
    
    const avgEfficiency = recentPerformance.length > 0
      ? recentPerformance.reduce((sum, p) => sum + p.efficiency, 0) / recentPerformance.length
      : 0;
      
    const avgQuality = recentPerformance.length > 0
      ? recentPerformance.reduce((sum, p) => sum + p.qualityRate, 0) / recentPerformance.length
      : 0;
    
    res.json({
      workers: {
        total: totalWorkers,
        active: activeWorkers,
        company: companyWorkers,
        contractor: contractorWorkers,
      },
      providers: {
        total: totalProviders,
        active: activeProviders,
      },
      recentPerformance: {
        avgEfficiency: Math.round(avgEfficiency * 10) / 10,
        avgQuality: Math.round(avgQuality * 10) / 10,
        recordCount: recentPerformance.length,
      },
    });
  } catch (error) {
    console.error('[workforce] Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;
