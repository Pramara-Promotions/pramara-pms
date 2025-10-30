const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate: requireAuth } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

// GET /api/process-config - List all process configurations
router.get('/', async (req, res) => {
  try {
    const { stationId, projectId, stationType } = req.query;
    
    const where = {};
    if (stationId) where.stationId = parseInt(stationId);
    if (projectId) where.projectId = parseInt(projectId);
    if (stationType) where.stationType = stationType;
    
    const configs = await prisma.processConfig.findMany({
      where,
      include: {
        Station: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        Project: {
          select: {
            id: true
          }
        },
        ProjectSku: {
          select: {
            id: true,
            code: true,
            name: true
          }
        }
      }
    });
    
    res.json({ configs });
  } catch (error) {
    console.error('Error fetching process configs:', error);
    res.status(500).json({ error: 'Failed to fetch process configurations' });
  }
});

// GET /api/process-config/:id - Get single configuration
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const config = await prisma.processConfig.findUnique({
      where: { id },
      include: {
        Station: true,
        Project: true,
        Sku: true,
        calculations: {
          orderBy: { calculatedAt: 'desc' },
          take: 10
        }
      }
    });
    
    if (!config) {
      return res.status(404).json({ error: 'Process configuration not found' });
    }
    
    res.json({ config });
  } catch (error) {
    console.error('Error fetching process config:', error);
    res.status(500).json({ error: 'Failed to fetch process configuration' });
  }
});

// POST /api/process-config - Create process configuration
router.post('/', async (req, res) => {
  try {
    const {
      stationId,
      stationType,
      projectId,
      projectSkuId,
      // Molding
      cycleTimeSec,
      cavities,
      itemWeightGrams,
      runnerWeightGrams,
      setupTimeMins,
      // Painting/Printing
      paintPerUnitMl,
      thinnerPerUnitMl,
      dryingTimeSec,
      maskingSteps,
      // Assembly
      partsPerUnit,
      assemblyTimeSec,
      // General
      scrapRate,
      machineCapacity,
      // Alternate field names from tests
      processType,
      setupTime,
      cycleTimePerUnit
    } = req.body;
    
    // Resolve and validate
    const resolvedStationType = stationType || processType;
    if (!stationId || !resolvedStationType) {
      return res.status(400).json({ error: 'Station ID and station type are required' });
    }
    
    const config = await prisma.processConfig.create({
      data: {
        id: require('crypto').randomUUID(),
        stationId: parseInt(stationId),
        stationType: resolvedStationType,
        projectId: projectId ? parseInt(projectId) : null,
        projectSkuId: projectSkuId ? parseInt(projectSkuId) : null,
        // Molding
        cycleTimeSec: cycleTimeSec ?? cycleTimePerUnit ?? null,
        cavities: cavities ?? null,
        itemWeightGrams: itemWeightGrams ?? null,
        runnerWeightGrams: runnerWeightGrams ?? null,
        setupTimeMins: setupTimeMins ?? setupTime ?? null,
        // Painting/Printing
        paintPerUnitMl: paintPerUnitMl ?? null,
        thinnerPerUnitMl: thinnerPerUnitMl ?? null,
        dryingTimeSec: dryingTimeSec ?? null,
        maskingSteps: maskingSteps ?? null,
        // Assembly
        partsPerUnit: partsPerUnit ?? null,
        assemblyTimeSec: assemblyTimeSec ?? null,
        // General
        scrapRate: scrapRate ?? 0.02,
        machineCapacity: machineCapacity ?? 1,
        updatedAt: new Date()
      },
      include: {
        Station: true,
        Project: true,
        ProjectSku: true
      }
    });
    
    res.status(201).json(config);
  } catch (error) {
    console.error('Error creating process config:', error);
    res.status(500).json({ error: 'Failed to create process configuration' });
  }
});

// PUT /api/process-config/:id - Update configuration
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {};
    
    // Only update provided fields
    const fields = [
      'cycleTimeSec', 'cavities', 'itemWeightGrams', 'runnerWeightGrams', 'setupTimeMins',
      'paintPerUnitMl', 'thinnerPerUnitMl', 'dryingTimeSec', 'maskingSteps',
      'partsPerUnit', 'assemblyTimeSec', 'scrapRate', 'machineCapacity'
    ];
    
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });
    
    const config = await prisma.processConfig.update({
      where: { id },
      data: updateData,
      include: {
        Station: true,
        Project: true,
        ProjectSku: true
      }
    });
    
    res.json({ config });
  } catch (error) {
    console.error('Error updating process config:', error);
    res.status(500).json({ error: 'Failed to update process configuration' });
  }
});

// DELETE /api/process-config/:id - Delete configuration
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.processConfig.delete({
      where: { id }
    });
    
    res.json({ message: 'Process configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting process config:', error);
    res.status(500).json({ error: 'Failed to delete process configuration' });
  }
});

