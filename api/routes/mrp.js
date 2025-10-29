const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(requireAuth);

// POST /api/mrp/calculate - Calculate MRP for project
router.post('/calculate', async (req, res) => {
  try {
    const {
      projectId,
      skuId,
      targetQty,
      lossType = 'project_wide',
      projectWideLoss = 0.05,
      stageSpecificLoss
    } = req.body;
    
    if (!projectId || !skuId || !targetQty) {
      return res.status(400).json({ error: 'Project ID, SKU ID, and target quantity are required' });
    }
    
    // Get SKU with BOM
    const sku = await prisma.projectSku.findUnique({
      where: { id: skuId },
      include: {
        bomItems: {
          include: {
            Material: true
          }
        }
      }
    });
    
    if (!sku) {
      return res.status(404).json({ error: 'SKU not found' });
    }
    
    // Calculate requirements
    const requirements = {};
    let totalCost = 0;
    
    for (const bomItem of sku.bomItems) {
      const material = bomItem.Material;
      const baseQty = bomItem.qtyPerUnit * targetQty;
      
      // Apply loss
      let loss = projectWideLoss;
      if (lossType === 'stage_specific' && stageSpecificLoss && bomItem.stage) {
        loss = stageSpecificLoss[bomItem.stage] || projectWideLoss;
      }
      
      // Check if we have learning data for this material
      const learningData = await prisma.mRPLearning.findMany({
        where: { materialId: material.id },
        orderBy: { productionDate: 'desc' },
        take: 30
      });
      
      // Calculate average actual loss from learning
      if (learningData.length > 0) {
        const avgActualLoss = learningData.reduce((sum, l) => sum + l.lossPercent, 0) / learningData.length;
        loss = avgActualLoss; // Use learned loss instead of estimate
      }
      
      const qtyWithLoss = baseQty * (1 + loss);
      const cost = qtyWithLoss * (material.costPerUnit || 0);
      
      requirements[material.id] = {
        materialId: material.id,
        materialName: material.name,
        baseQty,
        lossPercent: loss,
        qtyWithLoss,
        unit: bomItem.unit,
        stage: bomItem.stage,
        costPerUnit: material.costPerUnit,
        totalCost: cost,
        confidence: learningData.length > 0 ? Math.min(95, 50 + learningData.length * 1.5) : 50
      };
      
      totalCost += cost;
    }
    
    // Create MRP record
    const mrp = await prisma.materialRequirement.create({
      data: {
        projectId: parseInt(projectId),
        skuId,
        targetQty: parseInt(targetQty),
        lossType,
        projectWideLoss: lossType === 'project_wide' ? projectWideLoss : null,
        stageSpecificLoss: lossType === 'stage_specific' ? stageSpecificLoss : null,
        requirements,
        totalCost,
        predictedQty: requirements,
        generatedBy: req.user.userId
      },
      include: {
        Project: {
          select: { projectCode: true, projectName: true }
        },
        ProjectSku: {
          select: { skuCode: true, skuName: true }
        }
      }
    });
    
    res.json({ mrp, requirements });
  } catch (error) {
    console.error('Error calculating MRP:', error);
    res.status(500).json({ error: 'Failed to calculate MRP' });
  }
});

// GET /api/mrp/:projectId - Get MRP for project
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const mrps = await prisma.materialRequirement.findMany({
      where: { projectId: parseInt(projectId) },
      include: {
        Project: {
          select: { projectCode: true, projectName: true }
        },
        ProjectSku: {
          select: { skuCode: true, skuName: true }
        }
      },
      orderBy: { generatedAt: 'desc' }
    });
    
    res.json({ mrps });
  } catch (error) {
    console.error('Error fetching MRPs:', error);
    res.status(500).json({ error: 'Failed to fetch MRPs' });
  }
});

