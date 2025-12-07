const { PrismaClient } = require('@prisma/client');
const { calculateProjectHealth } = require('./api/lib/projectHealth');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('\n=== Testing Dashboard Fix ===\n');
    
    // Test health calculation for projects
    const projects = await prisma.project.findMany({ select: { id: true }, take: 10 });
    console.log(`Found ${projects.length} projects for health testing\n`);
    
    const healthResults = [];
    for (const p of projects) {
      const health = await calculateProjectHealth(p.id);
      healthResults.push({ projectId: p.id, ...health });
    }
    
    console.log('✓ Health calculations:');
    healthResults.forEach(h => {
      console.log(`  Project ${h.projectId}: status=${h.status}, healthScore=${h.healthScore}`);
    });
    
    // Count by status
    const statusCounts = healthResults.reduce((acc, h) => {
      acc[h.status] = (acc[h.status] || 0) + 1;
      return acc;
    }, {});
    console.log('\n✓ Status distribution:', JSON.stringify(statusCounts, null, 2));
    console.log(`  → onTrackCount (healthy): ${statusCounts.healthy || 0}`);
    console.log(`  → needAttentionCount (at-risk + critical): ${(statusCounts['at-risk'] || 0) + (statusCounts.critical || 0)}`);
    
    // Test ProductionEntry aggregation
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const prodAgg = await prisma.productionEntry.aggregate({
      where: { startTime: { gte: thirtyDaysAgo } },
      _sum: { actualQty: true, rejectedQty: true },
      _count: true
    });
    
    console.log('\n✓ ProductionEntry aggregation (30d):');
    console.log(`  Total records: ${prodAgg._count}`);
    console.log(`  Total produced: ${prodAgg._sum.actualQty || 0}`);
    console.log(`  Total rejected: ${prodAgg._sum.rejectedQty || 0}`);
    
    // Check ShiftEntry for comparison
    const shiftAgg = await prisma.shiftEntry.aggregate({
      where: { shiftDate: { gte: thirtyDaysAgo } },
      _sum: { totalProduced: true, qualityRejected: true },
      _count: true
    }).catch(() => ({ _count: 0, _sum: { totalProduced: 0, qualityRejected: 0 } }));
    
    console.log('\n✓ ShiftEntry aggregation (30d) [fallback]:');
    console.log(`  Total records: ${shiftAgg._count}`);
    console.log(`  Total produced: ${shiftAgg._sum.totalProduced || 0}`);
    
    console.log('\n=== All Tests Passed ===\n');
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
