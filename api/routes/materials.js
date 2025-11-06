const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

router.use(requireAuth);

// GET /api/materials/alerts/summary - Get material alerts
// MUST be before /:id route to avoid treating "alerts" as an ID
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

// GET /api/materials/dashboard/summary - Dashboard summary
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

// ============================================================================
// MATERIAL WORKFLOW CUSTOMIZATION (Q8)
// Per-project material sourcing with customizable workflow and saved fields
// ============================================================================

/**
 * GET /api/materials/workflow-config/:projectId
 * Get custom workflow configuration for a project's material sourcing
 */
router.get('/workflow-config/:projectId', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    // Check if project has custom workflow config
    const config = await prisma.systemSetting.findUnique({
      where: { key: `material_workflow_${projectId}` }
    });
    
    if (!config) {
      // Return default workflow
      return res.json({
        projectId,
        hasCustomWorkflow: false,
        workflow: {
          stages: [
            { id: 'request', name: 'Material Request', order: 1, required: true, fields: ['quantity', 'material'] },
            { id: 'approval', name: 'Approval', order: 2, required: true, fields: ['approver', 'approvalDate'] },
            { id: 'sourcing', name: 'Sourcing', order: 3, required: true, fields: ['supplier', 'quotation'] },
            { id: 'ordering', name: 'Ordering', order: 4, required: true, fields: ['poNumber', 'orderDate'] },
            { id: 'receiving', name: 'Receiving', order: 5, required: true, fields: ['receivedQty', 'receivedDate'] }
          ],
          customFields: []
        }
      });
    }
    
    res.json({
      projectId,
      hasCustomWorkflow: true,
      workflow: config.value,
      updatedAt: config.updatedAt,
      updatedBy: config.updatedBy
    });
    
  } catch (error) {
    console.error('[materials] Error fetching workflow config:', error);
    res.status(500).json({ error: 'Failed to fetch workflow configuration' });
  }
});

/**
 * PUT /api/materials/workflow-config/:projectId
 * Update custom workflow configuration for a project
 */
router.put('/workflow-config/:projectId', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { stages, customFields } = req.body;
    
    if (!stages || !Array.isArray(stages)) {
      return res.status(400).json({ error: 'Stages array is required' });
    }
    
    // Validate stages
    const requiredStages = ['request', 'approval', 'sourcing', 'ordering', 'receiving'];
    const stageIds = stages.map(s => s.id);
    const missingRequired = requiredStages.filter(r => !stageIds.includes(r));
    
    if (missingRequired.length > 0) {
      return res.status(400).json({ 
        error: `Missing required stages: ${missingRequired.join(', ')}` 
      });
    }
    
    // Save workflow config
    const config = await prisma.systemSetting.upsert({
      where: { key: `material_workflow_${projectId}` },
      update: {
        value: {
          stages,
          customFields: customFields || [],
          lastModified: new Date().toISOString()
        },
        updatedBy: req.user?.id || 'system'
      },
      create: {
        key: `material_workflow_${projectId}`,
        value: {
          stages,
          customFields: customFields || [],
          created: new Date().toISOString()
        },
        updatedBy: req.user?.id || 'system'
      }
    });
    
    res.json({
      message: 'Workflow configuration saved successfully',
      projectId,
      workflow: config.value
    });
    
  } catch (error) {
    console.error('[materials] Error saving workflow config:', error);
    res.status(500).json({ error: 'Failed to save workflow configuration' });
  }
});

/**
 * POST /api/materials/sourcing/:projectId
 * Create a new material sourcing request with custom workflow
 */
