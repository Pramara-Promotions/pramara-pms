// Quick script to check database data
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  console.log('📊 Checking database data...\n');
  
  const stations = await prisma.station.findMany();
  console.log(`Stations (${stations.length}):`);
  console.log(JSON.stringify(stations.slice(0, 3), null, 2));
  
  const projects = await prisma.project.findMany();
  console.log(`\nProjects (${projects.length}):`);
  console.log(JSON.stringify(projects.slice(0, 3), null, 2));
  
  const projectSkus = await prisma.projectSku.findMany();
  console.log(`\nProjectSKUs (${projectSkus.length}):`);
  console.log(JSON.stringify(projectSkus.slice(0, 3), null, 2));
  
  await prisma.$disconnect();
}

checkData();