// GET /api/mrp/multi-project - Aggregate MRP across projects
router.get('/multi-project/aggregate', async (req, res) => {
  try {
    const { projectIds } = req.query;
    
    const where = {};
    if (projectIds) {
      where.projectId = { in: projectIds.split(',').map(id => parseInt(id)) };
    }
    
    const mrps = await prisma.materialRequirement.findMany({
      where,
      include: {
        Project: {
          select: { projectCode: true, projectName: true }
        }
      }
    });
    
    // Aggregate by material
    const aggregated = {};
    
    mrps.forEach(mrp => {
      const requirements = mrp.requirements;
      Object.keys(requirements).forEach(materialId => {
        const req = requirements[materialId];
        if (!aggregated[materialId]) {
          aggregated[materialId] = {
            materialId,
            materialName: req.materialName,
            totalQty: 0,
            totalCost: 0,
            unit: req.unit,
            projects: []
          };
        }
        aggregated[materialId].totalQty += req.qtyWithLoss;
        aggregated[materialId].totalCost += req.totalCost;
        aggregated[materialId].projects.push({
          projectCode: mrp.Project.projectCode,
          qty: req.qtyWithLoss
        });
      });
    });
    
    res.json({ aggregated: Object.values(aggregated) });
  } catch (error) {
    console.error('Error aggregating MRPs:', error);
    res.status(500).json({ error: 'Failed to aggregate MRPs' });
  }
});

// POST /api/mrp/bom - Create/update BOM item
router.post('/bom', async (req, res) => {
  try {
    const {
      skuId,
      materialId,
      qtyPerUnit,
      unit,
      stage,
      version = 1
    } = req.body;
    
    if (!skuId || !materialId || !qtyPerUnit || !unit) {
      return res.status(400).json({ error: 'SKU ID, Material ID, quantity, and unit are required' });
    }
    
    const bomItem = await prisma.bOMItem.create({
      data: {
        skuId,
        materialId,
        qtyPerUnit: parseFloat(qtyPerUnit),
        unit,
        stage: stage || null,
        version: parseInt(version)
      },
      include: {
        Material: true
      }
    });
    
    res.status(201).json({ bomItem });
  } catch (error) {
    console.error('Error creating BOM item:', error);
    res.status(500).json({ error: 'Failed to create BOM item' });
  }
});

// GET /api/mrp/bom/:skuId - Get BOM for SKU
router.get('/bom/:skuId', async (req, res) => {
  try {
    const { skuId } = req.params;
    
    const bomItems = await prisma.bOMItem.findMany({
      where: {
        skuId,
        active: true
      },
      include: {
        Material: true
      },
      orderBy: { stage: 'asc' }
    });
    
    res.json({ bomItems });
  } catch (error) {
    console.error('Error fetching BOM:', error);
    res.status(500).json({ error: 'Failed to fetch BOM' });
  }
});

// DELETE /api/mrp/bom/:id - Remove BOM item
router.delete('/bom/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.bOMItem.update({
      where: { id },
      data: { active: false }
    });
    
    res.json({ message: 'BOM item deactivated' });
  } catch (error) {
    console.error('Error removing BOM item:', error);
    res.status(500).json({ error: 'Failed to remove BOM item' });
  }
});

// POST /api/mrp/what-if - Run what-if scenario
router.post('/what-if', async (req, res) => {
  try {
    const {
      projectId,
      skuId,
      scenarios
    } = req.body;
    
    if (!scenarios || !Array.isArray(scenarios)) {
      return res.status(400).json({ error: 'Scenarios array is required' });
    }
    
    const sku = await prisma.projectSku.findUnique({
      where: { id: skuId },
      include: {
        bomItems: {
          include: { Material: true }
        }
      }
    });
    
    if (!sku) {
      return res.status(404).json({ error: 'SKU not found' });
    }
    
    const results = [];
    
    for (const scenario of scenarios) {
      const { targetQty, lossPercent } = scenario;
      const requirements = {};
      let totalCost = 0;
      
      for (const bomItem of sku.bomItems) {
        const baseQty = bomItem.qtyPerUnit * targetQty;
        const qtyWithLoss = baseQty * (1 + (lossPercent || 0.05));
        const cost = qtyWithLoss * (bomItem.Material.costPerUnit || 0);
        
        requirements[bomItem.Material.id] = {
          materialName: bomItem.Material.name,
          qtyWithLoss,
          cost
        };
        
        totalCost += cost;
      }
      
      results.push({
        scenario: scenario.name || 'Scenario',
        targetQty,
        lossPercent,
        requirements,
        totalCost
      });
    }
    
    res.json({ results });
  } catch (error) {
    console.error('Error running what-if:', error);
    res.status(500).json({ error: 'Failed to run what-if analysis' });
  }
});

