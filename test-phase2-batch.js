// Quick test script for Phase 2 batch endpoints
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking available data...\n');
    
    // Check stations
    const stations = await prisma.station.findMany({ take: 3 });
    console.log('✅ Stations:', stations.length, 'found');
    if (stations.length > 0) {
      console.log('   First station:', stations[0].id, '-', stations[0].name);
    }
    
    // Check projects
    const projects = await prisma.project.findMany({ take: 3 });
    console.log('✅ Projects:', projects.length, 'found');
    if (projects.length > 0) {
      console.log('   First project:', projects[0].id, '-', projects[0].name);
    }
    
    // Check project SKUs
    const skus = await prisma.projectSku.findMany({ take: 3 });
    console.log('✅ Project SKUs:', skus.length, 'found');
    if (skus.length > 0) {
      console.log('   First SKU:', skus[0].id, '-', skus[0].code);
    }
    
    // Check batches
    const batches = await prisma.batch.findMany({ take: 3 });
    console.log('✅ Batches:', batches.length, 'found');
    if (batches.length > 0) {
      console.log('   First batch:', batches[0].id, '-', batches[0].batchCode);
    }
    
    console.log('\n✅ Database check complete!');
    
    if (stations.length > 0 && projects.length > 0 && skus.length > 0) {
      console.log('\n📝 You can test batch creation with:');
      console.log(`   Station ID: ${stations[0].id}`);
      console.log(`   Project ID: ${projects[0].id}`);
      console.log(`   SKU ID: ${skus[0].id}`);
    } else {
      console.log('\n⚠️  Warning: Missing required data for testing!');
      if (stations.length === 0) console.log('   - No stations found');
      if (projects.length === 0) console.log('   - No projects found');
      if (skus.length === 0) console.log('   - No project SKUs found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
