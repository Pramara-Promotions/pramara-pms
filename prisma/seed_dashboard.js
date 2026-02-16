const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { subDays } = require('date-fns');
const { randomUUID } = require('crypto');

async function main() {
    console.log('🌱 Seeding dashboard data...');

    // 0. Clean up
    await prisma.project.deleteMany({ where: { code: 'DASH-004' } });

    // 1. Create a Project
    const project = await prisma.project.create({
        data: {
            code: 'DASH-004',
            name: 'Dashboard Test Project 4',
            sku: 'TEST-SKU-004',
            quantity: 10000,
            cutoffDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
    });

    // 2. Create Production Entries (last 30 days)
    // Day 1: 100 produced, 5 rejected
    await prisma.productionEntry.create({
        data: {
            id: randomUUID(),
            projectId: project.id,
            startTime: subDays(new Date(), 2),
            endTime: subDays(new Date(), 2),
            actualQty: 100,
            rejectedQty: 5,
            targetQty: 120,
            status: 'COMPLETED',
            operatorId: null, // Optional
            materialUsed: []
        }
    });

    // Day 2: 150 produced, 0 rejected
    await prisma.productionEntry.create({
        data: {
            id: randomUUID(),
            projectId: project.id,
            startTime: subDays(new Date(), 1),
            endTime: subDays(new Date(), 1),
            actualQty: 150,
            rejectedQty: 0,
            targetQty: 150,
            status: 'COMPLETED',
            materialUsed: []
        }
    });

    // 3. Create Shift Entries (fallback data for older dates)
    await prisma.shiftEntry.create({
        data: {
            id: randomUUID(),
            projectId: project.id,
            shiftDate: subDays(new Date(), 5),
            shiftType: 'MORNING',
            totalProduced: 200,
            qualityPassed: 195,
            qualityRejected: 5,
            workersPresent: 10,
            efficiency: 0.95
        }
    });

    console.log('✅ Dashboard data seeded for project:', project.name);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