// GET /api/mrp/availability-check - Check material availability
router.get('/availability-check', async (req, res) => {
  try {
    const { mrpId } = req.query;
    
    if (!mrpId) {
      return res.status(400).json({ error: 'MRP ID is required' });
    }
    
    const mrp = await prisma.materialRequirement.findUnique({
      where: { id: mrpId }
    });
    
    if (!mrp) {
      return res.status(404).json({ error: 'MRP not found' });
    }
    
    const requirements = mrp.requirements;
    const availability = [];
    
    for (const materialId of Object.keys(requirements)) {
      const req = requirements[materialId];
      const material = await prisma.material.findUnique({
        where: { id: materialId }
      });
      
      if (material) {
        const available = material.stockQty - material.reservedQty;
        const shortfall = Math.max(0, req.qtyWithLoss - available);
        
        availability.push({
          materialId,
          materialName: req.materialName,
          required: req.qtyWithLoss,
          available,
          shortfall,
          status: shortfall > 0 ? 'insufficient' : 'sufficient'
        });
      }
    }
    
    res.json({ availability });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// GET /api/mrp/learning/accuracy - MRP accuracy metrics
router.get('/learning/accuracy', async (req, res) => {
  try {
    const { days = 90 } = req.query;
    
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));
    
    const learningData = await prisma.mRPLearning.findMany({
      where: {
        productionDate: { gte: dateFrom }
      },
      include: {
        Material: {
          select: { name: true, type: true }
        }
      }
    });
    
    // Overall accuracy
    const overallAccuracy = learningData.length > 0
      ? learningData.reduce((sum, l) => sum + l.accuracy, 0) / learningData.length
      : 0;
    
    // By material type
    const byType = {};
    learningData.forEach(l => {
      const type = l.Material.type;
      if (!byType[type]) {
        byType[type] = { total: 0, count: 0 };
      }
      byType[type].total += l.accuracy;
      byType[type].count++;
    });
    
    const accuracyByType = {};
    Object.keys(byType).forEach(type => {
      accuracyByType[type] = (byType[type].total / byType[type].count).toFixed(2);
    });
    
    res.json({
      overallAccuracy: overallAccuracy.toFixed(2),
      byType: accuracyByType,
      totalDataPoints: learningData.length
    });
  } catch (error) {
    console.error('Error fetching accuracy:', error);
    res.status(500).json({ error: 'Failed to fetch accuracy metrics' });
  }
});

// GET /api/mrp/learning/waste-analysis - Waste/loss analysis
router.get('/learning/waste-analysis', async (req, res) => {
  try {
    const learningData = await prisma.mRPLearning.findMany({
      include: {
        Material: true,
        Station: true
      },
      orderBy: { lossPercent: 'desc' },
      take: 100
    });
    
    // Top high-loss stages
    const byStation = {};
    learningData.forEach(l => {
      if (l.Station) {
        if (!byStation[l.Station.name]) {
          byStation[l.Station.name] = { totalLoss: 0, count: 0 };
        }
        byStation[l.Station.name].totalLoss += l.lossPercent;
        byStation[l.Station.name].count++;
      }
    });
    
    const topLossStages = Object.keys(byStation)
      .map(station => ({
        station,
        avgLoss: (byStation[station].totalLoss / byStation[station].count).toFixed(2),
        count: byStation[station].count
      }))
      .sort((a, b) => parseFloat(b.avgLoss) - parseFloat(a.avgLoss))
      .slice(0, 5);
    
    // Total waste cost
    const totalWaste = learningData.reduce((sum, l) => {
      const wasteCost = (l.actualQty - l.estimatedQty) * (l.Material.costPerUnit || 0);
      return sum + Math.abs(wasteCost);
    }, 0);
    
    res.json({
      topLossStages,
      totalWasteCost: totalWaste.toFixed(2),
      avgLossPercent: (learningData.reduce((s, l) => s + l.lossPercent, 0) / learningData.length).toFixed(2)
    });
  } catch (error) {
    console.error('Error fetching waste analysis:', error);
    res.status(500).json({ error: 'Failed to fetch waste analysis' });
  }
});

// GET /api/mrp/learning/recommendations - System recommendations
router.get('/learning/recommendations', async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    
    const recommendations = await prisma.mRPRecommendation.findMany({
      where: status ? { status } : {},
      orderBy: [
        { confidence: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    res.json({ recommendations });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// POST /api/mrp/recommendations/:id/accept - Accept recommendation
router.post('/recommendations/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    
    const recommendation = await prisma.mRPRecommendation.update({
      where: { id },
      data: {
        status: 'accepted',
        acceptedBy: req.user.userId,
        acceptedAt: new Date()
      }
    });
    
    res.json({ recommendation });
  } catch (error) {
    console.error('Error accepting recommendation:', error);
    res.status(500).json({ error: 'Failed to accept recommendation' });
  }
});

// POST /api/mrp/recommendations/:id/reject - Reject recommendation
router.post('/recommendations/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const recommendation = await prisma.mRPRecommendation.update({
      where: { id },
      data: {
        status: 'rejected',
        outcome: reason || 'Rejected by user'
      }
    });
    
    res.json({ recommendation });
  } catch (error) {
    console.error('Error rejecting recommendation:', error);
    res.status(500).json({ error: 'Failed to reject recommendation' });
  }
});

