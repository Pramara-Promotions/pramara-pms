const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(requireAuth);

// GET /api/daily-plans - List daily plans
router.get('/', async (req, res) => {
  try {
    const { projectId, date, status } = req.query;
    
    const where = {};
    if (projectId) where.projectId = projectId;
    if (date) where.date = new Date(date);
    if (status) where.status = status;
    
    const plans = await prisma.dailyPlan.findMany({
      where,
      include: {
        Project: {
          select: {
            id: true,
            projectCode: true,
            projectName: true
          }
        },
        stations: {
          include: {
            Station: {
              select: { code: true, name: true }
            },
            Worker: {
              select: { id: true, name: true }
            }
          }
        },
        _count: {
          select: {
            stations: true,
            adaptations: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    
    res.json({ plans });
  } catch (error) {
    console.error('Error fetching daily plans:', error);
    res.status(500).json({ error: 'Failed to fetch daily plans' });
  }
});

// GET /api/daily-plans/:id - Get single plan
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const plan = await prisma.dailyPlan.findUnique({
      where: { id },
      include: {
        Project: true,
        stations: {
          include: {
            Station: true,
            Worker: true,
            materialReservations: {
              include: {
                Material: {
                  select: { name: true, unit: true, stockQty: true }
                }
              }
            }
          }
        },
        adaptations: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });
    
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    res.json({ plan });
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

// POST /api/daily-plans/generate - Generate 3 scenario plans
router.post('/generate', async (req, res) => {
  try {
    const { projectId, date, targetQty } = req.body;
    
    if (!projectId || !date || !targetQty) {
      return res.status(400).json({ error: 'Project ID, date, and target quantity are required' });
    }
    
    const planDate = new Date(date);
    
    // Get project and stations
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        stations: {
          include: {
            Station: true,
            ProcessConfig: true
          }
        }
      }
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Get available workers
    const workers = await prisma.worker.findMany({
      where: { status: 'active' },
      include: {
        Provider: {
          select: { hourlyRate: true, stabilityScore: true }
        },
        performance: {
          where: {
            date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        }
      }
    });
    
    // Generate 3 scenarios
    const scenarios = [];
    
    // Scenario 1: Fastest (most workers, highest performers)
    const fastest = await generateScenario('fastest', project, planDate, targetQty, workers);
    scenarios.push(fastest);
    
    // Scenario 2: Cheapest (minimum workers, company workers preferred)
    const cheapest = await generateScenario('cheapest', project, planDate, targetQty, workers);
    scenarios.push(cheapest);
    
    // Scenario 3: Balanced (optimal mix)
    const balanced = await generateScenario('balanced', project, planDate, targetQty, workers);
    scenarios.push(balanced);
    
    res.json({ scenarios });
  } catch (error) {
    console.error('Error generating plans:', error);
    res.status(500).json({ error: 'Failed to generate plans' });
  }
});

// Helper function to generate a scenario
async function generateScenario(scenarioType, project, date, targetQty, workers) {
  const stations = [];
  let totalCost = 0;
  let estimatedDuration = 0;
  let riskScore = 0;
  
  for (const projectStation of project.stations) {
    const station = projectStation.Station;
    const config = projectStation.ProcessConfig;
    
    // Calculate requirements
    const outputPerHour = config?.outputPerHour || 100;
    const hoursNeeded = targetQty / outputPerHour;
    
    let workersNeeded = 1;
    let selectedWorkers = [];
    
    if (scenarioType === 'fastest') {
      // Maximum workers, fastest performers
      workersNeeded = Math.ceil(hoursNeeded / 8); // Parallel work
      const topPerformers = workers
        .filter(w => w.skills.some(s => station.requiredSkills?.includes(s)))
        .sort((a, b) => {
          const avgA = a.performance.reduce((s, p) => s + p.efficiency, 0) / (a.performance.length || 1);
          const avgB = b.performance.reduce((s, p) => s + p.efficiency, 0) / (b.performance.length || 1);
          return avgB - avgA;
        })
        .slice(0, workersNeeded);
      
      selectedWorkers = topPerformers.map(w => ({
        workerId: w.id,
        workerName: w.name,
        assignedQty: Math.ceil(targetQty / topPerformers.length),
        reason: `High performer (${w.performance.length > 0 ? (w.performance[0].efficiency).toFixed(0) : 'N/A'}% efficiency)`
      }));
      
      const costPerWorker = topPerformers[0]?.hourlyRate || 15;
      totalCost += costPerWorker * hoursNeeded;
      estimatedDuration = Math.max(estimatedDuration, hoursNeeded / workersNeeded);
      
    } else if (scenarioType === 'cheapest') {
      // Minimum workers, company workers only
      workersNeeded = 1;
      const companyWorkers = workers
        .filter(w => w.workerType === 'company' && w.skills.some(s => station.requiredSkills?.includes(s)))
        .sort((a, b) => (a.hourlyRate || 0) - (b.hourlyRate || 0))
        .slice(0, 1);
      
      selectedWorkers = companyWorkers.map(w => ({
        workerId: w.id,
        workerName: w.name,
        assignedQty: targetQty,
        reason: 'Company worker, lowest cost'
      }));
      
      const costPerWorker = companyWorkers[0]?.hourlyRate || 12;
      totalCost += costPerWorker * hoursNeeded;
      estimatedDuration = Math.max(estimatedDuration, hoursNeeded);
      riskScore += 20; // Higher risk with fewer workers
      
    } else {
      // Balanced: Mix of company and third party
      workersNeeded = Math.ceil(hoursNeeded / 16); // 2 shifts worth
      const balancedWorkers = workers
        .filter(w => w.skills.some(s => station.requiredSkills?.includes(s)))
        .sort((a, b) => {
          // Score based on efficiency and cost
          const scoreA = (a.performance[0]?.efficiency || 80) / (a.hourlyRate || 15);
          const scoreB = (b.performance[0]?.efficiency || 80) / (b.hourlyRate || 15);
          return scoreB - scoreA;
        })
        .slice(0, workersNeeded);
      
      selectedWorkers = balancedWorkers.map(w => ({
        workerId: w.id,
        workerName: w.name,
        assignedQty: Math.ceil(targetQty / balancedWorkers.length),
        reason: 'Optimal efficiency/cost ratio'
      }));
      
      const avgCost = balancedWorkers.reduce((s, w) => s + (w.hourlyRate || 13), 0) / balancedWorkers.length;
      totalCost += avgCost * hoursNeeded;
      estimatedDuration = Math.max(estimatedDuration, hoursNeeded / workersNeeded);
      riskScore += 10;
    }
    
    stations.push({
      stationId: station.id,
      stationName: station.name,
      targetQty,
      workersNeeded,
      suggestedWorkers: selectedWorkers,
      hoursEstimated: hoursNeeded
    });
  }
  
  return {
    scenarioType,
    projectId: project.id,
    date,
    targetQty,
    stations,
    totalCost: totalCost.toFixed(2),
    estimatedDuration: estimatedDuration.toFixed(2),
    riskScore
  };
}

// POST /api/daily-plans - Create plan from scenario
router.post('/', async (req, res) => {
  try {
    const {
      projectId,
      date,
      targetQty,
      scenarioType,
      stations,
      notes
    } = req.body;
    
    if (!projectId || !date || !targetQty || !stations) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate materials availability
    const materialValidation = await validateMaterials(projectId, targetQty);
    if (!materialValidation.valid) {
      return res.status(400).json({ 
        error: 'Insufficient materials', 
        details: materialValidation.missing 
      });
    }
    
    // Create plan
    const plan = await prisma.dailyPlan.create({
      data: {
        projectId,
        date: new Date(date),
        targetQty,
        scenarioType: scenarioType || 'balanced',
        notes: notes || null,
        status: 'draft',
        stations: {
          create: stations.map(s => ({
            stationId: s.stationId,
            targetQty: s.targetQty,
            workerId: s.workerId || null,
            assignmentReason: s.assignmentReason || null
          }))
        }
      },
      include: {
        stations: {
          include: {
            Station: true,
            Worker: true
          }
        }
      }
    });
    
    // Reserve materials
    if (materialValidation.reservations) {
      for (const reservation of materialValidation.reservations) {
        await prisma.materialReservation.create({
          data: {
            materialId: reservation.materialId,
            reservedQty: reservation.qty,
            reservedFor: plan.date,
            status: 'active',
            dailyPlanStationId: plan.stations.find(s => s.stationId === reservation.stationId)?.id
          }
        });
        
        // Update material reserved quantity
        await prisma.material.update({
          where: { id: reservation.materialId },
          data: {
            reservedQty: { increment: reservation.qty }
          }
        });
      }
    }
    
    res.status(201).json({ plan });
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// Helper function to validate materials
async function validateMaterials(projectId, targetQty) {
  // Get project SKUs with BOM
  const skus = await prisma.projectSku.findMany({
    where: { projectId },
    include: {
      bomItems: {
        include: {
          Material: true
        }
      }
    }
  });
  
  const missing = [];
  const reservations = [];
  
  for (const sku of skus) {
    for (const bomItem of sku.bomItems) {
      const required = bomItem.quantity * targetQty;
      const material = bomItem.Material;
      const available = material.stockQty - material.reservedQty;
      
      if (available < required) {
        missing.push({
          materialName: material.name,
          required,
          available,
          shortfall: required - available
        });
      } else {
        reservations.push({
          materialId: material.id,
          qty: required,
          stationId: bomItem.stationId
        });
      }
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
    reservations
  };
}

// PUT /api/daily-plans/:id/approve - Approve plan
router.put('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;
    
    const plan = await prisma.dailyPlan.update({
      where: { id },
      data: {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: approvedBy || req.user.userId
      },
      include: {
        stations: {
          include: {
            Station: true,
            Worker: true
          }
        }
      }
    });
    
    res.json({ plan });
  } catch (error) {
    console.error('Error approving plan:', error);
    res.status(500).json({ error: 'Failed to approve plan' });
  }
});

// POST /api/daily-plans/:id/adapt - Real-time adaptation
router.post('/:id/adapt', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      adaptationType,
      stationId,
      oldWorkerId,
      newWorkerId,
      oldQty,
      newQty,
      reason
    } = req.body;
    
    if (!adaptationType || !reason) {
      return res.status(400).json({ error: 'Adaptation type and reason are required' });
    }
    
    // Log adaptation
    const adaptation = await prisma.planAdaptation.create({
      data: {
        dailyPlanId: id,
        adaptationType,
        stationId: stationId || null,
        oldWorkerId: oldWorkerId || null,
        newWorkerId: newWorkerId || null,
        oldQty: oldQty || null,
        newQty: newQty || null,
        reason,
        timestamp: new Date(),
        adaptedBy: req.user.userId
      }
    });
    
    // Apply adaptation to plan
    if (adaptationType === 'worker_change' && stationId && newWorkerId) {
      await prisma.dailyPlanStation.updateMany({
        where: {
          dailyPlanId: id,
          stationId
        },
        data: {
          workerId: newWorkerId
        }
      });
    } else if (adaptationType === 'qty_change' && stationId && newQty) {
      await prisma.dailyPlanStation.updateMany({
        where: {
          dailyPlanId: id,
          stationId
        },
        data: {
          targetQty: newQty
        }
      });
      
      // Update parent plan
      await prisma.dailyPlan.update({
        where: { id },
        data: { targetQty: newQty }
      });
    }
    
    res.json({ adaptation });
  } catch (error) {
    console.error('Error adapting plan:', error);
    res.status(500).json({ error: 'Failed to adapt plan' });
  }
});

// GET /api/daily-plans/:id/adaptations - Get adaptation history
router.get('/:id/adaptations', async (req, res) => {
  try {
    const { id } = req.params;
    
    const adaptations = await prisma.planAdaptation.findMany({
      where: { dailyPlanId: id },
      include: {
        Station: {
          select: { code: true, name: true }
        },
        OldWorker: {
          select: { name: true }
        },
        NewWorker: {
          select: { name: true }
        }
      },
      orderBy: { timestamp: 'desc' }
    });
    
    res.json({ adaptations });
  } catch (error) {
    console.error('Error fetching adaptations:', error);
    res.status(500).json({ error: 'Failed to fetch adaptations' });
  }
});

// GET /api/daily-plans/dashboard/summary - Dashboard metrics
router.get('/dashboard/summary', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalPlans = await prisma.dailyPlan.count();
    
    const todayPlans = await prisma.dailyPlan.count({
      where: { date: today }
    });
    
    const byStatus = await prisma.dailyPlan.groupBy({
      by: ['status'],
      _count: true
    });
    
    const avgAdaptations = await prisma.planAdaptation.count() / totalPlans || 0;
    
    res.json({
      totalPlans,
      todayPlans,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      avgAdaptations: avgAdaptations.toFixed(2)
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

module.exports = router;
