const { PrismaClient } = require('@prisma/client');
const { calculateProjectHealth } = require('./api/lib/projectHealth');
const { subDays } = require('date-fns');
const prisma = new PrismaClient();

// Health cache logic (same as in dashboard.js)
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

async function simulateDashboardEndpoint(days = 30) {
  try {
    const daysNum = parseInt(days);
    const startDate = subDays(new Date(), daysNum);

    console.log('\n=== Simulating Dashboard /overview Endpoint ===\n');
    console.log(`Period: Last ${daysNum} days (from ${startDate.toISOString().split('T')[0]})`);

    // Production Analytics: primary=ProductionEntry, fallback=ShiftEntry
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

    // Prefer ProductionEntry if available; fallback to ShiftEntry
    const hasProductionData = (productionStats._sum?.actualQty || 0) > 0;
    const totalProduced = hasProductionData 
      ? (productionStats._sum?.actualQty || 0)
      : (shiftStats._sum?.totalProduced || 0);
    const totalApproved = hasProductionData
      ? Math.max(0, (productionStats._sum?.actualQty || 0) - (productionStats._sum?.rejectedQty || 0))
      : (shiftStats._sum?.qualityPassed || 0);
    const totalRejected = hasProductionData
      ? (productionStats._sum?.rejectedQty || 0)
      : (shiftStats._sum?.qualityRejected || 0);
    const entryCount = hasProductionData ? productionStats._count : shiftStats._count;

    console.log('\n✓ Production Analytics:');
    console.log(`  Using data source: ${hasProductionData ? 'ProductionEntry (PRIMARY)' : 'ShiftEntry (FALLBACK)'}`);
    console.log(`  Total Output: ${totalProduced}`);
    console.log(`  Approved: ${totalApproved}`);
    console.log(`  Rejected: ${totalRejected}`);
    console.log(`  Entries: ${entryCount}`);
    console.log(`  Trend records: ${productionTrend.length}`);

    // Project health overview
    let onTrackCount = 0;
    let needAttentionCount = 0;
    let projectsByHealth = [];
    try {
      const projectList = await prisma.project.findMany({ select: { id: true } });
      console.log(`\n✓ Computing health for ${projectList.length} projects...`);
      
      const healthResults = await Promise.all(
        projectList.map(p => getCachedOrCalculateHealth(p.id))
      );
      
      const healthStatusCounts = healthResults.reduce((acc, h) => {
        if (!h) return acc;
        const s = h.status || 'healthy';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});
      
      projectsByHealth = Object.keys(healthStatusCounts).map(k => ({ status: k, count: healthStatusCounts[k] }));
      onTrackCount = healthStatusCounts.healthy || 0;
      needAttentionCount = (healthStatusCounts['at-risk'] || 0) + (healthStatusCounts.critical || 0);
      
      console.log('✓ Project Health Status Counts:');
      Object.entries(healthStatusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
    } catch (e) {
      console.warn('[dashboard] project health aggregation failed:', e?.message);
    }

    // Simulated response (partial)
    const response = {
      period: {
        days: daysNum,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      production: {
        totalOutput: totalProduced,
        approved: totalApproved,
        rejected: totalRejected,
        entries: entryCount,
        trend: (productionTrend && productionTrend.length > 0)
          ? productionTrend.slice(0, 5).map(t => ({
            date: t.startTime,
            output: t._sum?.actualQty || 0,
            approved: Math.max(0, (t._sum?.actualQty || 0) - (t._sum?.rejectedQty || 0)),
          }))
          : [],
      },
      projects: {
        byHealth: projectsByHealth,
      },
      onTrackCount,
      needAttentionCount,
    };

    console.log('\n=== Dashboard Response (Key Fields) ===\n');
    console.log('onTrackCount:', response.onTrackCount);
    console.log('needAttentionCount:', response.needAttentionCount);
    console.log('production.totalOutput:', response.production.totalOutput);
    console.log('projects.byHealth:', JSON.stringify(response.projects.byHealth, null, 2));

    console.log('\n=== Summary ===');
    console.log(`✓ Dashboard will show: ${onTrackCount} projects On Track, ${needAttentionCount} need Attention`);
    console.log(`✓ Production card will show: ${totalProduced} total output (using ${hasProductionData ? 'ProductionEntry' : 'ShiftEntry'})`);
    console.log(`✓ Health cache is ready (TTL: 5 minutes)`);

    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

simulateDashboardEndpoint(30);