// PUT /api/mrp/recommendations/:id/outcome - Log outcome
router.put('/recommendations/:id/outcome', async (req, res) => {
  try {
    const { id } = req.params;
    const { outcome } = req.body;
    
    const recommendation = await prisma.mRPRecommendation.update({
      where: { id },
      data: {
        status: 'implemented',
        outcome
      }
    });
    
    res.json({ recommendation });
  } catch (error) {
    console.error('Error logging outcome:', error);
    res.status(500).json({ error: 'Failed to log outcome' });
  }
});

// POST /api/mrp/learning/record - Manually log learning data
router.post('/learning/record', async (req, res) => {
  try {
    const {
      materialId,
      stationId,
      workerId,
      projectComplexity,
      estimatedQty,
      actualQty,
      productionDate,
      shiftType,
      notes
    } = req.body;
    
    if (!materialId || !estimatedQty || !actualQty) {
      return res.status(400).json({ error: 'Material ID, estimated quantity, and actual quantity are required' });
    }
    
    const lossPercent = Math.abs((actualQty - estimatedQty) / estimatedQty);
    const accuracy = Math.max(0, 100 - (lossPercent * 100));
    
    const learning = await prisma.mRPLearning.create({
      data: {
        materialId,
        stationId: stationId || null,
        workerId: workerId || null,
        projectComplexity: projectComplexity || null,
        estimatedQty: parseFloat(estimatedQty),
        actualQty: parseFloat(actualQty),
        lossPercent,
        accuracy,
        productionDate: productionDate ? new Date(productionDate) : new Date(),
        shiftType: shiftType || null,
        notes: notes || null
      }
    });
    
    // Update material average loss
    const allLearning = await prisma.mRPLearning.findMany({
      where: { materialId },
      orderBy: { productionDate: 'desc' },
      take: 30
    });
    
    const avgLoss = allLearning.reduce((s, l) => s + l.lossPercent, 0) / allLearning.length;
    
    await prisma.material.update({
      where: { id: materialId },
      data: { avgLossPercent: avgLoss }
    });
    
    res.status(201).json({ learning });
  } catch (error) {
    console.error('Error recording learning:', error);
    res.status(500).json({ error: 'Failed to record learning data' });
  }
});

module.exports = router;
