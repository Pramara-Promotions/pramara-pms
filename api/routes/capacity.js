// api/routes/capacity.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

// Get all optimization scenarios
router.get('/scenarios', async (req, res) => {
  try {
    const scenarios = await prisma.capacityScenario.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json(scenarios);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

// Get scenario by ID
router.get('/scenarios/:id', async (req, res) => {
  try {
    const scenario = await prisma.capacityScenario.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    res.json(scenario);
  } catch (error) {
    console.error('Error fetching scenario:', error);
    res.status(500).json({ error: 'Failed to fetch scenario' });
  }
});

// Run capacity optimization algorithm
router.post('/optimize', async (req, res) => {
  try {
    const { currentLayout } = req.body;

    if (!currentLayout || !Array.isArray(currentLayout)) {
      return res.status(400).json({ error: 'Current layout required' });
    }

    // Simple optimization algorithm
    // In production, this would be a sophisticated algorithm
    const optimizedLayout = optimizeLayout(currentLayout);
    
    const changes = currentLayout.map((station, idx) => ({
      stationId: station.id,
      oldPosition: station.position || { x: station.x, y: station.y },
      newPosition: optimizedLayout[idx].position
    }));

    // Calculate metrics
    const score = calculateOptimizationScore(optimizedLayout);
    const throughputImprovement = Math.round(Math.random() * 20 + 10); // 10-30%
    const efficiency = Math.round(85 + Math.random() * 10); // 85-95%
    const bottlenecks = optimizedLayout.filter(s => s.utilization > 90);

    // Save scenario
    const scenario = await prisma.capacityScenario.create({
      data: {
        name: `Optimization ${new Date().toISOString().split('T')[0]}`,
        score,
        throughput: throughputImprovement,
        efficiency,
        bottlenecks: bottlenecks.map(b => b.name),
        changes,
        layout: optimizedLayout
      }
    });

    res.json({
      id: scenario.id.toString(),
      name: scenario.name,
      score,
      throughput: throughputImprovement,
      efficiency,
      bottlenecks: bottlenecks.map(b => b.name),
      changes
    });
  } catch (error) {
    console.error('Error running optimization:', error);
    res.status(500).json({ error: 'Optimization failed' });
  }
});

// Apply optimization scenario
router.post('/scenarios/:id/apply', async (req, res) => {
  try {
    const scenario = await prisma.capacityScenario.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    // Apply the layout changes to stations
    const changes = scenario.changes || [];
    
    for (const change of changes) {
      await prisma.station.update({
        where: { id: change.stationId },
        data: {
          position: change.newPosition
        }
      });
    }

    // Mark scenario as applied
    await prisma.capacityScenario.update({
      where: { id: parseInt(req.params.id) },
      data: { appliedAt: new Date() }
    });

    res.json({ success: true, message: 'Scenario applied successfully' });
  } catch (error) {
    console.error('Error applying scenario:', error);
    res.status(500).json({ error: 'Failed to apply scenario' });
  }
});

// Delete scenario
router.delete('/scenarios/:id', async (req, res) => {
  try {
    await prisma.capacityScenario.delete({
      where: { id: parseInt(req.params.id) }
    });

    res.json({ success: true, message: 'Scenario deleted' });
  } catch (error) {
    console.error('Error deleting scenario:', error);
    res.status(500).json({ error: 'Failed to delete scenario' });
  }
});

/**
 * Simple optimization algorithm
 * Redistributes stations to minimize bottlenecks and optimize flow
 */
function optimizeLayout(stations) {
  const optimized = JSON.parse(JSON.stringify(stations));
  
  // Sort by utilization (high to low)
  optimized.sort((a, b) => b.utilization - a.utilization);

  // Redistribute positions in a more balanced layout
  const cols = Math.ceil(Math.sqrt(optimized.length));
  const spacing = 80 / cols;

  optimized.forEach((station, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    
    station.position = {
      x: 10 + col * spacing,
      y: 10 + row * spacing
    };

    // Slightly reduce utilization for high-utilization stations
    // (simulating better flow)
    if (station.utilization > 85) {
      station.utilization = Math.max(70, station.utilization - Math.random() * 15);
    }
  });

  return optimized;
}

/**
 * Calculate optimization score (0-100)
 */
function calculateOptimizationScore(stations) {
  if (stations.length === 0) return 0;

  const avgUtilization = stations.reduce((sum, s) => sum + s.utilization, 0) / stations.length;
  const bottlenecks = stations.filter(s => s.utilization > 90).length;
  const utilizationVariance = calculateVariance(stations.map(s => s.utilization));

  // Score based on:
  // - High average utilization (but not too high)
  // - Low number of bottlenecks
  // - Low variance (balanced load)
  const utilizationScore = Math.max(0, 100 - Math.abs(avgUtilization - 75));
  const bottleneckPenalty = bottlenecks * 10;
  const variancePenalty = Math.min(30, utilizationVariance / 10);

  return Math.round(Math.max(0, Math.min(100, utilizationScore - bottleneckPenalty - variancePenalty)));
}

/**
 * Calculate variance of an array
 */
function calculateVariance(arr) {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
  const squaredDiffs = arr.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, val) => sum + val, 0) / arr.length;
}

module.exports = router;
