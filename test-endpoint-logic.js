/**
 * Test dashboard endpoint logic directly without HTTP
 */
const { PrismaClient } = require('@prisma/client');
const { calculateProjectHealth } = require('./api/lib/projectHealth');
const { subDays } = require('date-fns');
const prisma = new PrismaClient();

// Replicate the cache from dashboard.js
const healthCache = new Map();
const HEALTH_CACHE_TTL = 5 * 60 * 1000;

function getCachedHealth(projectId) {
  const cached = healthCache.get(projectId);
  if (cached && Date.now() - cached.timestamp < HEALTH_CACHE_TTL) {
    return cached.data;
  }
  return null;
}

async function getCachedOrCalculateHealth(projectId) {
  const cached = getCachedHealth(projectId);
  if (cached) return cached;
  
  const health = await calculateProjectHealth(projectId).catch(e => {
    console.warn(`[dashboard] health calc failed for project ${projectId}:`, e?.message);
    return null;
  });
  
  if (health) {
    healthCache.set(projectId, { data: health, timestamp: Date.now() });
  }
  
  return health;
}

(async () => {
  try {
    console.log('\n=== Testing Dashboard Endpoint Logic ===\n');
    
    const startDate = subDays(new Date(), 30);
    console.log('Date range:', startDate.toISOString(), 'to', new Date().toISOString());
    
    // Production Analytics
    console.log('\n[1] Production Analytics...');
    const [productionStats, productionTrend, shiftStats] = await Promise.all([
      prisma.productionEntry.aggregate({
        where: { startTime: { gte: startDate } },
        _sum: { actualQty: true, rejectedQty: true, targetQty: true },
        _count: true,
      }).catch(() => ({
        _sum: { actualQty: 0, rejectedQty: 0, targetQty: 0 },
        _count: 0,
      })),
      prisma.productionEntry.groupBy({
        by: ['startTime'],
        where: { startTime: { gte: startDate } },
        _sum: { actualQty: true, rejectedQty: true },
        orderBy: { startTime: 'asc' },
      }).catch(() => []),
      prisma.shiftEntry.aggregate({
        where: { shiftDate: { gte: startDate } },
        _sum: { totalProduced: true, qualityPassed: true, qualityRejected: true },
        _count: true,
      }).catch(() => ({
        _sum: { totalProduced: 0, qualityPassed: 0, qualityRejected: 0 },
        _count: 0,
      })),
    ]);

    const hasProductionData = (productionStats._sum?.actualQty || 0) > 0;
    console.log(`  ProductionEntry: ${productionStats._count} records, ${productionStats._sum.actualQty} output`);
    console.log(`  ShiftEntry: ${shiftStats._count} records, ${shiftStats._sum.totalProduced} output`);
    console.log(`  Using source: ${hasProductionData ? 'ProductionEntry' : 'ShiftEntry'}`);
    
    // Project health overview
    console.log('\n[2] Health Aggregation...');
    let onTrackCount = 0;
    let needAttentionCount = 0;
    let projectsByHealth = [];
    
    const projectList = await prisma.project.findMany({ select: { id: true } });
    console.log(`  Found ${projectList.length} projects`);
    
    console.log(`  Computing health for all projects...`);
    const healthResults = await Promise.all(
      projectList.map(p => getCachedOrCalculateHealth(p.id))
    );
    console.log(`  Health results: ${healthResults.length} total`);
    
    const healthStatusCounts = healthResults.reduce((acc, h) => {
      if (!h) {
        console.warn('    ⚠️  Null health result');
        return acc;
      }
      const s = h.status || 'healthy';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`  Health status counts:`, JSON.stringify(healthStatusCounts));
    projectsByHealth = Object.keys(healthStatusCounts).map(k => ({ status: k, count: healthStatusCounts[k] }));
    onTrackCount = healthStatusCounts.healthy || 0;
    needAttentionCount = (healthStatusCounts['at-risk'] || 0) + (healthStatusCounts.critical || 0);
    
    console.log(`  ✓ onTrackCount: ${onTrackCount}`);
    console.log(`  ✓ needAttentionCount: ${needAttentionCount}`);
    
    // Quality Analytics
    console.log('\n[3] Quality Analytics...');
    let qcStats = { _count: 0, _sum: { sampleSize: 0, passedQty: 0, failedQty: 0 } };
    try {
      qcStats = await prisma.qCSubmission.aggregate({
        where: { submittedAt: { gte: startDate } },
        _sum: { sampleSize: true, passedQty: true, failedQty: true },
        _count: true,
      });
      console.log(`  QC Submissions: ${qcStats._count}`);
    } catch (e) {
      console.log(`  QC error (fallback): ${e.message}`);
    }
    
    // Workforce Analytics
    console.log('\n[4] Workforce Analytics...');
    const shiftStatsGrouped = await prisma.shiftEntry.groupBy({
      by: ['shiftType'],
      where: { shiftDate: { gte: startDate } },
      _sum: { workersPresent: true, totalProduced: true },
      _avg: { efficiency: true },
    }).catch(() => []);
    console.log(`  Shift stats groups: ${shiftStatsGrouped.length}`);
    
    // Projects
    console.log('\n[5] Projects...');
    const projectStats = await prisma.project.aggregate({
      _count: true,
    });
    console.log(`  Total projects: ${projectStats._count}`);
    
    // Simulate response
    console.log('\n=== Simulated Response ===\n');
    console.log(JSON.stringify({
      onTrackCount,
      needAttentionCount,
      production: {
        totalOutput: productionStats._sum.actualQty || 0,
      },
      projects: {
        total: projectStats._count,
        byHealth: projectsByHealth,
      },
    }, null, 2));
    
    console.log('\n✅ All steps completed successfully\n');
    process.exit(0);
  } catch(e) {
    console.error('\n❌ Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