router.post('/sourcing/:projectId', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const {
      materialId,
      quantity,
      requiredBy,
      customFieldData = {}
    } = req.body;
    
    if (!materialId || !quantity) {
      return res.status(400).json({ error: 'Material ID and quantity are required' });
    }
    
    // Get workflow config
    const configKey = `material_workflow_${projectId}`;
    const config = await prisma.systemSetting.findUnique({
      where: { key: configKey }
    });
    
    const workflow = config?.value || {
      stages: [
        { id: 'request', name: 'Material Request', order: 1, required: true },
        { id: 'approval', name: 'Approval', order: 2, required: true },
        { id: 'sourcing', name: 'Sourcing', order: 3, required: true },
        { id: 'ordering', name: 'Ordering', order: 4, required: true },
        { id: 'receiving', name: 'Receiving', order: 5, required: true }
      ],
      customFields: []
    };
    
    // Create sourcing request (using SystemSetting as storage for now)
    // In production, you'd create a MaterialSourcingRequest model
    const requestId = `MAT_${projectId}_${Date.now()}`;
    const requestKey = `material_sourcing_${requestId}`;
    
    await prisma.systemSetting.create({
      data: {
        key: requestKey,
        value: {
          requestId,
          projectId,
          materialId,
          quantity,
          requiredBy,
          customFieldData,
          currentStage: 'request',
          status: 'pending',
          workflow: workflow.stages,
          history: [
            {
              stage: 'request',
              timestamp: new Date().toISOString(),
              userId: req.user?.id || 'system',
              action: 'created'
            }
          ],
          createdAt: new Date().toISOString(),
          createdBy: req.user?.id || 'system'
        },
        updatedBy: req.user?.id || 'system'
      }
    });
    
    // Get material name for response
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      select: { name: true, unit: true }
    });
    
    res.status(201).json({
      requestId,
      projectId,
      material: material?.name,
      quantity,
      unit: material?.unit,
      currentStage: 'request',
      status: 'pending',
      message: 'Sourcing request created successfully'
    });
    
  } catch (error) {
    console.error('[materials] Error creating sourcing request:', error);
    res.status(500).json({ error: 'Failed to create sourcing request' });
  }
});

/**
 * PUT /api/materials/sourcing/:requestId/advance
 * Advance sourcing request to next workflow stage
 */
router.put('/sourcing/:requestId/advance', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { stageData = {} } = req.body;
    
    const requestKey = `material_sourcing_${requestId}`;
    const setting = await prisma.systemSetting.findUnique({
      where: { key: requestKey }
    });
    
    if (!setting) {
      return res.status(404).json({ error: 'Sourcing request not found' });
    }
    
    const request = setting.value;
    const currentStageIndex = request.workflow.findIndex(s => s.id === request.currentStage);
    
    if (currentStageIndex === -1) {
      return res.status(400).json({ error: 'Invalid current stage' });
    }
    
    const nextStage = request.workflow[currentStageIndex + 1];
    
    if (!nextStage) {
      return res.status(400).json({ error: 'Already at final stage' });
    }
    
    // Update request
    const updatedRequest = {
      ...request,
      currentStage: nextStage.id,
      status: nextStage.id === 'receiving' ? 'receiving' : 'in_progress',
      [`${request.currentStage}Data`]: stageData,
      history: [
        ...request.history,
        {
          stage: nextStage.id,
          timestamp: new Date().toISOString(),
          userId: req.user?.id || 'system',
          action: 'advanced',
          data: stageData
        }
      ],
      lastUpdated: new Date().toISOString()
    };
    
    await prisma.systemSetting.update({
      where: { key: requestKey },
      data: {
        value: updatedRequest,
        updatedBy: req.user?.id || 'system'
      }
    });
    
    res.json({
      requestId,
      currentStage: nextStage.id,
      stageName: nextStage.name,
      status: updatedRequest.status,
      message: `Advanced to ${nextStage.name}`
    });
    
  } catch (error) {
    console.error('[materials] Error advancing sourcing request:', error);
    res.status(500).json({ error: 'Failed to advance sourcing request' });
  }
});

/**
 * GET /api/materials/sourcing/:projectId
 * Get all sourcing requests for a project
 */
router.get('/sourcing/:projectId', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    // Get all sourcing requests for this project
    // Pattern: material_sourcing_MAT_{projectId}_*
    const allSettings = await prisma.systemSetting.findMany({
      where: {
        key: {
          startsWith: `material_sourcing_MAT_${projectId}_`
        }
      }
    });
    
    const requests = allSettings.map(setting => ({
      requestId: setting.value.requestId,
      materialId: setting.value.materialId,
      quantity: setting.value.quantity,
      currentStage: setting.value.currentStage,
      status: setting.value.status,
      createdAt: setting.value.createdAt,
      createdBy: setting.value.createdBy,
      lastUpdated: setting.value.lastUpdated
    }));
    
    res.json(requests);
    
  } catch (error) {
    console.error('[materials] Error fetching sourcing requests:', error);
    res.status(500).json({ error: 'Failed to fetch sourcing requests' });
  }
});

module.exports = router;