// POST /api/process-config/:id/calculate - Calculate production metrics
router.post('/:id/calculate', async (req, res) => {
  try {
    const { id } = req.params;
    const { targetQty, shiftHours } = req.body;
    
    if (!targetQty) {
      return res.status(400).json({ error: 'Target quantity is required' });
    }
    
    const config = await prisma.processConfig.findUnique({
      where: { id },
      include: { Station: true }
    });
    
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    // Calculate based on station type
    let outputPerHour = 0;
    let materialConsumption = {};
    
    if (config.stationType === 'molding' && config.cycleTimeSec && config.cavities) {
      // Output per hour = (3600 / cycleTime) × cavities × (1 - scrapRate)
      outputPerHour = (3600 / config.cycleTimeSec) * config.cavities * (1 - (config.scrapRate || 0));
      
      // Material consumption (kg)
      if (config.itemWeightGrams && config.runnerWeightGrams) {
        const totalWeightPerCycle = (config.itemWeightGrams + config.runnerWeightGrams) * config.cavities;
        materialConsumption.resin = (totalWeightPerCycle * targetQty / config.cavities) / 1000; // kg
      }
    } else if ((config.stationType === 'spray_painting' || config.stationType === 'pad_printing') && config.dryingTimeSec) {
      // Simple time-based calculation
      const cycleTime = config.dryingTimeSec + (config.maskingSteps || 0) * 60; // Add masking time
      outputPerHour = (3600 / cycleTime) * (1 - (config.scrapRate || 0));
      
      // Material consumption (liters)
      if (config.paintPerUnitMl) {
        materialConsumption.paint = (config.paintPerUnitMl * targetQty) / 1000; // liters
      }
      if (config.thinnerPerUnitMl) {
        materialConsumption.thinner = (config.thinnerPerUnitMl * targetQty) / 1000; // liters
      }
    } else if (config.stationType === 'assembly' && config.assemblyTimeSec) {
      outputPerHour = (3600 / config.assemblyTimeSec) * (1 - (config.scrapRate || 0));
      materialConsumption.parts = (config.partsPerUnit || 0) * targetQty;
    }
    
    const hours = shiftHours || 8;
    const outputPerShift = outputPerHour * hours;
    const outputPerDay = outputPerShift * (24 / hours); // Assuming 24-hour operation
    
    const totalTimeRequired = targetQty / outputPerHour; // hours
    const machinesRequired = Math.ceil(totalTimeRequired / hours);
    const shiftsRequired = Math.ceil(totalTimeRequired / hours);
    
    // Store calculation
    const calculation = await prisma.productionCalculation.create({
      data: {
        projectId: config.projectId,
        stationId: config.stationId,
        processConfigId: config.id,
        targetQty,
        outputPerHour,
        outputPerShift,
        outputPerDay,
        totalTimeRequired,
        machinesRequired,
        shiftsRequired,
        materialConsumption
      }
    });
    
    res.json({
      calculation,
      metrics: {
        outputPerHour: outputPerHour.toFixed(2),
        outputPerShift: outputPerShift.toFixed(2),
        outputPerDay: outputPerDay.toFixed(2),
        totalTimeRequired: totalTimeRequired.toFixed(2),
        machinesRequired,
        shiftsRequired,
        materialConsumption
      }
    });
  } catch (error) {
    console.error('Error calculating production metrics:', error);
    res.status(500).json({ error: 'Failed to calculate production metrics' });
  }
});

// GET /api/process-config/station/:stationId/capacity - Get station capacity
router.get('/station/:stationId/capacity', async (req, res) => {
  try {
    const { stationId } = req.params;
    const { date } = req.query;
    
    // Get all configurations for this station
    const configs = await prisma.processConfig.findMany({
      where: { stationId: parseInt(stationId) },
      include: {
        calculations: {
          where: date ? {
            calculatedAt: {
              gte: new Date(date)
            }
          } : undefined,
          orderBy: { calculatedAt: 'desc' },
          take: 1
        }
      }
    });
    
    // Calculate available capacity
    const station = await prisma.station.findUnique({
      where: { id: parseInt(stationId) }
    });
    
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }
    
    // For simplicity, assuming 8-hour shifts, 3 shifts per day
    const dailyHours = 24;
    const machineCount = station.capacity || 1;
    
    res.json({
      stationId: parseInt(stationId),
      stationCode: station.code,
      stationName: station.name,
      machineCount,
      dailyHours,
      totalCapacityHours: dailyHours * machineCount,
      configurations: configs.length,
      recentCalculations: configs.map(c => c.calculations[0]).filter(Boolean)
    });
  } catch (error) {
    console.error('Error fetching station capacity:', error);
    res.status(500).json({ error: 'Failed to fetch station capacity' });
  }
});

module.exports = router;
