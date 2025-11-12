const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDatabase() {
    console.log('🧹 Cleaning database...\n');

    try {
        // Delete in correct order (respecting foreign keys)
        await prisma.wIPLedger.deleteMany({});
        console.log('✅ Deleted WIP Ledger entries');

        await prisma.shiftEntry.deleteMany({});
        console.log('✅ Deleted Shift entries');

        await prisma.qCSubmission.deleteMany({});
        console.log('✅ Deleted QC submissions');

        await prisma.productionEntry.deleteMany({});
        console.log('✅ Deleted Production entries');

        await prisma.materialConsumption.deleteMany({});
        console.log('✅ Deleted Material consumption');

        await prisma.station.deleteMany({});
        console.log('✅ Deleted Stations');

        await prisma.project.deleteMany({});
        console.log('✅ Deleted Projects');

        console.log('\n✨ Database cleaned successfully!');
    } catch (error) {
        console.error('❌ Error cleaning database:', error.message);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

cleanDatabase();
